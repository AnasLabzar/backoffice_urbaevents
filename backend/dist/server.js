"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// --- L-IMPORTS L-JDAD (Ghadi n7tajo HTTP w WS) ---
const apollo_server_express_1 = require("apollo-server-express");
const apollo_server_core_1 = require("apollo-server-core");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const schema_1 = require("@graphql-tools/schema");
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
// --- IMPORTS REST UPLOAD ---
const multer_1 = __importDefault(require("multer"));
const cors_1 = __importDefault(require("cors"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// L-Imports dyalna
const typeDefs_1 = require("./graphql/typeDefs");
const index_1 = require("./graphql/resolvers/index");
const jwt_1 = require("./utils/jwt");
// --- IMPORTS CRON & MODELS ---
const cron = __importStar(require("node-cron"));
const Task_1 = __importDefault(require("./models/Task"));
const Project_1 = __importDefault(require("./models/Project"));
const notifications_1 = require("./utils/notifications");
const Notification_1 = require("./models/Notification");
// ---- 1. L-Database Connection (UPDATED) ----
const connectDB = async () => {
    try {
        // Hna kan-checkiw l-mode
        const isProduction = process.env.NODE_ENV === 'production';
        // Kan-khtaro l-URI 3la 7sab l-mode
        const dbURI = isProduction
            ? process.env.MONGO_URI_PROD
            : process.env.MONGO_URI_DEV;
        if (!dbURI) {
            throw new Error(`❌ MONGO_URI is missing for environment: ${process.env.NODE_ENV}`);
        }
        const conn = await mongoose_1.default.connect(dbURI);
        console.log(`------------------------------------------------`);
        if (isProduction) {
            console.log(`🚨 ATTENTION: CONNECTED TO PRODUCTION DB (REAL DATA)`);
        }
        else {
            console.log(`👨‍💻 SAFE MODE: CONNECTED TO DEV DB (FAKE DATA)`);
        }
        console.log(`✅ MongoDB Host: ${conn.connection.host}`);
        console.log(`🗄️  Database Name: ${conn.connection.name}`); // Bach t-t2kd mn smiyat DB
        console.log(`------------------------------------------------`);
    }
    catch (error) {
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
            const tasks = await Task_1.default.find({
                dueDate: {
                    $gte: today,
                    $lte: tomorrow
                },
                status: { $ne: 'DONE' }
            }).populate('project');
            for (const task of tasks) {
                const project = task.project;
                let userIds = [];
                if (task.assignedTo) {
                    userIds.push(task.assignedTo.toString());
                }
                if (project && project.projectManagers) {
                    userIds.push(...project.projectManagers.map((pm) => pm.toString()));
                }
                if (userIds.length > 0) {
                    await (0, notifications_1.createNotification)({
                        userIds: [...new Set(userIds)],
                        level: Notification_1.NotificationLevel.DEADLINE,
                        message: `Deadline Proche (+1j): La tâche "${task.description}" doit être terminée demain.`,
                        link: `/dashboard/projects/${project._id}`,
                        project: project._id.toString()
                    });
                }
            }
            // 2. Jbed l-Projects li 3ndhom Date de Dépôt qriba
            const projects = await Project_1.default.find({
                submissionDeadline: {
                    $gte: today,
                    $lte: tomorrow
                },
                preparationStatus: { $ne: 'DONE' }
            });
            for (const project of projects) {
                if (project.projectManagers && project.projectManagers.length > 0) {
                    await (0, notifications_1.createNotification)({
                        userIds: project.projectManagers.map((pm) => pm.toString()),
                        level: Notification_1.NotificationLevel.DEADLINE,
                        message: `Deadline Dépôt (+1j): Le projet "${project.object}" doit être déposé demain.`,
                        link: `/dashboard/projects/${project._id}`,
                        project: project._id.toString()
                    });
                }
            }
            console.log('⏰ CRON Job Finished.');
        }
        catch (error) {
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
    const app = (0, express_1.default)();
    const httpServer = http_1.default.createServer(app);
    // --- FIX CORS IMPORTANT ---
    // Hna zedt lik Apollo Studio bach y-acceptih
    app.use((0, cors_1.default)({
        origin: [
            'http://localhost:3000', // Frontend Local
            'https://backoffice.urbagroupe.ma', // Production
            'https://studio.apollographql.com' // <--- HADI LI KANT NAQSA
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
        }
        else {
            console.log(`❌ Folder ${testId} is MISSING inside uploads.`);
        }
    }
    else {
        console.log('❌ The uploads folder is MISSING at this path.');
    }
    console.log('------------------------------------------------');
    app.use('/uploads', express_1.default.static(uploadsPath));
    // --- MULTER CONFIG ---
    const storage = multer_1.default.diskStorage({
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
    const upload = (0, multer_1.default)({
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
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: typeDefs_1.typeDefs, resolvers: index_1.resolvers });
    // 7. WebSocket Server
    const wsServer = new ws_1.WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });
    // 8. WebSocket Cleanup
    const serverCleanup = (0, ws_2.useServer)({
        schema,
        context: (ctx) => { return {}; },
    }, wsServer);
    // 9. Apollo Server
    const server = new apollo_server_express_1.ApolloServer({
        schema,
        context: ({ req }) => {
            const { user } = (0, jwt_1.verifyToken)(req);
            return { user };
        },
        formatError: (err) => {
            console.error('--- GraphQL Error (Backend) ---');
            console.dir(err, { depth: null });
            return err;
        },
        plugins: [
            (0, apollo_server_core_1.ApolloServerPluginDrainHttpServer)({ httpServer }),
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
    server.applyMiddleware({ app: app, path: '/graphql', cors: false });
    const PORT = process.env.PORT || 5002;
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server khdam 3la http://localhost:${PORT}/graphql`);
        console.log(`🌐 Subscriptions khdamin 3la ws://localhost:${PORT}/graphql`);
        console.log(`📄 Uploads (REST) khdamin 3la http://localhost:${PORT}/api/upload/:projectId`);
    });
};
startServer();
