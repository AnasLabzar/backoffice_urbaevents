import { userResolvers } from './users';
import { projectResolvers } from './projects';
import { taskResolvers } from './tasks';
import { notificationResolvers } from './notifications';
import { logsResolvers } from './logs';
import { aiResolver } from './aiResolver';
import { supplierResolvers } from './suppliers';
import { prestationResolvers } from './prestations';
import { briefResolvers } from './briefs';
// ✅ Import consolidé
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
        // ✅ Tout est ici (Invoices + Items)
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
        // ✅ Tout est ici (Add/Delete Item included)
        ...invoiceResolvers.Mutation
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
    Supplier: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    Prestation: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },
    ProjectBrief: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id },

    // ✅ Type Resolver pour Invoice (et Items field link)
    Invoice: {
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id,
        // Le field resolver 'items' est géré dans invoiceResolvers.ts
        ...invoiceResolvers.Invoice
    },
    // ✅ Type Resolver pour InvoiceItem
    InvoiceItem: { id: (parent: any) => parent._id ? parent._id.toString() : parent.id }
};