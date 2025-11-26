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
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationResolvers = void 0;
const apollo_server_errors_1 = require("apollo-server-errors");
const mongoose_1 = require("mongoose");
const Notification_1 = __importStar(require("../../models/Notification"));
const graphql_subscriptions_1 = require("graphql-subscriptions");
const pubsub_1 = require("../../utils/pubsub");
exports.notificationResolvers = {
    Query: {
        myNotifications: async (_, __, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const userId = new mongoose_1.Types.ObjectId(context.user.id);
            const notifs = await Notification_1.default.find({
                $or: [
                    { users: userId },
                    { level: Notification_1.NotificationLevel.INFO }
                ]
            }).sort({ createdAt: -1 }).limit(50);
            return notifs.map(notif => ({
                ...notif.toObject(),
                id: notif._id,
                isRead: notif.readBy.includes(userId)
            }));
        },
    },
    Mutation: {
        markNotificationAsRead: async (_, { notificationId }, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const notif = await Notification_1.default.findById(notificationId);
            if (!notif)
                throw new apollo_server_errors_1.ApolloError('Notification not found');
            await Notification_1.default.updateOne({ _id: notificationId }, { $addToSet: { readBy: context.user.id } });
            return {
                ...notif.toObject(),
                id: notif._id,
                isRead: true
            };
        },
        markAllNotificationsAsRead: async (_, __, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            await Notification_1.default.updateMany({ $or: [{ users: context.user.id }, { level: Notification_1.NotificationLevel.INFO }] }, { $addToSet: { readBy: context.user.id } });
            return true;
        },
    },
    Subscription: {
        newNotification: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub_1.pubsub.asyncIterator(pubsub_1.NEW_NOTIFICATION_EVENT), (payload, variables) => {
                return payload.newNotification.userId === variables.userId ||
                    payload.newNotification.userId === 'GLOBAL';
            }),
        }
    }
};
