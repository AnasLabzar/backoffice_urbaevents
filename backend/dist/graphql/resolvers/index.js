"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const users_1 = require("./users");
const projects_1 = require("./projects");
const tasks_1 = require("./tasks");
const notifications_1 = require("./notifications");
const logs_1 = require("./logs");
// --- HNA L-CHANGE: "export const resolvers" blast "export default" ---
exports.resolvers = {
    Query: {
        ...users_1.userResolvers.Query,
        ...projects_1.projectResolvers.Query,
        ...tasks_1.taskResolvers.Query,
        ...notifications_1.notificationResolvers.Query,
        ...logs_1.logsResolvers.Query,
    },
    Mutation: {
        ...users_1.userResolvers.Mutation,
        ...projects_1.projectResolvers.Mutation,
        ...tasks_1.taskResolvers.Mutation,
        ...notifications_1.notificationResolvers.Mutation,
    },
    Subscription: {
        ...tasks_1.taskResolvers.Subscription,
        ...notifications_1.notificationResolvers.Subscription,
    },
    // --- GLOBAL TYPE RESOLVERS (ID Fixes) ---
    User: {
        id: (parent) => parent._id ? parent._id.toString() : parent.id
    },
    Project: {
        id: (parent) => parent._id ? parent._id.toString() : parent.id
    },
    Task: {
        id: (parent) => parent._id ? parent._id.toString() : parent.id
    },
    Document: {
        id: (parent) => parent._id ? parent._id.toString() : parent.id
    },
    Notification: {
        id: (parent) => parent._id ? parent._id.toString() : parent.id
    },
    Role: {
        id: (parent) => parent._id ? parent._id.toString() : parent.id
    }
};
