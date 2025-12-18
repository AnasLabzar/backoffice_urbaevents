import { ApolloError } from 'apollo-server-errors';
import { Types } from 'mongoose';
import Task from '../../models/Task';
import Project from '../../models/Project';
import Role from '../../models/Role';
import User from '../../models/User';
import { IContext } from '../../server';
import { withFilter } from 'graphql-subscriptions';
import { pubsub, NEW_TASK_EVENT, TASK_UPDATED_EVENT } from '../../utils/pubsub';
import { checkPermission, defaultUser, handleUpload, userSelect } from './helpers';
import { createNotification } from '../../utils/notifications';
import { NotificationLevel } from '../../models/Notification';
import { logActivity } from '../../utils/logger';

export const taskResolvers = {
    Query: {
        tasksByProject: async (_: unknown, { projectId }: { projectId: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            // ✅ FIX 1: Jm3na l-condition f whda (ma ymknch tkon 2 'project' keys f object wahed)
            const tasksAgg = await Task.aggregate([
                {
                    $match: {
                        project: new Types.ObjectId(projectId)
                        // Note: Ila kan egal ID, ra darouri exists w not null, donc zwlna l-khrin
                    }
                },
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
                        priority: 1, // <--- ADD THIS LINE
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
            const tasksWithUploads = await Task.find({ _id: { $in: taskIds } })
                .populate({ path: 'v1Uploads', populate: { path: 'uploadedBy', select: userSelect } })
                .populate({ path: 'finalUpload', populate: { path: 'uploadedBy', select: userSelect } });

            return tasksAgg.map(task => {
                const fullTask = tasksWithUploads.find(t => t._id.toString() === (task as any)._id.toString());
                const v1Uploads = (fullTask?.v1Uploads || []).filter(doc => doc).map((doc: any) => {
                    if (doc && !doc.uploadedBy) doc.uploadedBy = defaultUser;
                    return doc;
                });
                if (fullTask?.finalUpload && !(fullTask.finalUpload as any).uploadedBy) {
                    (fullTask.finalUpload as any).uploadedBy = defaultUser;
                }

                return {
                    ...task,
                    id: (task as any)._id.toString(),
                    v1Uploads: v1Uploads,
                    finalUpload: fullTask?.finalUpload || null,
                    project: {
                        ...task.project,
                        id: task.project.id || (task.project as any)._id.toString()
                    },
                    assignedTo: task.assignedTo ? {
                        ...task.assignedTo,
                        id: task.assignedTo.id || (task.assignedTo as any)._id.toString()
                    } : defaultUser
                };
            });
        },

        myTasks: async (_, __, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            await checkPermission(context, 'manage_own_tasks');

            const result = await Task.find({
                assignedTo: context.user.id,
                project: { $exists: true, $ne: null }
            })
                .populate({ path: 'project', select: 'id object title' })
                .populate({ path: 'assignedTo', select: userSelect })
                .populate({ path: 'v1Uploads', populate: { path: 'uploadedBy', select: userSelect } })
                .populate({ path: 'finalUpload', populate: { path: 'uploadedBy', select: userSelect } })
                .sort({ status: 1, dueDate: 1 });

            result.forEach((task: any) => {
                if (!task.assignedTo) task.assignedTo = defaultUser;
                if (task.v1Uploads) {
                    task.v1Uploads = task.v1Uploads.filter((doc: any) => doc).map((doc: any) => {
                        if (doc && !doc.uploadedBy) doc.uploadedBy = defaultUser;
                        return doc;
                    });
                }
                if (task.finalUpload && !(task.finalUpload as any).uploadedBy) {
                    (task.finalUpload as any).uploadedBy = defaultUser;
                }
            });

            return result.filter(task => task.project !== null);
        },

        allTasks: async (_: unknown, __: unknown, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const user = await User.findById(context.user.id).populate('role');
            if (!user) throw new ApolloError('User not found', 'USER_NOT_FOUND');
            const roleName = (user.role as any).name;

            let filter: any = {};
            if (['ADMIN', 'PROJECT_MANAGER', 'ASSISTANT_PM', 'COORDINATOR'].includes(roleName)) {
                filter = {};
            } else {
                filter = { assignedTo: context.user.id };
            }
            filter.project = { $exists: true, $ne: null };

            const tasks = await Task.find(filter)
                .populate({ path: 'project', select: 'title projectCode object' })
                .populate({ path: 'assignedTo', select: 'name email role' })
                .populate({ path: 'v1Uploads', populate: { path: 'uploadedBy', select: 'name email role' } })
                .populate({ path: 'finalUpload', populate: { path: 'uploadedBy', select: 'name email role' } })
                .sort({ createdAt: -1 });

            tasks.forEach((task: any) => {
                if (!task.assignedTo) task.assignedTo = defaultUser;
                if (task.v1Uploads) {
                    task.v1Uploads = task.v1Uploads.filter((doc: any) => doc).map((doc: any) => {
                        if (doc && !doc.uploadedBy) doc.uploadedBy = defaultUser;
                        return doc;
                    });
                }
                if (task.finalUpload && !(task.finalUpload as any).uploadedBy) {
                    (task.finalUpload as any).uploadedBy = defaultUser;
                }
            });

            return tasks.filter(task => task.project !== null);
        },
    },

    Mutation: {
        pm_createTask: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'assign_creative_tasks');
            // Destructure priority from input
            const { description, projectId, assignedToId, department, dueDate, priority } = input;

            const task = await Task.create({
                description,
                project: projectId,
                assignedTo: assignedToId,
                department,
                status: 'TODO',
                priority: priority || 'LOW', // <--- ADD THIS (Default to LOW if null)
                dueDate: dueDate ? new Date(dueDate) : null,
            });

            if (!task || !task._id) throw new ApolloError('Failed to create task or task has no ID', 'TASK_CREATION_FAILED');

            const populatedTask = await Task.findById(task._id)
                .populate({ path: 'assignedTo', select: userSelect })
                .populate({ path: 'project', select: 'title projectCode' })
                .lean();

            if (!populatedTask) throw new ApolloError('Task not found after creation', 'TASK_NOT_FOUND');

            (populatedTask as any).id = populatedTask._id.toString();

            await logActivity({
                // ✅ FIX: Cast to any
                userId: context.user!.id as any,
                action: 'PM_CREATE_TASK',
                project: task.project,
                details: `Task created: "${task.description}"`,
            });

            pubsub.publish(NEW_TASK_EVENT, { taskCreated: populatedTask });

            if (task) {
                await createNotification({
                    userIds: [assignedToId],
                    level: NotificationLevel.STANDARD,
                    message: `Nouvelle tâche assignée: "${description}"`,
                    link: `/dashboard/projects/${projectId}`,
                    project: projectId
                });
            }

            return populatedTask;
        },

        pm_updateTaskStatus: async (_: unknown, { taskId, status }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const userRole = await Role.findById(context.user.role);
            if (
                !userRole ||
                (!userRole.permissions.includes('update_workflow_stage' as any) &&
                    !userRole.permissions.includes('manage_own_tasks' as any))
            ) {
                throw new ApolloError('Forbidden: Not authorized to update task status.', 'FORBIDDEN');
            }
            const oldTask = await Task.findById(taskId);
            if (!oldTask) throw new ApolloError('Task not found', 'NOT_FOUND');
            const task = await Task.findByIdAndUpdate(taskId, { status }, { new: true });
            if (!task) throw new ApolloError('Task not found', 'NOT_FOUND');

            await logActivity({
                // ✅ FIX: Cast to any
                userId: context.user.id as any,
                action: 'PM_UPDATE_TASK_STATUS',
                project: task.project,
                details: `Task "${task.description}" status changed to ${task.status}`,
            });

            if (task && (status === 'DONE' || status === 'BLOCKED')) {
                const project = await Project.findById(task.project);
                if (project && project.projectManagers.length > 0) {
                    await createNotification({
                        userIds: project.projectManagers.map(pm => pm.toString()),
                        level: NotificationLevel.IMPORTANT,
                        message: `Tâche "${task.description}" marquée comme: ${status}`,
                        link: `/dashboard/projects/${project._id}`,
                        project: project._id.toString()
                    });
                }
            }

            const populatedTask = await task.populate([
                { path: 'project assignedTo', select: userSelect }
            ]);

            pubsub.publish(TASK_UPDATED_EVENT, { taskUpdated: populatedTask });

            return populatedTask;
        },

        team_uploadTaskV1: async (_: unknown, { taskId, fileUrl, originalFileName }: any, context: IContext) => {
            await checkPermission(context, 'manage_own_tasks');
            const task = await Task.findById(taskId);
            if (!task) throw new ApolloError('Task not found');

            const newDocument = await handleUpload(fileUrl, originalFileName, 'TASK_V1', context.user!.id);
            // ✅ FIX: Cast array to any to push ID
            (task.v1Uploads as any).push(newDocument._id);

            await logActivity({
                // ✅ FIX: Cast to any
                userId: context.user!.id as any,
                action: 'TEAM_UPLOAD_V1',
                project: task.project,
                details: `Team uploaded V1 for task "${task.description}": "${originalFileName}"`,
            });

            const project = await Project.findById(task.project);
            if (project && project.projectManagers.length > 0) {
                await createNotification({
                    userIds: project.projectManagers.map(pm => pm.toString()),
                    level: NotificationLevel.STANDARD,
                    message: `Une V1 a été uploadée pour la tâche: "${task.description}"`,
                    link: `/dashboard/projects/${project._id}`,
                    project: project._id.toString()
                });
            }

            await task.save();
            const populatedTask = await task.populate([
                { path: 'v1Uploads', populate: { path: 'uploadedBy', select: userSelect } },
                { path: 'finalUpload', populate: { path: 'uploadedBy', select: userSelect } },
                { path: 'assignedTo', select: userSelect },
            ]);
            return populatedTask;
        },

        team_uploadTaskFinal: async (_: unknown, { taskId, fileUrl, originalFileName }: any, context: IContext) => {
            await checkPermission(context, 'manage_own_tasks');
            const task = await Task.findById(taskId);
            if (!task) throw new ApolloError('Task not found');

            const newDocument = await handleUpload(fileUrl, originalFileName, 'TASK_FINAL', context.user!.id);

            // ✅ FIX: Cast to any
            task.finalUpload = newDocument._id as any;
            task.status = 'DONE';

            await logActivity({
                // ✅ FIX: Cast to any
                userId: context.user!.id as any,
                action: 'TEAM_UPLOAD_FINAL',
                project: task.project,
                details: `Team uploaded FINAL for task "${task.description}": "${originalFileName}"`,
            });
            await task.save();

            const project = await Project.findById(task.project);
            if (project && project.projectManagers.length > 0) {
                await createNotification({
                    userIds: project.projectManagers.map(pm => pm.toString()),
                    level: NotificationLevel.IMPORTANT,
                    message: `Version Finale Reçue: La tâche "${task.description}" est terminée.`,
                    link: `/dashboard/projects/${project._id}`,
                    project: project._id.toString()
                });
            }

            const populatedTask = await task.populate([
                { path: 'v1Uploads', populate: { path: 'uploadedBy', select: userSelect } },
                { path: 'finalUpload', populate: { path: 'uploadedBy', select: userSelect } },
                { path: 'assignedTo', select: userSelect },
            ]);
            pubsub.publish(TASK_UPDATED_EVENT, { taskUpdated: populatedTask });
            return populatedTask;
        },
    },

    Subscription: {
        taskCreated: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(NEW_TASK_EVENT),
                (payload, variables) => {
                    if (!payload.taskCreated || !payload.taskCreated.id) {
                        console.error('Task created without ID:', payload.taskCreated);
                        return false;
                    }
                    if (!payload.taskCreated?.assignedTo) return false;
                    return payload.taskCreated.assignedTo.toString() === variables.userId;
                }
            ),
        },
        taskUpdated: {
            subscribe: () => pubsub.asyncIterator(TASK_UPDATED_EVENT),
        }
    }
};