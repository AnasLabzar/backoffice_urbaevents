import { ApolloError } from 'apollo-server-errors';
import { Types } from 'mongoose';
import ActivityLog from '../../models/ActivityLog';
import User from '../../models/User';
import { IContext } from '../../server';
import { defaultUser, userSelect } from './helpers';

export const logsResolvers = {
    Query: {
        logs: async (_: unknown, { projectId }: { projectId?: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const user = await User.findById(context.user.id).populate('role');
            const userRole = user?.role as any;

            const filter: any = {};
            if (projectId) {
                filter.project = new Types.ObjectId(projectId);
            } else {
                filter.project = { $exists: true, $ne: null };
            }

            if (!userRole.permissions.includes('view_all_logs' as any)) {
                if (userRole.permissions.includes('view_team_logs' as any)) {
                    filter.user = { $in: [context.user.id] };
                } else {
                    filter.user = context.user.id;
                }
            }

            const logs = await ActivityLog.find(filter)
                .populate({ path: 'user', select: userSelect })
                .populate({ path: 'project' })
                .sort({ createdAt: -1 })
                .limit(100);

            return logs.map((log: any) => {
                if (!log.user) {
                    log.user = defaultUser;
                }
                return log;
            });
        },
    }
};