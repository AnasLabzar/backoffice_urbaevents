import { userResolvers } from './users';
import { projectResolvers } from './projects';
import { taskResolvers } from './tasks';
import { notificationResolvers } from './notifications';
import { logsResolvers } from './logs';

// --- HNA L-CHANGE: "export const resolvers" blast "export default" ---
export const resolvers = {
    Query: {
        ...userResolvers.Query,
        ...projectResolvers.Query,
        ...taskResolvers.Query,
        ...notificationResolvers.Query,
        ...logsResolvers.Query,
    },

    Mutation: {
        ...userResolvers.Mutation,
        ...projectResolvers.Mutation,
        ...taskResolvers.Mutation,
        ...notificationResolvers.Mutation,
    },

    Subscription: {
        ...taskResolvers.Subscription,
        ...notificationResolvers.Subscription,
    },

    // --- GLOBAL TYPE RESOLVERS (ID Fixes) ---
    User: {
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id
    },
    Project: {
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id
    },
    Task: {
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id
    },
    Document: {
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id
    },
    Notification: {
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id
    },
    Role: {
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id
    }
};