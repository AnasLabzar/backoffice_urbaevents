import { userResolvers } from './users';
import { projectResolvers } from './projects';
import { taskResolvers } from './tasks';
import { notificationResolvers } from './notifications';
import { logsResolvers } from './logs';
import { aiResolver } from './aiResolver';
// ✅ 1. Import du nouveau resolver
import { supplierResolvers } from './suppliers';

export const resolvers = {
    Query: {
        ...userResolvers.Query,
        ...projectResolvers.Query,
        ...taskResolvers.Query,
        ...notificationResolvers.Query,
        ...logsResolvers.Query,
        ...supplierResolvers.Query // ✅ 2. Ajout Query
    },

    Mutation: {
        ...userResolvers.Mutation,
        ...projectResolvers.Mutation,
        ...taskResolvers.Mutation,
        ...notificationResolvers.Mutation,
        ...aiResolver.Mutation,
        ...supplierResolvers.Mutation, // ✅ 3. Ajout Mutation
    },

    Subscription: {
        ...taskResolvers.Subscription,
        ...notificationResolvers.Subscription,
    },

    // Types Resolvers
    User: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Project: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Task: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Document: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Notification: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Role: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    // ✅ 4. Ajout Type Resolver pour Supplier
    Supplier: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id }
};