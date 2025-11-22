// --- L-IMPORTS L-JDAD (Ghadi n7tajo HTTP w WS) ---
import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import express from 'express';
import http from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import mongoose from 'mongoose';
import 'dotenv/config';

// --- IMPORTS REST UPLOAD ---
import multer from 'multer';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';

// L-Imports dyalna
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { verifyToken, DecodedToken } from './utils/jwt';

// --- IMPORTS CRON & MODELS ---
import * as cron from 'node-cron';
import Task from './models/Task';
import Project from './models/Project';
import { createNotification } from './utils/notifications';
import { NotificationLevel } from './models/Notification';

export interface IContext {
    user: DecodedToken | null;
}

// ---- 1. L-Database Connection ----
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI as string);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`❌ Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// --- ZID L-CRON JOB HNA ---
const startCronJobs = () => {
    // T-khdem kolla nhar m3a 9h dyal sba7
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Running CRON Job: Checking Deadlines...');

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
            // 1. Jbed l-Tasks li 9rib y-saliw (ghdda)
            const tasks = await Task.find({
                dueDate: {
                    $gte: today,
                    $lte: tomorrow
                },
                status: { $ne: 'DONE' }
            }).populate('project');

            for (const task of tasks) {
                const project = task.project as any;
                let userIds: string[] = [];

                if (task.assignedTo) {
                    userIds.push(task.assignedTo.toString());
                }
                if (project && project.projectManagers) {
                    userIds.push(...project.projectManagers.map((pm: any) => pm.toString()));
                }

                if (userIds.length > 0) {
                    await createNotification({
                        userIds: [...new Set(userIds)],
                        level: NotificationLevel.DEADLINE,
                        message: `Deadline Proche (+1j): La tâche "${task.description}" doit être terminée demain.`,
                        link: `/dashboard/projects/${project._id}`,
                        project: project._id.toString()
                    });
                }
            }

            // 2. Jbed l-Projects li 3ndhom Date de Dépôt qriba
            const projects = await Project.find({
                submissionDeadline: {
                    $gte: today,
                    $lte: tomorrow
                },
                preparationStatus: { $ne: 'DONE' }
            });

            for (const project of projects) {
                if (project.projectManagers && project.projectManagers.length > 0) {
                    await createNotification({
                        userIds: project.projectManagers.map((pm: any) => pm.toString()),
                        level: NotificationLevel.DEADLINE,
                        message: `Deadline Dépôt (+1j): Le projet "${project.object}" doit être déposé demain.`,
                        link: `/dashboard/projects/${project._id}`,
                        project: project._id.toString()
                    });
                }
            }
            console.log('⏰ CRON Job Finished.');
        } catch (error) {
            console.error('Error in CRON Job:', error);
        }
    }, {
        scheduled: true,
        timezone: "Africa/Casablanca"
    });
};

// ---- 2. START SERVER ----
const startServer = async () => {
    await connectDB();
    startCronJobs();

    const app = express();
    const httpServer = http.createServer(app);

    // --- FIX CORS IMPORTANT ---
    // Hna zedt lik Apollo Studio bach y-acceptih
    app.use(cors({
        origin: [
            'http://localhost:3000',                // Frontend Local
            'https://backoffice.urbagroupe.ma',     // Production
            'https://studio.apollographql.com'      // <--- HADI LI KANT NAQSA
        ],
        credentials: true
    }));

    // This assumes you run 'yarn dev' from the 'backend' folder
    const uploadsPath = path.join(__dirname, '../../uploads');

    console.log('------------------------------------------------');
    console.log('📂 EXPECTED Uploads Path:', uploadsPath);

    if (fs.existsSync(uploadsPath)) {
        console.log('✅ The uploads folder EXISTS.');
        // Check if the specific folder exists (replace with the ID from your error)
        const testId = '692185b9414cb54a12410f61';
        if (fs.existsSync(path.join(uploadsPath, testId))) {
            console.log(`✅ Folder ${testId} found inside uploads.`);
        } else {
            console.log(`❌ Folder ${testId} is MISSING inside uploads.`);
        }
    } else {
        console.log('❌ The uploads folder is MISSING at this path.');
    }
    console.log('------------------------------------------------');

    app.use('/uploads', express.static(uploadsPath));
    // --- MULTER CONFIG ---
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const projectId = req.params.projectId;
            const uploadDir = path.join(__dirname, `../../uploads/${projectId}`);

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const sanitizedName = file.originalname
                .replace(/\s+/g, '_')
                .replace(/[()]/g, '')
                .replace(/[^a-zA-Z0-9._-]/g, '');

            cb(null, sanitizedName);
        }
    });

    const upload = multer({
        storage: storage,
        limits: { fileSize: 1024 * 1024 * 1024 } // 1GB
    });

    // --- UPLOAD ENDPOINT ---
    app.post('/api/upload/:projectId', upload.single('file'), (req, res) => {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        res.status(200).json({
            fileUrl: `uploads/${req.params.projectId}/${req.file.filename}`
        });
    });

    // 6. Schema
    const schema = makeExecutableSchema({ typeDefs, resolvers });

    // 7. WebSocket Server
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });

    // 8. WebSocket Cleanup
    const serverCleanup = useServer(
        {
            schema,
            context: (ctx) => { return {}; },
        },
        wsServer
    );

    // 9. Apollo Server
    const server = new ApolloServer({
        schema,
        context: ({ req }): IContext => {
            const { user } = verifyToken(req);
            return { user };
        },
        formatError: (err) => {
            console.error('--- GraphQL Error (Backend) ---');
            console.dir(err, { depth: null });
            return err;
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

    // Hna zedna cors: false bach Apollo maydirch overwrite 3la cors dyal express
    server.applyMiddleware({ app, path: '/graphql', cors: false });

    const PORT = process.env.PORT || 5001;
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server khdam 3la http://localhost:${PORT}/graphql`);
        console.log(`🌐 Subscriptions khdamin 3la ws://localhost:${PORT}/graphql`);
        console.log(`📄 Uploads (REST) khdamin 3la http://localhost:${PORT}/api/upload/:projectId`);
    });
};

startServer();