"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logsResolvers = void 0;
const apollo_server_errors_1 = require("apollo-server-errors");
const mongoose_1 = require("mongoose");
const ActivityLog_1 = __importDefault(require("../../models/ActivityLog"));
const User_1 = __importDefault(require("../../models/User"));
const helpers_1 = require("./helpers");
exports.logsResolvers = {
    Query: {
        logs: async (_, { projectId }, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const user = await User_1.default.findById(context.user.id).populate('role');
            const userRole = user?.role;
            const filter = {};
            if (projectId) {
                filter.project = new mongoose_1.Types.ObjectId(projectId);
            }
            else {
                filter.project = { $exists: true, $ne: null };
            }
            if (!userRole.permissions.includes('view_all_logs')) {
                if (userRole.permissions.includes('view_team_logs')) {
                    filter.user = { $in: [context.user.id] };
                }
                else {
                    filter.user = context.user.id;
                }
            }
            const logs = await ActivityLog_1.default.find(filter)
                .populate({ path: 'user', select: helpers_1.userSelect })
                .populate({ path: 'project' })
                .sort({ createdAt: -1 })
                .limit(100);
            return logs.map((log) => {
                if (!log.user) {
                    log.user = helpers_1.defaultUser;
                }
                return log;
            });
        },
    }
};
