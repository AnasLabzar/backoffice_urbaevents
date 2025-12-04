import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import express from 'express';
import http from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import mongoose from 'mongoose';
import 'dotenv/config';
import multer from 'multer';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';

// Internal imports
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers/index';
import { verifyToken } from './utils/jwt';
import Task from './models/Task';
import Project from './models/Project';
import { createNotification } from './utils/notifications';
import { NotificationLevel } from './models/Notification';

// ✅ HADI HIYA LI KANT NAQSA (L-CONTEXT DEFINITION)
export interface IContext {
    user?: {
        id: string;
        email: string;
        role: any;
    } | null;
}

// 1. Database Connection
const connectDB = async () => {
    try {
        const isProduction = process.env.NODE_ENV === 'production';
        const dbURI = isProduction ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;

        if (!dbURI) {
            console.warn('⚠️  MONGO_URI is missing. Using local fallback.');
        }

        const uri = dbURI || 'mongodb://localhost:27017/urbagroupe';
        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Error connecting to MongoDB');
    }
};

// 2. Cron Jobs
const startCronJobs = () => {
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Running CRON Job: Checking Deadlines...');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
            const tasks = await Task.find({
                dueDate: { $gte: today, $lte: tomorrow },
                status: { $ne: 'DONE' }
            }).populate('project');

            for (const task of tasks) {
                // @ts-ignore
                const project = task.project;
                const userIds = [];

                // @ts-ignore
                if (task.assignedTo) userIds.push(task.assignedTo.toString());

                // @ts-ignore
                if (project?.projectManagers) {
                    // @ts-ignore
                    const pms = project.projectManagers.map(pm => pm.toString());
                    userIds.push(...pms);
                }

                if (userIds.length > 0) {
                    // @ts-ignore
                    const uniqueIds = [...new Set(userIds)];
                    // @ts-ignore
                    const projectId = project?._id?.toString();

                    if (projectId) {
                        await createNotification({
                            userIds: uniqueIds,
                            level: NotificationLevel.DEADLINE,
                            message: `Deadline Proche: Tâche "${task.description}" pour demain.`,
                            link: `/dashboard/projects/${projectId}`,
                            project: projectId
                        });
                    }
                }
            }

            const projects = await Project.find({
                submissionDeadline: { $gte: today, $lte: tomorrow },
                preparationStatus: { $ne: 'DONE' }
            });

            for (const project of projects) {
                if (project.projectManagers && project.projectManagers.length > 0) {
                    await createNotification({
                        // @ts-ignore
                        userIds: project.projectManagers.map(pm => pm.toString()),
                        level: NotificationLevel.DEADLINE,
                        message: `Deadline Dépôt: Projet "${project.object}" pour demain.`,
                        link: `/dashboard/projects/${project._id}`,
                        project: project._id.toString()
                    });
                }
            }
        } catch (error) {
            console.error('Error in CRON Job:', error);
        }
    }, {
        timezone: "Africa/Casablanca"
    });
};

const startServer = async () => {
    await connectDB();
    startCronJobs();

    const app = express();
    const httpServer = http.createServer(app);

    app.use(cors({
    origin: [
        "http://localhost:3000", 
        "http://localhost:5002", 
        "https://backoffice.urbagroupe.ma" // ✅ ZID HADI
    ],
    credentials: true
}));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    const uploadsPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath, { recursive: true });
        console.log('📂 Created uploads directory:', uploadsPath);
    }
    app.use('/uploads', express.static(uploadsPath));

    const storage = multer.diskStorage({
        destination: (req: any, file: any, cb: any) => {
            const projectId = req.params.projectId;
            const targetDir = projectId ? path.join(uploadsPath, projectId) : uploadsPath;
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            cb(null, targetDir);
        },
        filename: (req: any, file: any, cb: any) => {
            const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const suffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, suffix + '-' + cleanName);
        }
    });

    const upload = multer({
        storage: storage,
        limits: { fileSize: 1024 * 1024 * 1024 }
    });

    // Khass had l-block ikon mktoub haka b dbt:
    const handleUpload = (req: any, res: any) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

            const projectId = req.params.projectId;
            // Correction path relative
            const relativePath = projectId
                ? `/uploads/${projectId}/${req.file.filename}`
                : `/uploads/${req.file.filename}`;

            return res.status(200).json({
                message: 'Upload successful',
                fileUrl: relativePath,
                originalName: req.file.originalname // Check req.file.originalname machi req.originalname
            });
        } catch (error) {
            console.error("Upload Error:", error);
            return res.status(500).json({ error: 'Server upload failed' });
        }
    };

    // ✅ Route 1: Standard
    // @ts-ignore
    app.post('/api/upload/:projectId', upload.single('file'), handleUpload);

    // ✅ Route 2: Fallback (Hadi li kat3yt liha f screenshot)
    // @ts-ignore
    app.post('/graphql/api/upload/:projectId', upload.single('file'), handleUpload);

    const schema = makeExecutableSchema({ typeDefs, resolvers });

    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });

    const serverCleanup = useServer({ schema }, wsServer);

    const server = new ApolloServer({
        schema,
        context: ({ req }) => {
            const { user } = verifyToken(req);
            return { user };
        },
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            await serverCleanup.dispose();
                        },
                    };
                },
            },
        ],
    });

    await server.start();

    server.applyMiddleware({
        app: app as any,
        path: '/graphql',
        cors: false
    });

    const PORT = process.env.PORT || 5002;
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
        console.log(`📂 Upload ready at http://localhost:${PORT}/api/upload`);
    });
};

startServer();