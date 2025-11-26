"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskResolvers = void 0;
const apollo_server_errors_1 = require("apollo-server-errors");
const mongoose_1 = require("mongoose");
const Task_1 = __importDefault(require("../../models/Task"));
const Project_1 = __importDefault(require("../../models/Project"));
const Role_1 = __importDefault(require("../../models/Role"));
const User_1 = __importDefault(require("../../models/User"));
const graphql_subscriptions_1 = require("graphql-subscriptions");
const pubsub_1 = require("../../utils/pubsub");
const helpers_1 = require("./helpers");
const notifications_1 = require("../../utils/notifications");
const Notification_1 = require("../../models/Notification");
const logger_1 = require("../../utils/logger");
exports.taskResolvers = {
    Query: {
        tasksByProject: async (_, { projectId }, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const tasksAgg = await Task_1.default.aggregate([
                { $match: { project: new mongoose_1.Types.ObjectId(projectId), project: { $exists: true, $ne: null } } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'assignedTo',
                        foreignField: '_id',
                        as: 'assignedTo'
                    }
                },
                { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'projects',
                        localField: 'project',
                        foreignField: '_id',
                        as: 'project'
                    }
                },
                { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
                { $match: { project: { $ne: null } } },
                {
                    $project: {
                        id: '$_id',
                        _id: 1,
                        description: 1,
                        status: 1,
                        department: 1,
                        dueDate: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        'project.id': '$project._id',
                        'project.title': 1,
                        'project.object': 1,
                        'project.projectCode': 1,
                        'assignedTo.id': '$assignedTo._id',
                        'assignedTo.name': 1,
                        'assignedTo.email': 1,
                        'assignedTo.role': 1
                    }
                },
                { $sort: { createdAt: 1 } }
            ]);
            const taskIds = tasksAgg.map(t => t._id);
            const tasksWithUploads = await Task_1.default.find({ _id: { $in: taskIds } })
                .populate({ path: 'v1Uploads', populate: { path: 'uploadedBy', select: helpers_1.userSelect } })
                .populate({ path: 'finalUpload', populate: { path: 'uploadedBy', select: helpers_1.userSelect } });
            return tasksAgg.map(task => {
                const fullTask = tasksWithUploads.find(t => t._id.toString() === task._id.toString());
                const v1Uploads = (fullTask?.v1Uploads || []).filter(doc => doc).map((doc) => {
                    if (doc && !doc.uploadedBy)
                        doc.uploadedBy = helpers_1.defaultUser;
                    return doc;
                });
                if (fullTask?.finalUpload && !fullTask.finalUpload.uploadedBy) {
                    fullTask.finalUpload.uploadedBy = helpers_1.defaultUser;
                }
                return {
                    ...task,
                    id: task._id.toString(),
                    v1Uploads: v1Uploads,
                    finalUpload: fullTask?.finalUpload || null,
                    project: {
                        ...task.project,
                        id: task.project.id || task.project._id.toString()
                    },
                    assignedTo: task.assignedTo ? {
                        ...task.assignedTo,
                        id: task.assignedTo.id || task.assignedTo._id.toString()
                    } : helpers_1.defaultUser
                };
            });
        },
        myTasks: async (_, __, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            await (0, helpers_1.checkPermission)(context, 'manage_own_tasks');
            const result = await Task_1.default.find({
                assignedTo: context.user.id,
                project: { $exists: true, $ne: null }
            })
                .populate({ path: 'project', select: 'id object title' })
                .populate({ path: 'assignedTo', select: helpers_1.userSelect })
                .populate({ path: 'v1Uploads', populate: { path: 'uploadedBy', select: helpers_1.userSelect } })
                .populate({ path: 'finalUpload', populate: { path: 'uploadedBy', select: helpers_1.userSelect } })
                .sort({ status: 1, dueDate: 1 });
            result.forEach((task) => {
                if (!task.assignedTo)
                    task.assignedTo = helpers_1.defaultUser;
                if (task.v1Uploads) {
                    task.v1Uploads = task.v1Uploads.filter((doc) => doc).map((doc) => {
                        if (doc && !doc.uploadedBy)
                            doc.uploadedBy = helpers_1.defaultUser;
                        return doc;
                    });
                }
                if (task.finalUpload && !task.finalUpload.uploadedBy) {
                    task.finalUpload.uploadedBy = helpers_1.defaultUser;
                }
            });
            return result.filter(task => task.project !== null);
        },
        allTasks: async (_, __, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const user = await User_1.default.findById(context.user.id).populate('role');
            if (!user)
                throw new apollo_server_errors_1.ApolloError('User not found', 'USER_NOT_FOUND');
            const roleName = user.role.name;
            let filter = {};
            if (['ADMIN', 'PROJECT_MANAGER', 'ASSISTANT_PM'].includes(roleName)) {
                filter = {};
            }
            else {
                filter = { assignedTo: context.user.id };
            }
            filter.project = { $exists: true, $ne: null };
            const tasks = await Task_1.default.find(filter)
                .populate({ path: 'project', select: 'title projectCode object' })
                .populate({ path: 'assignedTo', select: 'name email role' })
                .populate({ path: 'v1Uploads', populate: { path: 'uploadedBy', select: 'name email role' } })
                .populate({ path: 'finalUpload', populate: { path: 'uploadedBy', select: 'name email role' } })
                .sort({ createdAt: -1 });
            tasks.forEach((task) => {
                if (!task.assignedTo)
                    task.assignedTo = helpers_1.defaultUser;
                if (task.v1Uploads) {
                    task.v1Uploads = task.v1Uploads.filter((doc) => doc).map((doc) => {
                        if (doc && !doc.uploadedBy)
                            doc.uploadedBy = helpers_1.defaultUser;
                        return doc;
                    });
                }
                if (task.finalUpload && !task.finalUpload.uploadedBy) {
                    task.finalUpload.uploadedBy = helpers_1.defaultUser;
                }
            });
            return tasks.filter(task => task.project !== null);
        },
    },
    Mutation: {
        pm_createTask: async (_, { input }, context) => {
            await (0, helpers_1.checkPermission)(context, 'assign_creative_tasks');
            const { description, projectId, assignedToId, department, dueDate } = input;
            const task = await Task_1.default.create({
                description,
                project: projectId,
                assignedTo: assignedToId,
                department,
                status: 'TODO',
                dueDate: dueDate ? new Date(dueDate) : null,
            });
            if (!task || !task._id)
                throw new apollo_server_errors_1.ApolloError('Failed to create task or task has no ID', 'TASK_CREATION_FAILED');
            const populatedTask = await Task_1.default.findById(task._id)
                .populate({ path: 'assignedTo', select: helpers_1.userSelect })
                .populate({ path: 'project', select: 'title projectCode' })
                .lean();
            if (!populatedTask)
                throw new apollo_server_errors_1.ApolloError('Task not found after creation', 'TASK_NOT_FOUND');
            populatedTask.id = populatedTask._id.toString();
            await (0, logger_1.logActivity)({
                userId: context.user.id,
                action: 'PM_CREATE_TASK',
                project: task.project,
                details: `Task created: "${task.description}"`,
            });
            pubsub_1.pubsub.publish(pubsub_1.NEW_TASK_EVENT, { taskCreated: populatedTask });
            if (task) {
                await (0, notifications_1.createNotification)({
                    userIds: [assignedToId],
                    level: Notification_1.NotificationLevel.STANDARD,
                    message: `Nouvelle tâche assignée: "${description}"`,
                    link: `/dashboard/projects/${projectId}`,
                    project: projectId
                });
            }
            return populatedTask;
        },
        pm_updateTaskStatus: async (_, { taskId, status }, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const userRole = await Role_1.default.findById(context.user.role);
            if (!userRole ||
                (!userRole.permissions.includes('update_workflow_stage') &&
                    !userRole.permissions.includes('manage_own_tasks'))) {
                throw new apollo_server_errors_1.ApolloError('Forbidden: Not authorized to update task status.', 'FORBIDDEN');
            }
            const oldTask = await Task_1.default.findById(taskId);
            if (!oldTask)
                throw new apollo_server_errors_1.ApolloError('Task not found', 'NOT_FOUND');
            const task = await Task_1.default.findByIdAndUpdate(taskId, { status }, { new: true });
            if (!task)
                throw new apollo_server_errors_1.ApolloError('Task not found', 'NOT_FOUND');
            await (0, logger_1.logActivity)({
                userId: context.user.id,
                action: 'PM_UPDATE_TASK_STATUS',
                project: task.project,
                details: `Task "${task.description}" status changed to ${task.status}`,
            });
            if (task && (status === 'DONE' || status === 'BLOCKED')) {
                const project = await Project_1.default.findById(task.project);
                if (project && project.projectManagers.length > 0) {
                    await (0, notifications_1.createNotification)({
                        userIds: project.projectManagers.map(pm => pm.toString()),
                        level: Notification_1.NotificationLevel.IMPORTANT,
                        message: `Tâche "${task.description}" marquée comme: ${status}`,
                        link: `/dashboard/projects/${project._id}`,
                        project: project._id.toString()
                    });
                }
            }
            const populatedTask = await task.populate([
                { path: 'project assignedTo', select: helpers_1.userSelect }
            ]);
            pubsub_1.pubsub.publish(pubsub_1.TASK_UPDATED_EVENT, { taskUpdated: populatedTask });
            return populatedTask;
        },
        team_uploadTaskV1: async (_, { taskId, fileUrl, originalFileName }, context) => {
            await (0, helpers_1.checkPermission)(context, 'manage_own_tasks');
            const task = await Task_1.default.findById(taskId);
            if (!task)
                throw new apollo_server_errors_1.ApolloError('Task not found');
            const newDocument = await (0, helpers_1.handleUpload)(fileUrl, originalFileName, 'TASK_V1', context.user.id);
            task.v1Uploads.push(newDocument._id);
            await (0, logger_1.logActivity)({
                userId: context.user.id,
                action: 'TEAM_UPLOAD_V1',
                project: task.project,
                details: `Team uploaded V1 for task "${task.description}": "${originalFileName}"`,
            });
            const project = await Project_1.default.findById(task.project);
            if (project && project.projectManagers.length > 0) {
                await (0, notifications_1.createNotification)({
                    userIds: project.projectManagers.map(pm => pm.toString()),
                    level: Notification_1.NotificationLevel.STANDARD,
                    message: `Une V1 a été uploadée pour la tâche: "${task.description}"`,
                    link: `/dashboard/projects/${project._id}`,
                    project: project._id.toString()
                });
            }
            await task.save();
            const populatedTask = await task.populate([
                { path: 'v1Uploads', populate: { path: 'uploadedBy', select: helpers_1.userSelect } },
                { path: 'finalUpload', populate: { path: 'uploadedBy', select: helpers_1.userSelect } },
                { path: 'assignedTo', select: helpers_1.userSelect },
            ]);
            return populatedTask;
        },
        team_uploadTaskFinal: async (_, { taskId, fileUrl, originalFileName }, context) => {
            await (0, helpers_1.checkPermission)(context, 'manage_own_tasks');
            const task = await Task_1.default.findById(taskId);
            if (!task)
                throw new apollo_server_errors_1.ApolloError('Task not found');
            const newDocument = await (0, helpers_1.handleUpload)(fileUrl, originalFileName, 'TASK_FINAL', context.user.id);
            task.finalUpload = newDocument._id;
            task.status = 'DONE';
            await (0, logger_1.logActivity)({
                userId: context.user.id,
                action: 'TEAM_UPLOAD_FINAL',
                project: task.project,
                details: `Team uploaded FINAL for task "${task.description}": "${originalFileName}"`,
            });
            await task.save();
            const project = await Project_1.default.findById(task.project);
            if (project && project.projectManagers.length > 0) {
                await (0, notifications_1.createNotification)({
                    userIds: project.projectManagers.map(pm => pm.toString()),
                    level: Notification_1.NotificationLevel.IMPORTANT,
                    message: `Version Finale Reçue: La tâche "${task.description}" est terminée.`,
                    link: `/dashboard/projects/${project._id}`,
                    project: project._id.toString()
                });
            }
            const populatedTask = await task.populate([
                { path: 'v1Uploads', populate: { path: 'uploadedBy', select: helpers_1.userSelect } },
                { path: 'finalUpload', populate: { path: 'uploadedBy', select: helpers_1.userSelect } },
                { path: 'assignedTo', select: helpers_1.userSelect },
            ]);
            pubsub_1.pubsub.publish(pubsub_1.TASK_UPDATED_EVENT, { taskUpdated: populatedTask });
            return populatedTask;
        },
    },
    Subscription: {
        taskCreated: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub_1.pubsub.asyncIterator(pubsub_1.NEW_TASK_EVENT), (payload, variables) => {
                if (!payload.taskCreated || !payload.taskCreated.id) {
                    console.error('Task created without ID:', payload.taskCreated);
                    return false;
                }
                if (!payload.taskCreated?.assignedTo)
                    return false;
                return payload.taskCreated.assignedTo.toString() === variables.userId;
            }),
        },
        taskUpdated: {
            subscribe: () => pubsub_1.pubsub.asyncIterator(pubsub_1.TASK_UPDATED_EVENT),
        }
    }
};
