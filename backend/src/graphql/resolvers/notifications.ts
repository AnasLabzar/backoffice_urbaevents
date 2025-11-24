import { ApolloError } from 'apollo-server-errors';
import { Types } from 'mongoose';
import Notification, { NotificationLevel } from '../../models/Notification';
import { IContext } from '../../server';
import { withFilter } from 'graphql-subscriptions';
import { pubsub, NEW_NOTIFICATION_EVENT } from '../../utils/pubsub';

export const notificationResolvers = {
    Query: {
        myNotifications: async (_: unknown, __: unknown, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const userId = new Types.ObjectId(context.user.id);
            const notifs = await Notification.find({
                $or: [
                    { users: userId },
                    { level: NotificationLevel.INFO }
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
        markNotificationAsRead: async (_: unknown, { notificationId }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const notif = await Notification.findById(notificationId);
            if (!notif) throw new ApolloError('Notification not found');
            await Notification.updateOne(
                { _id: notificationId },
                { $addToSet: { readBy: context.user.id } }
            );
            return {
                ...notif.toObject(),
                id: notif._id,
                isRead: true
            };
        },

        markAllNotificationsAsRead: async (_: unknown, __: unknown, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            await Notification.updateMany(
                { $or: [{ users: context.user.id }, { level: NotificationLevel.INFO }] },
                { $addToSet: { readBy: context.user.id } }
            );
            return true;
        },
    },

    Subscription: {
        newNotification: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(NEW_NOTIFICATION_EVENT),
                (payload, variables) => {
                    return payload.newNotification.userId === variables.userId ||
                        payload.newNotification.userId === 'GLOBAL';
                }
            ),
        }
    }
};