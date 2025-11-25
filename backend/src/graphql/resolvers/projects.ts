import { ApolloError } from 'apollo-server-errors';
import { Types } from 'mongoose';
import Project from '../../models/Project';
import Task from '../../models/Task';
import User from '../../models/User';
import { IContext } from '../../server';
import { logActivity } from '../../utils/logger';
import { createNotification } from '../../utils/notifications';
import { NotificationLevel } from '../../models/Notification';
import { pubsub, NEW_TASK_EVENT } from '../../utils/pubsub';
import {
    checkPermission, defaultUser, handleUpload, stagePopulates,
    teamPopulates, userSelect, buildProjectFilter, isDynamicPmCandidate,
    getRoleUserIds, patchProjectUsers
} from './helpers';

// --- ✅ HELPER JDID: CHECK PM ACCESS (HYBRIDE) ---
// Hada kay-chouf wach nta Admin WLA nta m-assigné f had l-projet b dbt
const checkPMAccess = async (context: IContext, project: any, requiredPermission: string) => {
    const userId = context.user?.id;

    // 1. Check wach ana f la liste dyal projectManagers dyal had l-projet
    const isAssigned = project.projectManagers.some((pm: any) => pm.toString() === userId);

    if (isAssigned) return true; // ✅ Duz, nta howa moulchi f had l-projet

    // 2. Ila ma kntich m-assigné, checki wach nta Admin (Global Permission)
    try {
        await checkPermission(context, requiredPermission);
        return true; // ✅ Duz, nta Admin
    } catch (e) {
        return false; // ❌ Barra
    }
};

export const projectResolvers = {
    Query: {
        projects_proposals: async (_: unknown, __: unknown, context: IContext) => {
            await checkPermission(context, 'assign_project_managers');
            return Project.find({ preparationStatus: 'TO_CONFIRM' })
                .populate('createdBy')
                .sort({ createdAt: -1 });
        },

        projects: async (_: unknown, { filter }: { filter?: { preparationStatus?: string } }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            const queryFilter: any = {};
            if (filter?.preparationStatus) {
                queryFilter.preparationStatus = filter.preparationStatus;
            }

            let projectQuery = Project.find(queryFilter)
                .sort({ updatedAt: -1 })
                .populate({ path: 'projectManagers', select: userSelect })
                .populate({ path: 'createdBy', select: userSelect })
                .populate({ path: 'assignedTeam', select: userSelect })
                .populate({ path: 'proposalAvis.givenBy', select: userSelect });

            for (const p of stagePopulates) projectQuery = projectQuery.populate(p as any);
            for (const p of teamPopulates) projectQuery = projectQuery.populate(p as any);

            const projects = await projectQuery.exec();

            // 👇 AJOUTEZ CETTE LIGNE POUR DÉBUGGER
            // if (projects.length > 0) {
            //     console.log("🔎 DEBUG BACKEND PROJET 0:", {
            //         title: projects[0].title,
            //         market: projects[0].marketEstimate,
            //         budget: projects[0].estimatedBudget
            //     });
            // }

            projects.forEach((project: any) => patchProjectUsers(project));

            return projects;
        },

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

            let projectQuery = Project.find(projectFilter)
                .sort({ updatedAt: -1 })
                .populate({ path: 'projectManagers', select: userSelect })
                .populate({ path: 'createdBy', select: userSelect })
                .populate({ path: 'assignedTeam', select: userSelect })
                .populate({ path: 'proposalAvis.givenBy', select: userSelect });

            for (const p of stagePopulates) projectQuery = projectQuery.populate(p as any);
            for (const p of teamPopulates) projectQuery = projectQuery.populate(p as any);

            const projects = await projectQuery.exec();

            // 👇 AJOUTEZ CETTE LIGNE POUR DÉBUGGER
            // if (projects.length > 0) {
            //     console.log("🔎 DEBUG BACKEND PROJET 0:", {
            //         title: projects[0].title,
            //         market: projects[0].marketEstimate,
            //         budget: projects[0].estimatedBudget
            //     });
            // }

            projects.forEach((project: any) => patchProjectUsers(project));

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
                            'latestTask.id': '$_id',
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
                if (latestTask && !latestTask.id) {
                    latestTask = {
                        ...latestTask,
                        id: latestTask._id ? latestTask._id.toString() : null
                    };
                }
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

        project: async (_: unknown, { id }: { id: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            let q = Project.findById(id)
                .populate({ path: 'createdBy', select: userSelect })
                .populate({ path: 'projectManagers', select: userSelect })
                .populate({ path: 'assignedTeam', select: userSelect })
                .populate({ path: 'proposalAvis.givenBy', select: userSelect });

            for (const p of stagePopulates) q = q.populate(p as any);
            for (const p of teamPopulates) q = q.populate(p as any);

            const project: any = await q.exec();

            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');

            patchProjectUsers(project);

            return project;
        },
    },

    Mutation: {
        // Admin assign PM
        assignDynamicProjectManager: async (_: unknown, { projectId, newPmId }: { projectId: string, newPmId: string }, context: IContext) => {
            await checkPermission(context, 'assign_dynamic_pm');
            const isCandidate = await isDynamicPmCandidate(newPmId);
            if (!isCandidate) throw new ApolloError('Forbidden: User is not an authorized candidate.', 'FORBIDDEN');

            const updatedProject = await Project.findByIdAndUpdate(
                projectId,
                { $addToSet: { projectManagers: newPmId } },
                { new: true }
            ).populate({ path: 'projectManagers', select: userSelect });

            if (!updatedProject) throw new ApolloError('Project not found', 'NOT_FOUND');

            const newPm = updatedProject.projectManagers.find(pm => (pm as any)._id.toString() === newPmId);
            await logActivity(context.user.id, `Assigned new dynamic PM: ${newPm?.name || newPmId}`, 'PROJECT_UPDATE', projectId);

            await createNotification({
                title: `You have been assigned as Project Manager`,
                body: `You are now a Project Manager for project ${updatedProject.title}.`,
                level: NotificationLevel.ALERT,
                project: new Types.ObjectId(projectId),
                users: [new Types.ObjectId(newPmId)],
            });

            return updatedProject;
        },

        // Update general info
        updateProject: async (_: unknown, { id, input }: any, context: IContext) => {
            const project = await Project.findById(id);
            if (!project) throw new ApolloError('Project not found');

            // ✅ FIX: On utilise checkPMAccess ici aussi
            const canEdit = await checkPMAccess(context, project, 'manage_assigned_projects');
            if (!canEdit) throw new ApolloError('Forbidden', 'FORBIDDEN');

            const updatedProject = await Project.findByIdAndUpdate(id, { $set: input }, { new: true });
            await logActivity({
                userId: context.user.id,
                action: 'PROJECT_UPDATE',
                project: updatedProject!._id,
                details: `Project details updated`,
            });
            return updatedProject;
        },

        // Proposal Manager creation
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

            await logActivity({ userId: context.user.id, action: 'PROPOSAL_CREATE', project: project._id, details: `Draft created: "${project.title}"` });
            return project;
        },

        proposal_uploadDocument: async (_: unknown, { projectId, stageName, docType, fileUrl, originalFileName }: any, context: IContext) => {
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
                details: `Document uploadé: "${docType}" (${originalFileName})`,
            });

            if (stageName === 'administrative' && project.projectManagers.length > 0) {
                await createNotification({
                    userIds: project.projectManagers.map(pm => pm.toString()),
                    level: NotificationLevel.INFO,
                    message: `Nouveau document administratif ajouté : ${docType}`,
                    link: `/dashboard/projects/${project._id}`,
                    project: project._id.toString()
                });
            }

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

            const adminIds = await getRoleUserIds('ADMIN');
            if (adminIds.length > 0) {
                await createNotification({
                    userIds: adminIds,
                    level: NotificationLevel.IMPORTANT,
                    message: `Nouveau projet soumis pour validation: "${project.object}"`,
                    link: `/dashboard/projects`,
                    project: project._id.toString()
                });
            }

            return project;
        },

        admin_assignProject: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'assign_project_managers');
            const { projectId, projectManagerIds, status } = input;

            const project = await Project.findByIdAndUpdate(
                projectId,
                { projectManagers: projectManagerIds, preparationStatus: status, currentStage: 'ADMINISTRATIVE' },
                { new: true }
            ).populate({ path: 'projectManagers', select: userSelect });

            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');

            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_ASSIGN_PM',
                project: project._id,
                details: `Project assigned. Status: ${status}`,
            });

            if (status === 'TO_PREPARE' && projectManagerIds.length > 0) {
                await createNotification({
                    userIds: projectManagerIds,
                    level: NotificationLevel.STANDARD,
                    message: `Vous avez été assigné au projet: "${project.object}"`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }

            if (projectManagerIds && projectManagerIds.length > 0) {
                const projectEndDate = project.endDate ? new Date(project.endDate) : null;
                const generalTaskDescription = `Suivi et gestion générale du projet "${project.title}"`;
                const tasksToPublish = [];

                for (const pmId of projectManagerIds) {
                    const existingGeneralTask = await Task.findOne({
                        project: project._id,
                        assignedTo: pmId,
                        description: generalTaskDescription,
                        department: 'PROJECT_MANAGEMENT',
                    });

                    if (!existingGeneralTask) {
                        const newTask = await Task.create({
                            description: generalTaskDescription,
                            project: project._id,
                            assignedTo: pmId,
                            department: 'PROJECT_MANAGEMENT',
                            status: 'TODO',
                            dueDate: projectEndDate,
                        });

                        const populatedTask = await Task.findById(newTask._id)
                            .populate({ path: 'assignedTo', select: userSelect })
                            .populate({ path: 'project', select: 'title projectCode' })
                            .lean();

                        if (populatedTask) {
                            tasksToPublish.push({
                                ...populatedTask,
                                id: populatedTask._id.toString(),
                            });
                        }
                    }
                }

                for (const task of tasksToPublish) {
                    pubsub.publish(NEW_TASK_EVENT, { taskCreated: task });
                }
            }

            const projectObj = project.toObject();
            projectObj.id = project._id.toString();

            if (projectObj.projectManagers) {
                projectObj.projectManagers = projectObj.projectManagers.map((pm: any) => ({
                    ...pm,
                    id: pm._id ? pm._id.toString() : pm.id,
                }));
            }

            return JSON.parse(JSON.stringify(project));
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

            if (project.projectManagers.length > 0) {
                await createNotification({
                    userIds: project.projectManagers.map(pm => pm.toString()),
                    level: NotificationLevel.INFO,
                    message: `Check de faisabilité [${checkType}] mis à jour: ${status} (Projet: ${project.object})`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }

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

            const financeIds = await getRoleUserIds('FINANCE');
            const userIds = [
                ...project.projectManagers.map(pm => pm.toString()),
                ...financeIds
            ];

            if (userIds.length > 0) {
                await createNotification({
                    userIds: [...new Set(userIds)],
                    level: NotificationLevel.IMPORTANT,
                    message: `Projet lancé. En attente de la demande de caution: "${project.object}"`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }

            return project;
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

        // --- ✅ FIX: CP DONNE AVIS (AVEC CHECKPMACCESS) ---
        giveProposalAvis: async (_: unknown, { projectId, status, reason }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            // Utilisation de la nouvelle fonction de sécurité
            const canAccess = await checkPMAccess(context, project, 'assign_project_managers');
            if (!canAccess) throw new ApolloError('Forbidden - You must be the assigned Project Manager or Admin', 'FORBIDDEN');

            project.proposalAvis = {
                status,
                reason: status === 'NOT_ACCEPTED' ? reason : undefined,
                givenBy: context.user.id,
                givenAt: new Date(),
            };

            if (status === 'ACCEPTED') {
                project.preparationStatus = 'FEASIBILITY_PENDING';
            } else if (status === 'NOT_ACCEPTED') {
                project.preparationStatus = 'NO';
            }

            await project.save();
            await logActivity({ userId: context.user.id, action: 'GIVE_PROPOSAL_AVIS', project: project._id, details: `Avis: ${status}` });

            const adminIds = await getRoleUserIds('ADMIN');
            if (adminIds.length > 0) {
                await createNotification({
                    userIds: adminIds,
                    level: NotificationLevel.IMPORTANT,
                    message: `Avis [${status}] donné par le PM pour "${project.object}"`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }

            return project;
        },

        // --- ✅ FIX: CP UPLOAD ESTIMATE (AVEC CHECKPMACCESS) ---
        cp_uploadEstimate: async (_: unknown, { projectId, fileUrl, originalFileName }: any, context: IContext) => {
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            // Utilisation de la nouvelle fonction de sécurité
            const canAccess = await checkPMAccess(context, project, 'manage_assigned_projects');
            if (!canAccess) throw new ApolloError('Forbidden', 'FORBIDDEN');

            const allowedStatuses = ['TO_PREPARE', 'FEASIBILITY_PENDING'];
            if (!allowedStatuses.includes(project.preparationStatus)) {
                throw new ApolloError(`Statut invalide pour upload estimation: ${project.preparationStatus}`);
            }

            const newDocument = await handleUpload(fileUrl, originalFileName, 'CP_ESTIMATE', context.user.id);
            project.stages.technical.documents.push(newDocument._id);

            await logActivity({ userId: context.user.id, action: 'CP_UPLOAD_ESTIMATE', project: project._id, details: `Estimation uploadée` });
            await project.populate({ path: 'stages.technical.documents', populate: { path: 'uploadedBy', select: userSelect } });
            await project.save();

            const adminIds = await getRoleUserIds('ADMIN');
            if (adminIds.length > 0) {
                await createNotification({
                    userIds: adminIds,
                    level: NotificationLevel.STANDARD,
                    message: `L'estimation de coût a été uploadée pour: "${project.object}"`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }
            return project;
        },

        // --- ✅ FIX: CP ASSIGN TEAM (AVEC CHECKPMACCESS) ---
        cp_assignTeam: async (_: unknown, { input }: any, context: IContext) => {
            const { projectId, infographisteIds, team3DIds, assistantIds } = input;
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const canAccess = await checkPMAccess(context, project, 'assign_creative_tasks');
            if (!canAccess) throw new ApolloError('Forbidden', 'FORBIDDEN');

            project.team.infographistes = infographisteIds || [];
            project.team.team3D = team3DIds || [];
            project.team.assistants = assistantIds || [];

            const allIds = [...new Set([...infographisteIds, ...team3DIds, ...assistantIds])];
            project.assignedTeam = allIds;

            await logActivity({ userId: context.user.id, action: 'CP_ASSIGN_TEAM', project: project._id, details: `Team updated` });
            await project.save();

            if (allIds.length > 0) {
                await createNotification({
                    userIds: allIds,
                    level: NotificationLevel.STANDARD,
                    message: `Vous avez été assigné à l'équipe du projet: "${project.object}"`,
                    link: `/dashboard/projects/`,
                    project: project._id.toString()
                });
            }
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
    }
};