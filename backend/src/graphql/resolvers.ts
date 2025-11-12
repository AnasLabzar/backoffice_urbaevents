import { ApolloError } from 'apollo-server-errors';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

import { IContext } from '../server';
import { generateToken } from '../utils/jwt';
import { logActivity } from '../utils/logger';
import { pubsub, NEW_TASK_EVENT } from '../utils/pubsub';
import { withFilter } from 'graphql-subscriptions';

import Role from '../models/Role';
import User from '../models/User';
import Project from '../models/Project';
import Task from '../models/Task';
import ActivityLog from '../models/ActivityLog';
import Document from '../models/Document';
import Notification, { NotificationLevel } from '../models/Notification'; // <-- ZID HADA


// --- ZID IMPORTS L-JDAD ---
import { createNotification } from '../utils/notifications';
import { pubsub, NEW_TASK_EVENT, TASK_UPDATED_EVENT, NEW_NOTIFICATION_EVENT } from '../utils/pubsub'; // <-- BDDEL HADA
import { withFilter } from 'graphql-subscriptions';

// -------------------- Populates --------------------
const stagePopulates = [
    { path: 'stages.administrative.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.technical.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.technicalOffer.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.financialOffer.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.printing.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.workshop.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.field.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.logistics.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
] as const;

// team.* are User refs; make sure we select "name"
const userSelect = 'name email role';
const teamPopulates = [
    { path: 'team.infographistes', select: userSelect },
    { path: 'team.team3D', select: userSelect },
    { path: 'team.assistants', select: userSelect },
] as const;

// --- HNA L-MODIFICATION ---
const defaultUser = { _id: 'DELETED_USER_ID', id: 'DELETED_USER_ID', name: 'Utilisateur Supprimé', email: '', role: null };
// ------------------------------------


/**
 * Helper jdid: Kay-jib ga3 l-IDs dyal l-users li 3ndhom wa7d l-role
 */
const getRoleUserIds = async (roleName: string): Promise<string[]> => {
    try {
        const role = await Role.findOne({ name: roleName });
        if (!role) return [];
        const users = await User.find({ role: role._id });
        return users.map(user => user._id.toString());
    } catch (error) {
        console.error(`Error fetching user IDs for role ${roleName}:`, error);
        return [];
    }
};

// -------------------- Helpers --------------------
const checkPermission = async (context: IContext, required: string) => {
    if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
    const userRole = await Role.findById(context.user.role);
    if (!userRole || !userRole.permissions.includes(required as any)) {
        throw new ApolloError(`Forbidden: Permission '${required}' required.`, 'FORBIDDEN');
    }
    return userRole;
};

const handleUpload = async (fileUrl: string, originalFileName: string, docType: string, userId: string) => {
    const newDoc = await Document.create({
        fileName: docType,
        fileUrl,
        originalFileName,
        uploadedBy: userId,
        createdAt: new Date(),
    });
    return newDoc;
};

function buildProjectFilter(permissions: string[], userId: string) {
    if (permissions.includes('view_all_analytics')) {
        return { preparationStatus: { $ne: 'DRAFT' } };
    }
    if (permissions.includes('manage_assigned_projects')) {
        return { projectManagers: userId, preparationStatus: { $ne: 'DRAFT' } };
    }
    if (permissions.includes('create_project_proposal')) {
        return { createdBy: userId };
    }
    if (permissions.includes('manage_cautions')) {
        return { preparationStatus: 'CAUTION_PENDING' };
    }
    if (permissions.includes('manage_own_tasks' as any) || permissions.includes('upload_methodology' as any)) {
        return {
            $or: [
                { 'team.infographistes': userId },
                { 'team.team3D': userId },
                { 'team.assistants': userId },
            ],
            preparationStatus: 'IN_PRODUCTION',
        };
    }
    return { _id: null };
}

// -------------------- Resolvers --------------------
export const resolvers = {
    Query: {
        me: async (_: unknown, __: unknown, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const user = await User.findById(context.user.id).populate('role');
            if (!user) throw new ApolloError('User not found', 'USER_NOT_FOUND');
            return user;
        },

        users: async (_: unknown, { role }: { role?: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const userRole = await Role.findById(context.user.role);
            if (!userRole || !userRole.permissions) {
                throw new ApolloError('User role or permissions not found', 'NOT_FOUND');
            }
            if (
                !userRole.permissions.includes('manage_users' as any) &&
                !userRole.permissions.includes('assign_creative_tasks' as any)
            ) {
                throw new ApolloError('Forbidden: Not authorized to view user lists.', 'FORBIDDEN');
            }
            if (role) {
                const roleDoc = await Role.findOne({ name: role });
                if (!roleDoc) throw new ApolloError('Role not found', 'NOT_FOUND');
                return User.find({ role: roleDoc._id }).populate('role');
            }
            return User.find().populate('role');
        },

        projects_proposals: async (_: unknown, __: unknown, context: IContext) => {
            await checkPermission(context, 'assign_project_managers');
            return Project.find({ preparationStatus: 'TO_CONFIRM' })
                .populate('createdBy')
                .sort({ createdAt: -1 });
        },

        // -------- FEED (HNA L-MODIFICATION L-KBERA) --------
        projects_feed: async (_: unknown, __: unknown, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            const user = await User.findById(context.user.id).populate('role');
            const role: any = user?.role;
            const permissions: string[] = role?.permissions;
            if (!user || !role || !Array.isArray(permissions)) {
                throw new ApolloError('User, role, or permissions array not found for this user', 'NOT_FOUND');
            }

            const userId = String(context.user.id);
            const projectFilter = buildProjectFilter(permissions, userId);

            // Populate: managers, creator, assignedTeam (with `name`), team.*, and all stage documents
            let projectQuery = Project.find(projectFilter)
                .sort({ updatedAt: -1 })
                .populate({ path: 'projectManagers', select: userSelect })
                .populate({ path: 'createdBy', select: userSelect })
                .populate({ path: 'assignedTeam', select: userSelect })
                .populate({ path: 'proposalAvis.givenBy', select: userSelect });

            for (const p of stagePopulates) projectQuery = projectQuery.populate(p as any);
            for (const p of teamPopulates) projectQuery = projectQuery.populate(p as any);

            // BDDELNA L-FIX: 7EYYEDNA .lean() BACH L-VIRTUALS YKHEDMO
            const projects = await projectQuery.exec();

            // --- FIX DYAL L-USERS LI 'null' ---
            projects.forEach((project: any) => {
                if (!project.createdBy) project.createdBy = defaultUser;

                project.projectManagers = (project.projectManagers || []).filter(pm => pm).map(pm => pm || defaultUser);
                project.assignedTeam = (project.assignedTeam || []).filter(team => team).map(team => team || defaultUser);

                if (project.team) {
                    project.team.infographistes = (project.team.infographistes || []).filter(u => u).map(u => u || defaultUser);
                    project.team.team3D = (project.team.team3D || []).filter(u => u).map(u => u || defaultUser);
                    project.team.assistants = (project.team.assistants || []).filter(u => u).map(u => u || defaultUser);
                }

                if (project.stages) {
                    Object.keys(project.stages).forEach(stageKey => {
                        const stage = (project.stages as any)[stageKey];
                        if (stage && Array.isArray(stage.documents)) {
                            stage.documents = stage.documents.filter(doc => doc).map((doc: any) => {
                                if (doc && !doc.uploadedBy) {
                                    doc.uploadedBy = defaultUser;
                                }
                                return doc;
                            });
                        }
                    });
                }

                if (project.proposalAvis && !project.proposalAvis.givenBy) {
                    project.proposalAvis.givenBy = defaultUser;
                }
            });
            // --- FIN DYAL L-FIX ---

            // Latest task per project (bqa bhal bhal)
            const projectIds = projects.map((p) => p._id as Types.ObjectId);
            let latestByProject: Record<string, any> = {};

            if (projectIds.length > 0) {
                const agg = await Task.aggregate([
                    { $match: { project: { $in: projectIds }, status: { $in: ['IN_PROGRESS', 'TODO', 'DONE'] } } },
                    {
                        $addFields: {
                            __priority: {
                                $switch: {
                                    branches: [
                                        { case: { $eq: ['$status', 'IN_PROGRESS'] }, then: 0 },
                                        { case: { $eq: ['$status', 'TODO'] }, then: 1 },
                                        { case: { $eq: ['$status', 'DONE'] }, then: 2 },
                                    ],
                                    default: 3,
                                },
                            },
                        },
                    },
                    { $sort: { project: 1, __priority: 1, updatedAt: -1 } },
                    {
                        $group: {
                            _id: '$project',
                            latestTask: { $first: '$$ROOT' }
                        }
                    },
                    {
                        $project: {
                            'latestTask.id': '$_id', // Add id field
                            'latestTask._id': 1,
                            'latestTask.description': 1,
                            'latestTask.status': 1,
                            'latestTask.department': 1,
                            'latestTask.dueDate': 1,
                            'latestTask.createdAt': 1,
                            'latestTask.updatedAt': 1,
                            'latestTask.project': 1,
                            'latestTask.assignedTo': 1
                        }
                    }
                ]);
                latestByProject = Object.fromEntries(agg.map((row: any) => [String(row._id), row.latestTask]));
            }

            const feed = projects.map((project) => {
                let latestTask = latestByProject[String(project._id)] || null;

                // Ensure latestTask has an id field
                if (latestTask && !latestTask.id) {
                    latestTask = {
                        ...latestTask,
                        id: latestTask._id ? latestTask._id.toString() : null
                    };
                }

                // 7eyyedna l-mapping dyal l-ID mn hna
                return { project, latestTask };
            });

            feed.sort((a, b) => {
                if (!a.latestTask && !b.latestTask) return 0;
                if (!a.latestTask) return 1;
                if (!b.latestTask) return -1;
                return new Date(b.latestTask.updatedAt).getTime() - new Date(a.latestTask.updatedAt).getTime();
            });

            return feed;
        },

        // -------- DETAILS (HNA L-MODIFICATION L-JDIDA) --------
        project: async (_: unknown, { id }: { id: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            let q = Project.findById(id)
                .populate({ path: 'createdBy', select: userSelect })
                .populate({ path: 'projectManagers', select: userSelect })
                .populate({ path: 'assignedTeam', select: userSelect })
                .populate({ path: 'proposalAvis.givenBy', select: userSelect }); // <-- ZEDNA HADI

            for (const p of stagePopulates) q = q.populate(p as any);
            for (const p of teamPopulates) q = q.populate(p as any);

            const project: any = await q.exec(); // 7eyyedna .lean()

            if (!project) {
                throw new ApolloError('Project not found', 'NOT_FOUND');
            }

            // --- NAFS L-FIX BHAL PROJECTS_FEED ---
            if (!project.createdBy) project.createdBy = defaultUser;

            project.projectManagers = (project.projectManagers || []).filter(pm => pm).map(pm => pm || defaultUser);
            project.assignedTeam = (project.assignedTeam || []).filter(team => team).map(team => team || defaultUser);

            if (project.team) {
                project.team.infographistes = (project.team.infographistes || []).filter(u => u).map(u => u || defaultUser);
                project.team.team3D = (project.team.team3D || []).filter(u => u).map(u => u || defaultUser);
                project.team.assistants = (project.team.assistants || []).filter(u => u).map(u => u || defaultUser);
            }

            if (project.stages) {
                Object.keys(project.stages).forEach(stageKey => {
                    const stage = (project.stages as any)[stageKey];
                    if (stage && Array.isArray(stage.documents)) {
                        stage.documents = stage.documents.filter(doc => doc).map((doc: any) => {
                            if (doc && !doc.uploadedBy) {
                                doc.uploadedBy = defaultUser;
                            }
                            return doc;
                        });
                    }
                });
            }

            // HNA L-MOCHKIL L-RA2ISSI
            if (project.proposalAvis && !project.proposalAvis.givenBy) {
                project.proposalAvis.givenBy = defaultUser;
            }
            // --- FIN DYAL L-FIX ---

            return project; // Kan rj3o l-document kaml
        },

        // --- FIX HNA (tasksByProject) ---
        tasksByProject: async (_: unknown, { projectId }: { projectId: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            const tasksAgg = await Task.aggregate([
                // ZEDNA HAD L-MATCH BACH N7YDO L-PROJECTS L-NULL
                { $match: { project: new Types.ObjectId(projectId), project: { $exists: true, $ne: null } } },
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
                // ZEDNA HAD L-MATCH TANI L-SECURITÉ
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

            // Now populate the uploads separately if needed
            const taskIds = tasksAgg.map(t => t._id);
            // 7eyyedna .lean()
            const tasksWithUploads = await Task.find({ _id: { $in: taskIds } })
                .populate({ path: 'v1Uploads', populate: { path: 'uploadedBy', select: userSelect } })
                .populate({ path: 'finalUpload', populate: { path: 'uploadedBy', select: userSelect } });

            // Merge the data
            return tasksAgg.map(task => {
                const fullTask = tasksWithUploads.find(t => t._id.toString() === (task as any)._id.toString());

                // Fix l-users li 'null' f l-uploads
                const v1Uploads = (fullTask?.v1Uploads || []).filter(doc => doc).map((doc: any) => {
                    if (doc && !doc.uploadedBy) doc.uploadedBy = defaultUser;
                    return doc;
                });
                if (fullTask?.finalUpload && !(fullTask.finalUpload as any).uploadedBy) {
                    (fullTask.finalUpload as any).uploadedBy = defaultUser;
                }

                return {
                    ...task,
                    id: (task as any)._id.toString(), // <-- FIX
                    v1Uploads: v1Uploads,
                    finalUpload: fullTask?.finalUpload || null,
                    // Daba project dima 3amr
                    project: {
                        ...task.project,
                        id: task.project.id || (task.project as any)._id.toString()
                    },
                    // FIX L-ASSIGNED TO
                    assignedTo: task.assignedTo ? {
                        ...task.assignedTo,
                        id: task.assignedTo.id || (task.assignedTo as any)._id.toString()
                    } : defaultUser // <-- Fallback
                };
            });
        },
        // --- FIN L-FIX ---

        // -------- LOGS (HNA TANI MODIFICATION) --------
        logs: async (_: unknown, { projectId }: { projectId?: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const user = await User.findById(context.user.id).populate('role');
            const userRole = user?.role as any;

            const filter: any = {};
            // --- FIX HNA (ZEDNA CHECK L-PROJECT) ---
            if (projectId) {
                filter.project = new Types.ObjectId(projectId);
            } else {
                // Ila makanch projectId, jib ghir l-logs li 3ndhom project
                filter.project = { $exists: true, $ne: null };
            }
            // ------------------------------------

            if (!userRole.permissions.includes('view_all_logs' as any)) {
                if (userRole.permissions.includes('view_team_logs' as any)) {
                    filter.user = { $in: [context.user.id /* add team ids if needed */] };
                } else {
                    filter.user = context.user.id;
                }
            }

            // 7EYYEDNA .lean()
            const logs = await ActivityLog.find(filter)
                .populate({ path: 'user', select: userSelect })
                .populate({ path: 'project' })
                .sort({ createdAt: -1 })
                .limit(100);

            // --- FIX DYAL L-USERS LI 'null' ---
            return logs.map((log: any) => {
                if (!log.user) {
                    log.user = defaultUser; // Kan-patchiw l-Mongoose document
                }
                return log; // L-virtuals ghaykhdmo
            });
        },

        // --- FIX HNA (myTasks) ---
        myTasks: async (_, __, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            console.log('🔍 myTasks - User ID:', context.user.id);

            // Check permission
            await checkPermission(context, 'manage_own_tasks');

            // 7EYYEDNA .lean()
            const result = await Task.find({
                assignedTo: context.user.id,
                project: { $exists: true, $ne: null } // <-- FIX HNA
            })
                .populate({ path: 'project', select: 'id object title' })
                .populate({ path: 'assignedTo', select: userSelect })
                .populate({ path: 'v1Uploads', populate: { path: 'uploadedBy', select: userSelect } })
                .populate({ path: 'finalUpload', populate: { path: 'uploadedBy', select: userSelect } })
                .sort({ status: 1, dueDate: 1 });

            // L-FIX DYAL L-USERS LI 'null' (BHAL PROJECTS_FEED)
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

            console.log('🔍 Final transformed result:', result);
            return result.filter(task => task.project !== null);
        },
        // --- FIN L-FIX ---

        // --- FIX HNA (allTasks) ---
        allTasks: async (_: unknown, __: unknown, context: IContext) => {
            if (!context.user)
                throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            // جلب المستخدم ودوره
            const user = await User.findById(context.user.id).populate('role');
            if (!user) throw new ApolloError('User not found', 'USER_NOT_FOUND');
            const roleName = (user.role as any).name;

            // فلترة حسب الدور
            let filter: any = {};

            if (['ADMIN', 'PROJECT_MANAGER', 'ASSISTANT_PM'].includes(roleName)) {
                filter = {}; // كل المهام
            } else {
                filter = { assignedTo: context.user.id }; // فقط مهام المستخدم
            }

            // --- FIX HNA ---
            filter.project = { $exists: true, $ne: null };
            // -----------------

            // 7EYYEDNA .lean()
            const tasks = await Task.find(filter)
                .populate({ path: 'project', select: 'title projectCode object' })
                .populate({ path: 'assignedTo', select: 'name email role' })
                .populate({ path: 'v1Uploads', populate: { path: 'uploadedBy', select: 'name email role' } })
                .populate({ path: 'finalUpload', populate: { path: 'uploadedBy', select: 'name email role' } })
                .sort({ createdAt: -1 });

            // L-FIX DYAL L-USERS LI 'null' (BHAL myTasks)
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

            return tasks.filter(task => task.project !== null); // Securité taniya
        },

        // --- L-QUERY L-JDID DYAL L-NOTIFS ---
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
        // --- FIN L-FIX ---

    },

    Mutation: {
        register: async (_: unknown, { name, email, password }: any) => {
            const existingUser = await User.findOne({ email });
            if (existingUser) throw new ApolloError('User with this email already exists', 'USER_ALREADY_EXISTS');

            let defaultRoleName = 'PROPOSAL_MANAGER';
            const userCount = await User.countDocuments();
            if (userCount === 0) defaultRoleName = 'ADMIN';

            let role = await Role.findOne({ name: defaultRoleName });
            if (!role) {
                const permissions: string[] =
                    defaultRoleName === 'ADMIN'
                        ? [
                            'configure_roles',
                            'manage_users',
                            'assign_project_managers',
                            'assign_teams',
                            'set_project_status',
                            'view_all_logs',
                            'view_all_analytics',
                            'create_project_proposal',
                            'manage_assigned_projects',
                            'assign_creative_tasks',
                            'update_workflow_stage',
                            'manage_cautions',
                            'manage_own_tasks',
                            'upload_methodology',
                        ]
                        : ['create_project_proposal'];
                role = await Role.create({ name: defaultRoleName, permissions });
            }

            const user = await User.create({ name, email, password, role: role._id });
            const token = generateToken(user);
            return { token, user: await user.populate('role') };
        },

        login: async (_: unknown, { email, password }: any) => {
            const user = await User.findOne({ email }).select('+password').populate('role');
            if (!user) throw new ApolloError('Invalid credentials', 'INVALID_CREDENTIALS');
            const isMatch = await bcrypt.compare(password, user.password || '');
            if (!isMatch) throw new ApolloError('Invalid credentials', 'INVALID_CREDENTIALS');
            const token = generateToken(user);
            await logActivity({ userId: user._id, action: 'USER_LOGIN', details: `User ${user.name} logged in.` });
            return { token, user };
        },

        updateProject: async (_: unknown, { id, input }: any, context: IContext) => {
            await checkPermission(context, 'manage_assigned_projects');
            const project = await Project.findByIdAndUpdate(id, { $set: input }, { new: true });
            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');
            await logActivity({
                userId: context.user.id,
                action: 'PROJECT_UPDATE',
                project: project._id,
                details: `Project details updated for: "${project.title}"`,
            });
            return project;
        },

        proposal_createProject: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'create_project_proposal');
            const projectCount = await Project.countDocuments();
            const projectCode = `${input.projectType.slice(0, 2)}-${(projectCount + 1).toString().padStart(4, '0')}`;

            const project = await Project.create({
                ...input,
                projectCode,
                createdBy: context.user.id,
                preparationStatus: 'DRAFT',
                generalStatus: 'IN_PROGRESS',
                currentStage: 'PROPOSAL',
                stages: {
                    administrative: { responsible: ['PROPOSAL_MANAGER', 'ADMIN'], documents: [] },
                    technical: { responsible: ['PROPOSAL_MANAGER', 'PROJECT_MANAGER', 'ASSISTANT_PM'], documents: [] },
                    technicalOffer: { responsible: ['PROJECT_MANAGER'], documents: [] },
                    financialOffer: { responsible: ['PROPOSAL_MANAGER', 'PROJECT_MANAGER'], documents: [] },
                    printing: { responsible: [], documents: [] },
                    workshop: { responsible: [], documents: [] },
                    field: { responsible: [], documents: [] },
                    logistics: { responsible: [], documents: [] },
                },
            });

            await logActivity({
                userId: context.user.id,
                action: 'PROPOSAL_CREATE',
                project: project._id,
                details: `Proposal draft created: "${project.title}"`,
            });
            return project;
        },

        proposal_uploadDocument: async (
            _: unknown,
            { projectId, stageName, docType, fileUrl, originalFileName }: any,
            context: IContext
        ) => {
            await checkPermission(context, 'create_project_proposal');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const newDocument = await handleUpload(fileUrl, originalFileName, docType, context.user.id);
            (project.stages as any)[stageName].documents.push(newDocument._id);
            await project.save();

            await logActivity({
                userId: context.user.id,
                action: 'FILE_UPLOAD',
                project: project._id,
                details: `File uploaded: "${docType}" (${originalFileName})`,
            });

            await project.populate({
                path: `stages.${stageName}.documents`,
                populate: { path: 'uploadedBy', select: userSelect },
            });

            return project;
        },

        proposal_submitForReview: async (_: unknown, { projectId }: any, context: IContext) => {
            await checkPermission(context, 'create_project_proposal');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            project.preparationStatus = 'TO_CONFIRM';
            await project.save();

            await logActivity({
                userId: context.user.id,
                action: 'PROPOSAL_SUBMIT',
                project: project._id,
                details: `Proposal submitted for review: "${project.title}"`,
            });

            // --- ZIDNA NOTIFICATION (L-ADMINS) ---
            const adminIds = await getRoleUserIds('ADMIN');
            if (adminIds.length > 0) {
                await createNotification({
                    userIds: adminIds,
                    level: NotificationLevel.IMPORTANT,
                    message: `Nouveau projet soumis pour validation: "${project.object}"`,
                    link: `/dashboard/projects`, // (L-Admin 3ndo l-kolchi)
                    project: project._id.toString()
                });
            }
            // ------------------------------------

            return project;
        },

        admin_createUser: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'manage_users');
            const { name, email, password, roleName } = input;

            const existingUser = await User.findOne({ email });
            if (existingUser) throw new ApolloError('User with this email already exists', 'USER_ALREADY_EXISTS');

            const role = await Role.findOne({ name: roleName });
            if (!role) throw new ApolloError(`Role '${roleName}' not found. Please create the role first.`, 'NOT_FOUND');

            const user = await User.create({ name, email, password, role: role._id });
            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_CREATE_USER',
                details: `Admin created new user: "${name}" with role ${roleName}.`,
            });
            return user.populate('role');
        },

        admin_createRole: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'configure_roles');
            const { name, permissions } = input;
            const existingRole = await Role.findOne({ name });
            if (existingRole) throw new ApolloError('Role with this name already exists', 'ROLE_ALREADY_EXISTS');
            const role = await Role.create({ name, permissions });
            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_CREATE_ROLE',
                details: `Admin created new role: "${name}"`,
            });
            return role;
        },

        admin_assignProject: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'assign_project_managers');
            const { projectId, projectManagerIds, status } = input;

            const project = await Project.findByIdAndUpdate(
                projectId,
                { projectManagers: projectManagerIds, preparationStatus: status, currentStage: 'ADMINISTRATIVE' },
                { new: true } // Kan-récupéré l-projet b les infos jdad
            );

            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');

            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_ASSIGN_PM',
                project: project._id,
                details: `Project assigned. Status: ${status}`,
            });

            // --- ZIDNA NOTIFICATION (L-PM L-JDID) ---
            if (status === 'TO_PREPARE' && projectManagerIds.length > 0) {
                await createNotification({
                    userIds: projectManagerIds,
                    level: NotificationLevel.STANDARD,
                    message: `Vous avez été assigné au projet: "${project.object}"`,
                    link: `/dashboard/projects/`, // L-PM ghaylqah f l-feed dyalo
                    project: project._id.toString()
                });
            }
            // ---------------------------------------

            // --- DEBUT DYAL L-CODE L-JDID ---
            // Hna kan-crééw l-tâche générale l kol PM
            if (projectManagerIds && projectManagerIds.length > 0) {
                const projectEndDate = project.endDate ? new Date(project.endDate) : null;
                const generalTaskDescription = `Suivi et gestion générale du projet "${project.title}"`;

                const tasksToPublish = [];

                for (const pmId of projectManagerIds) {
                    // Kan-vérifiw wach l-PM déja 3ndo had l-tâche générale
                    const existingGeneralTask = await Task.findOne({
                        project: project._id,
                        assignedTo: pmId,
                        description: generalTaskDescription,
                        department: 'PROJECT_MANAGEMENT', // Department dyal PM
                    });

                    // Ila makantch 3ndo, kan-crééwha
                    if (!existingGeneralTask) {
                        const newTask = await Task.create({
                            description: generalTaskDescription,
                            project: project._id,
                            assignedTo: pmId,
                            department: 'PROJECT_MANAGEMENT',
                            status: 'TODO',
                            dueDate: projectEndDate,
                        });

                        // Kan-préparéw l-tâche bach n-publiéwha f l-subscription
                        const populatedTask = await Task.findById(newTask._id)
                            .populate({ path: 'assignedTo', select: userSelect })
                            .populate({ path: 'project', select: 'title projectCode' })
                            .lean(); // .lean() bach yrje3 objet JS 3adi

                        if (populatedTask) {
                            tasksToPublish.push({
                                ...populatedTask,
                                id: populatedTask._id.toString(), // Ziyada dyal l-field 'id'
                            });
                        }
                    }
                }

                // Kan-publiéw ga3 les tâches jdad l-subscription
                for (const task of tasksToPublish) {
                    pubsub.publish(NEW_TASK_EVENT, { taskCreated: task });
                }
            }
            // --- NIHAYA DYAL L-CODE L-JDID ---

            return project;
        },

        admin_assignTeams: async (_: unknown, { projectId, teamMemberIds }: any, context: IContext) => {
            await checkPermission(context, 'assign_teams');
            const project = await Project.findByIdAndUpdate(
                projectId,
                { $addToSet: { assignedTeam: { $each: teamMemberIds } } },
                { new: true }
            );
            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');
            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_ASSIGN_TEAM',
                project: project._id,
                details: `Assigned ${teamMemberIds.length} members to project.`,
            });
            return project;
        },

        admin_updateProjectStage: async (_: unknown, { projectId, stage, status }: any, context: IContext) => {
            await checkPermission(context, 'set_project_status');
            const updateField = `stages.${stage}.status`;
            const project = await Project.findByIdAndUpdate(
                projectId,
                { $set: { [updateField]: status, currentStage: stage } },
                { new: true }
            );
            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');
            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_UPDATE_STAGE',
                project: project._id,
                details: `Stage ${stage} updated to ${status}`,
            });
            return project;
        },

        admin_runFeasibility: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'set_project_status');
            const { projectId, checkType, status } = input;
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');
            (project.feasibilityChecks as any)[checkType] = status;
            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_FEASIBILITY',
                project: project._id,
                details: `Feasibility check '${checkType}' set to ${status}`,
            });

            // --- ZIDNA NOTIFICATION (L-PM) ---
            if (project.projectManagers.length > 0) {
                await createNotification({
                    userIds: project.projectManagers.map(pm => pm.toString()),
                    level: NotificationLevel.INFO,
                    message: `Check de faisabilité [${checkType}] mis à jour: ${status} (Projet: ${project.object})`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }
            // ---------------------------------

            await project.save();
            return project;
        },

        admin_launchProject: async (_: unknown, { projectId }: any, context: IContext) => {
            await checkPermission(context, 'set_project_status');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');
            if (
                project.feasibilityChecks.administrative !== 'PASS' ||
                project.feasibilityChecks.technical !== 'PASS' ||
                project.feasibilityChecks.financial !== 'PASS'
            ) {
                throw new ApolloError('All 3 feasibility checks must be "PASS" to launch.');
            }
            project.preparationStatus = 'CAUTION_PENDING';
            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_LAUNCH',
                project: project._id,
                details: `Project launched. Pending caution.`,
            });
            await project.save();

            // --- ZIDNA NOTIFICATION (L-PM O L-FINANCE) ---
            const financeIds = await getRoleUserIds('FINANCE');
            const userIds = [
                ...project.projectManagers.map(pm => pm.toString()),
                ...financeIds
            ];

            if (userIds.length > 0) {
                await createNotification({
                    userIds: [...new Set(userIds)], // 7iyd doublons
                    level: NotificationLevel.IMPORTANT,
                    message: `Projet lancé. En attente de la demande de caution: "${project.object}"`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }
            // -----------------------------------------

            return project;
        },

        pm_createTask: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'assign_creative_tasks');
            const { description, projectId, assignedToId, department, dueDate } = input;

            const task = await Task.create({
                description,
                project: projectId,
                assignedTo: assignedToId,
                department,
                status: 'TODO',
                dueDate: dueDate ? new Date(dueDate) : null,
            });

            if (!task || !task._id) {
                throw new ApolloError('Failed to create task or task has no ID', 'TASK_CREATION_FAILED');
            }

            // --- L-Populate l-s7i7 (bqa b7al b7al) ---
            const populatedTask = await Task.findById(task._id)
                .populate({ path: 'assignedTo', select: userSelect })
                .populate({ path: 'project', select: 'title projectCode' })
                .lean();

            if (!populatedTask) {
                throw new ApolloError('Task not found after creation', 'TASK_NOT_FOUND');
            }

            // Ensure id field is present
            (populatedTask as any).id = populatedTask._id.toString();

            await logActivity({
                userId: context.user.id,
                action: 'PM_CREATE_TASK',
                project: task.project,
                details: `Task created: "${task.description}"`,
            });

            pubsub.publish(NEW_TASK_EVENT, { taskCreated: populatedTask });

            // --- HNA N-ZIDO L-NOTIFICATION ---
            if (task) {
                await createNotification({
                    userIds: [assignedToId],
                    level: NotificationLevel.STANDARD,
                    message: `Nouvelle tâche assignée: "${description}"`,
                    link: `/dashboard/projects/${projectId}`, // Bddel b link s7i7
                    project: projectId
                });
            }

            // --- NOTIFICATION (Déja kayna) ---
            await createNotification({
                userIds: [input.assignedToId],
                level: NotificationLevel.STANDARD,
                message: `Nouvelle tâche assignée: "${input.description}"`,
                link: `/dashboard/projects/${input.projectId}`,
                project: input.projectId
            });
            // ---------------------------------

            return populatedTask;
        },

        pm_updateTaskStatus: async (_: unknown, { taskId, status }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const userRole = await Role.findById(context.user.role);
            if (
                !userRole.permissions.includes('update_workflow_stage' as any) &&
                !userRole.permissions.includes('manage_own_tasks' as any)
            ) {
                throw new ApolloError('Forbidden: Not authorized to update task status.', 'FORBIDDEN');
            }
            const oldTask = await Task.findById(taskId);
            if (!oldTask) throw new ApolloError('Task not found', 'NOT_FOUND');
            const task = await Task.findByIdAndUpdate(taskId, { status }, { new: true });
            if (!task) throw new ApolloError('Task not found', 'NOT_FOUND');

            await logActivity({
                userId: context.user.id,
                action: 'PM_UPDATE_TASK_STATUS',
                project: task.project,
                details: `Task "${task.description}" status changed to ${task.status}`,
            });

            // --- NOTIFICATION (Déja kayna) ---
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
            // ---------------------------------

            // --- L-MODIFICATION 2: N-PUBLISHIW L-UPDATE ---
            const populatedTask = await task.populate([
                { path: 'project assignedTo', select: userSelect }
            ]);

            // --- HNA N-ZIDO L-NOTIFICATION ---
            if (task && (status === 'DONE' || status === 'BLOCKED')) {
                // Sifet notif l-PM dyal l-projet
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
            // --------------------------------
            pubsub.publish(TASK_UPDATED_EVENT, { taskUpdated: populatedTask });

            return populatedTask;
        },

        pm_validateStage: async (_: unknown, { projectId, stage }: any, context: IContext) => {
            await checkPermission(context, 'update_workflow_stage');
            const updateField = `stages.${stage}.status`;
            const project = await Project.findByIdAndUpdate(
                projectId,
                { $set: { [updateField]: 'DONE', currentStage: stage } },
                { new: true }
            );
            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');
            await logActivity({
                userId: context.user.id,
                action: 'PM_VALIDATE_STAGE',
                project: project._id,
                details: `Stage ${stage} validated by PM.`,
            });
            return project;
        },

        // --- HADI L-MUTATION L-JDIDA L-S7I7A ---
        giveProposalAvis: async (_: unknown, { projectId, status, reason }: any, context: IContext) => {
            // T2kd b l-permission - PROJECT_MANAGER hiya li 3ndha droit
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            const user = await User.findById(context.user.id).populate('role');
            const userRole = user?.role as any;

            if (!userRole || userRole.name !== 'PROJECT_MANAGER') {
                throw new ApolloError('Forbidden - Only PROJECT_MANAGER can give avis', 'FORBIDDEN');
            }

            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            // T2kd b l-workflow - ghir f TO_PREPARE
            if (project.preparationStatus !== 'TO_PREPARE') {
                throw new Error('Project must be in TO_PREPARE status for avis');
            }

            // T2kd b l-status
            if (!['ACCEPTED', 'NOT_ACCEPTED'].includes(status)) {
                throw new ApolloError('Invalid avis status - must be ACCEPTED or NOT_ACCEPTED');
            }

            // Khzn l-avis
            project.proposalAvis = {
                status,
                reason: status === 'NOT_ACCEPTED' ? reason : undefined,
                givenBy: context.user.id,
                givenAt: new Date(),
            };

            // --- BDIL STATUS L-WORKFLOW 3LA 7ASAB L-AVIS ---
            if (status === 'ACCEPTED') {
                // L-project ybqa f TO_PREPARE, l-Admin ydir feasibility
                project.preparationStatus = 'FEASIBILITY_PENDING';
            } else {
                // L-project ytwaqqf
                project.preparationStatus = 'NO';
            }

            await project.save();

            await logActivity({
                userId: context.user.id,
                action: 'GIVE_PROPOSAL_AVIS',
                project: project._id,
                details: `Avis donné: ${status}${reason ? ` (raison: ${reason})` : ''}`,
            });

            // --- ZIDNA NOTIFICATION (L-ADMIN) ---
            const adminIds = await getRoleUserIds('ADMIN');
            if (adminIds.length > 0) {
                await createNotification({
                    userIds: adminIds,
                    level: NotificationLevel.IMPORTANT,
                    message: `Avis [${status}] donné par le PM pour le projet: "${project.object}"`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }
            // ------------------------------------

            return project;
        },

        // --- BDIL L-MUTATION cp_uploadEstimate ---
        cp_uploadEstimate: async (_: unknown, { projectId, fileUrl, originalFileName }: any, context: IContext) => {
            await checkPermission(context, 'manage_assigned_projects');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            // T2kd b l-workflow
            if (project.preparationStatus !== 'TO_PREPARE') {
                throw new ApolloError('Project must be in TO_PREPARE status to upload estimate');
            }

            const newDocument = await handleUpload(fileUrl, originalFileName, 'CP_ESTIMATE', context.user.id);
            project.stages.technical.documents.push(newDocument._id);

            // --- MAKHASSNACH NBDLO L-STATUS HNA ---
            // L-project ybqa f TO_PREPARE, PROJECT_MANAGER y9dr y3ti avis
            // project.preparationStatus = 'AVIS_PENDING'; <-- SUPPRIMI HADA

            await logActivity({
                userId: context.user.id,
                action: 'CP_UPLOAD_ESTIMATE',
                project: project._id,
                details: `CP uploaded estimate: "${originalFileName}"`,
            });

            await project.populate({
                path: 'stages.technical.documents',
                populate: { path: 'uploadedBy', select: userSelect },
            });

            await project.save();

            // --- ZIDNA NOTIFICATION (L-ADMIN) ---
            const adminIds = await getRoleUserIds('ADMIN');
            if (adminIds.length > 0) {
                await createNotification({
                    userIds: adminIds,
                    level: NotificationLevel.STANDARD,
                    message: `L'estimation de coût a été uploadée pour: "${project.object}"`,
                    link: `/dashboard/projects/`, // L-Admin y-qdr y-clicki o y-dir feasibility
                    project: project._id.toString()
                });
            }
            // ------------------------------------

            return project;
        },




        cp_assignTeam: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'assign_creative_tasks');
            const { projectId, infographisteIds, team3DIds, assistantIds } = input;
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');
            project.team.infographistes = infographisteIds || [];
            project.team.team3D = team3DIds || [];
            project.team.assistants = assistantIds || [];
            await logActivity({
                userId: context.user.id,
                action: 'CP_ASSIGN_TEAM',
                project: project._id,
                details: `Project team assigned.`,
            });
            await project.save();

            // --- ZIDNA NOTIFICATION (L-TEAM L-JDID) ---
            const allAssignedIds = [
                ...(infographisteIds || []),
                ...(team3DIds || []),
                ...(assistantIds || [])
            ];

            if (allAssignedIds.length > 0) {
                await createNotification({
                    userIds: [...new Set(allAssignedIds)], // 7iyd doublons
                    level: NotificationLevel.STANDARD,
                    message: `Vous avez été assigné à l'équipe du projet: "${project.object}"`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }
            // ------------------------------------------

            return project;
        },

        cp_uploadFinalOffer: async (_: unknown, { projectId, fileUrl, originalFileName }: any, context: IContext) => {
            await checkPermission(context, 'manage_assigned_projects');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const newDocument = await handleUpload(fileUrl, originalFileName, 'FINAL_OFFER_TECH', context.user.id);
            project.stages.technicalOffer.documents.push(newDocument._id);

            await logActivity({
                userId: context.user.id,
                action: 'CP_UPLOAD_FINAL_OFFER',
                project: project._id,
                details: `CP uploaded final offer: "${originalFileName}"`,
            });
            await project.save();
            return project;
        },

        cp_uploadAsset: async (_: unknown, { projectId, fileUrl, originalFileName }: any, context: IContext) => {
            await checkPermission(context, 'manage_assigned_projects');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const newDocument = await handleUpload(fileUrl, originalFileName, 'ASSET', context.user.id);
            project.stages.technical.documents.push(newDocument._id);

            await logActivity({
                userId: context.user.id,
                action: 'CP_UPLOAD_ASSET',
                project: project._id,
                details: `CP uploaded an asset: "${originalFileName}"`,
            });

            // --- ZIDNA NOTIFICATION (L-TEAM) ---
            const teamIds = [
                ...project.team.infographistes.map(u => u.toString()),
                ...project.team.team3D.map(u => u.toString()),
                ...project.team.assistants.map(u => u.toString()),
            ];
            if (teamIds.length > 0) {
                await createNotification({
                    userIds: [...new Set(teamIds)],
                    level: NotificationLevel.INFO,
                    message: `Un nouvel asset a été ajouté au projet "${project.object}": ${originalFileName}`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }
            // ------------------------------------

            await project.populate({
                path: 'stages.technical.documents',
                populate: { path: 'uploadedBy', select: userSelect },
            });
            return project;
        },

        finance_requestCaution: async (_: unknown, { projectId }: any, context: IContext) => {
            await checkPermission(context, 'manage_cautions');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');
            project.caution.status = 'REQUESTED';
            project.caution.requestedBy = context.user.id;
            project.caution.requestedAt = new Date();
            project.preparationStatus = 'IN_PRODUCTION';
            await logActivity({
                userId: context.user.id,
                action: 'FINANCE_CAUTION_REQUEST',
                project: project._id,
                details: `Caution requested by Finance.`,
            });

            // --- ZIDNA NOTIFICATION (L-PM O L-ADMIN) ---
            const adminIds = await getRoleUserIds('ADMIN');
            const userIds = [
                ...project.projectManagers.map(pm => pm.toString()),
                ...adminIds
            ];
            if (userIds.length > 0) {
                await createNotification({
                    userIds: [...new Set(userIds)],
                    level: NotificationLevel.IMPORTANT,
                    message: `Caution demandée. Le projet "${project.object}" est officiellement en production.`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }
            // -----------------------------------------

            await project.save();
            return project;
        },

        assistant_uploadMethodology: async (_: unknown, { projectId, fileUrl, originalFileName }: any, context: IContext) => {
            await checkPermission(context, 'upload_methodology');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const newDocument = await handleUpload(fileUrl, originalFileName, 'METHODOLOGY', context.user.id);
            project.stages.technical.documents.push(newDocument._id);

            await logActivity({
                userId: context.user.id,
                action: 'ASSISTANT_UPLOAD_METHODOLOGY',
                project: project._id,
                details: `Assistant uploaded methodology: "${originalFileName}"`,
            });
            await project.save();
            return project;
        },

        team_uploadTaskV1: async (_: unknown, { taskId, fileUrl, originalFileName }: any, context: IContext) => {
            await checkPermission(context, 'manage_own_tasks');

            const task = await Task.findById(taskId);
            if (!task) throw new ApolloError('Task not found');

            const newDocument = await handleUpload(fileUrl, originalFileName, 'TASK_V1', context.user.id);
            task.v1Uploads.push(newDocument._id);

            await logActivity({
                userId: context.user.id,
                action: 'TEAM_UPLOAD_V1',
                project: task.project,
                details: `Team uploaded V1 for task "${task.description}": "${originalFileName}"`,
            });

            // --- ZIDNA NOTIFICATION (L-PM) ---
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
            // ------------------------------------

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

            const newDocument = await handleUpload(fileUrl, originalFileName, 'TASK_FINAL', context.user.id);
            task.finalUpload = newDocument._id;
            task.status = 'DONE'; // <-- L-Status kay-tbdl hna

            await logActivity({
                userId: context.user.id,
                action: 'TEAM_UPLOAD_FINAL',
                project: task.project,
                details: `Team uploaded FINAL for task "${task.description}": "${originalFileName}"`,
            });

            await task.save();

            // --- NOTIFICATION (Déja kayna) ---
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
            // --------------------------------

            // --- L-MODIFICATION SALAT HNA ---

            const populatedTask = await task.populate([
                { path: 'v1Uploads', populate: { path: 'uploadedBy', select: userSelect } },
                { path: 'finalUpload', populate: { path: 'uploadedBy', select: userSelect } },
                { path: 'assignedTo', select: userSelect },
            ]);

            // L-Publish dyal l-Socket (bqa b7al b7al)
            pubsub.publish(TASK_UPDATED_EVENT, { taskUpdated: populatedTask });
            // ------------------------------------

            return populatedTask;
        },

        // --- ZID HADO L-MUTATIONS L-JDAD ---
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
        taskCreated: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(NEW_TASK_EVENT),
                (payload, variables) => {
                    if (!payload.taskCreated || !payload.taskCreated.id) {
                        console.error('Task created without ID:', payload.taskCreated);
                        return false;
                    }
                    // Ensure we have a valid assignedTo field
                    if (!payload.taskCreated?.assignedTo) return false;
                    return payload.taskCreated.assignedTo.toString() === variables.userId;
                }
            ),
        },
        // --- L-MODIFICATION 4: ZIDNA SUBSCRIPTION JDIDA ---
        taskUpdated: {
            // N-tssennto l-l-event l-jdid
            subscribe: () => pubsub.asyncIterator(TASK_UPDATED_EVENT),
            // Note: Hna ma dirnach filter, ay update ghadi ywssel l-kolchi
            // Hadchi mzyan bach l-Project Feed y-tbdl 3nd kolchi
        },

        // --- ZID HADA L-SUBSCRIPTION L-JDID ---
        newNotification: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(NEW_NOTIFICATION_EVENT),
                (payload, variables) => {
                    return payload.newNotification.userId === variables.userId ||
                        payload.newNotification.userId === 'GLOBAL';
                }
            ),
        }
        // ---------------------------------------
    },

    // No special field resolvers needed; we rely on correct populates + selects.
};

export default resolvers;