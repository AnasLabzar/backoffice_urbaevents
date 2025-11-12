// --- L-IMPORTS L-JDAD (Ghadi n7tajo HTTP w WS) ---
import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import express from 'express';
import http from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
// Hada howa l-import l-s7i7 dyal graphql-ws (l-version 5)
import { useServer } from 'graphql-ws/lib/use/ws';
// 7IYYEDNA: graphql-upload
// ----------------------------------------------

import mongoose from 'mongoose';
import 'dotenv/config';

// --- ZID HADO L-JDAD (dyal REST Upload) ---
import multer from 'multer';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
// ------------------------------------

// L-Imports dyalna (Nafs l-code)
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { verifyToken, DecodedToken } from './utils/jwt';

// --- ZID HADO L-JDAD ---
import * as cron from 'node-cron';
import Task from './models/Task';
import Project from './models/Project';
import { createNotification } from './utils/notifications';
import { NotificationLevel } from './models/Notification';
// -----------------------

// Interface l-Context dyalna (Nafs l-code)
export interface IContext {
    user: DecodedToken | null;
}

// ---- 1. L-Database Connection (Nafs l-code) ----
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI as string);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
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
                status: { $ne: 'DONE' } // Ghi li mazal ma salawch
            }).populate('project'); // Jbed l-project m3ahom

            for (const task of tasks) {
                const project = task.project as any;
                let userIds: string[] = [];

                // Sifet l-user li m-assigni lih l-task
                if (task.assignedTo) {
                    userIds.push(task.assignedTo.toString());
                }
                // Sifet l-PMs dyal l-project
                if (project && project.projectManagers) {
                    userIds.push(...project.projectManagers.map((pm: any) => pm.toString()));
                }

                if (userIds.length > 0) {
                    await createNotification({
                        userIds: [...new Set(userIds)], // 7iyd doublons
                        level: NotificationLevel.DEADLINE, // Level 5
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
                        userIds: project.projectManagers.map(pm => pm.toString()),
                        level: NotificationLevel.DEADLINE, // Level 5
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
        timezone: "Africa/Casablanca" // MZYAN T-DIR TIMEZONE
    });
};
// -----------------------


// ---- 2. BDA L-CODE JDID DYAL SERVER ----
const startServer = async () => {
    await connectDB();
    // --- ZID HADI HNA ---
    startCronJobs(); // Demarri l-CRON Jobs
    // -------------------
    const app = express();
    const httpServer = http.createServer(app);

    // --- 2. ZID CORS ---
    // --- HNA L-MODIFICATION ---
    // Bddel "app.use(cors());" b had l-bloc jdid:
    app.use(cors({
        origin: [
            'http://localhost:3000', // L-khdma 3la l-PC dyalek
            'https://backoffice.urbagroupe.ma' // L-Production
        ],
        credentials: true
    }));
    // --- FIN DYAL L-MODIFICATION ---

    // --- 3. ZID L-ENDPOINT L-STATIC (Bach n-affichiw l-fichiers) ---
    app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

    // --- 4. ZID L-LOGIC DYAL MULTER (L-UPLOAD) ---
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
            cb(null, file.originalname); // Nkhliw smiya 3adia
        }
    });

    // --- L-BDIL L-JDID HNA ---
    const upload = multer({
        storage: storage,
        limits: { fileSize: 1024 * 1024 * 1024 } // 1024 MB (1GB)
    });

    // --- 5. ZID L-ENDPOINT DYAL L-UPLOAD (REST API) ---
    app.post('/api/upload/:projectId', upload.single('file'), (req, res) => {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        res.status(200).json({
            fileUrl: `uploads/${req.params.projectId}/${req.file.filename}`
        });
    });
    // ---------------------------------------------

    // 6. Nqado l-Schema dyal GraphQL
    const schema = makeExecutableSchema({ typeDefs, resolvers });

    // 7. Nqado l-WebSocket Server
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });

    // 8. Nqado l-WebSocket "Cleanup"
    const serverCleanup = useServer(
        {
            schema,
            context: (ctx) => { return {}; },
        },
        wsServer
    );

    // 9. Nqado l-Apollo Server (Bla graphql-upload)
    const server = new ApolloServer({
        schema,
        context: ({ req }): IContext => {
            const { user } = verifyToken(req);
            return { user };
        },

        // --- ZID HADA ---
        formatError: (err) => {
            console.error('--- GraphQL Error (Backend) ---');

            // HADI A7SSAN MN console.log, kat-affichi l-object kaml b tafassil
            console.dir(err, { depth: null });

            return err; // Rejje3 l-error l-client 3adi
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

    // 10. Demarriw l-Apollo Server
    await server.start();
    server.applyMiddleware({ app, path: '/graphql' });

    // 11. Demarriw l-HTTP Server
    const PORT = process.env.PORT || 5001;
    httpServer.listen(PORT, () => {
        console.log(
            `🚀 Server khdam 3la http://localhost:${PORT}/graphql`
        );
        console.log(
            `🌐 Subscriptions khdamin 3la ws://localhost:${PORT}/graphql`
        );
        console.log(
            `📄 Uploads (REST) khdamin 3la http://localhost:${PORT}/api/upload/:projectId`
        );
    });
};

startServer();