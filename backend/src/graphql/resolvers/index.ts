import { userResolvers } from './users';
import { projectResolvers } from './projects'; // Assure-toi que projectResolvers exporte bien 'Project'
import { taskResolvers } from './tasks';
import { notificationResolvers } from './notifications';
import { logsResolvers } from './logs';
import { aiResolver } from './aiResolver';
import { supplierResolvers } from './suppliers';
import { prestationResolvers } from './prestations';
import { briefResolvers } from './briefs';
import { invoiceResolvers } from './invoices';

import { GraphQLUpload } from 'graphql-upload';

export const resolvers = {
    Upload: GraphQLUpload,

    Query: {
        ...userResolvers.Query,
        ...projectResolvers.Query,
        ...taskResolvers.Query,
        ...notificationResolvers.Query,
        ...logsResolvers.Query,
        ...supplierResolvers.Query,
        ...prestationResolvers.Query,
        ...briefResolvers.Query,
        ...invoiceResolvers.Query
    },

    Mutation: {
        ...userResolvers.Mutation,
        ...projectResolvers.Mutation,
        ...taskResolvers.Mutation,
        ...notificationResolvers.Mutation,
        ...aiResolver.Mutation,
        ...supplierResolvers.Mutation,
        ...prestationResolvers.Mutation,
        ...briefResolvers.Mutation,
        ...invoiceResolvers.Mutation
    },

    Subscription: {
        ...taskResolvers.Subscription,
        ...notificationResolvers.Subscription,
    },

    // --- TYPES RESOLVERS ---

    User: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },

    // 👇👇👇 C'EST ICI QUE CA CHANGE 👇👇👇
    // Au lieu de juste mettre l'ID, on utilise tout ce qu'on a défini dans projectResolvers.ts
    // On ajoute manuellement l'ID au cas où il manquerait, mais on spread (...) le reste
    Project: {
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id,
        ...projectResolvers.Project // ✅ On récupère 'brief', 'invoices', 'prestations'...
    },

    Task: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Document: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Notification: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Role: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Supplier: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Prestation: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    ProjectBrief: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },

    Invoice: {
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id,
        ...invoiceResolvers.Invoice
    },
    InvoiceItem: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id }
};