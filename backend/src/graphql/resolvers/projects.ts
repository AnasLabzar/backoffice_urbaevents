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
import Document from '../../models/Document';
import Notification from '../../models/Notification';
import path from 'path';
import {
    checkPermission, handleUpload, stagePopulates,
    teamPopulates, userSelect, buildProjectFilter, isDynamicPmCandidate,
    getRoleUserIds, patchProjectUsers
} from './helpers';
import { aiService } from '../../../services/aiService';
import Role from '../../models/Role';
import ProjectBriefModel from '../../models/ProjectBrief';

// --- HELPER: CHECK PM ACCESS ---
const checkPMAccess = async (context: IContext, project: any, requiredPermission: string) => {
    const userId = context.user?.id;
    // @ts-ignore
    const isAssigned = project.projectManagers.some((pm: any) => pm.toString() === userId);

    if (isAssigned) return true;

    try {
        await checkPermission(context, requiredPermission);
        return true;
    } catch (e) {
        return false;
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
                .sort({ submissionDeadline: 1, updatedAt: -1 })
                .populate({ path: 'projectManagers', select: userSelect })
                .populate({ path: 'createdBy', select: userSelect })
                .populate({ path: 'assignedTeam', select: userSelect })
                .populate({ path: 'proposalAvis.givenBy', select: userSelect });

            for (const p of stagePopulates) projectQuery = (projectQuery as any).populate(p);
            for (const p of teamPopulates) projectQuery = (projectQuery as any).populate(p);

            const projects = await projectQuery.exec();
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

            for (const p of stagePopulates) projectQuery = (projectQuery as any).populate(p);
            for (const p of teamPopulates) projectQuery = (projectQuery as any).populate(p);

            const projects = await projectQuery.exec();
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

        // 👇👇👇 LE FIX EST ICI DANS LA QUERY PROJECT 👇👇👇
        project: async (_: unknown, { id }: { id: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            let q = Project.findById(id)
                .populate({ path: 'createdBy', select: userSelect })
                .populate({ path: 'projectManagers', select: userSelect })
                .populate({ path: 'assignedTeam', select: userSelect })
                .populate({ path: 'proposalAvis.givenBy', select: userSelect });

            for (const p of stagePopulates) q = (q as any).populate(p);
            for (const p of teamPopulates) q = (q as any).populate(p);

            const projectDoc: any = await q.exec();

            if (!projectDoc) throw new ApolloError('Project not found', 'NOT_FOUND');

            // 🛠️ HACK ULTIME : Conversion en Objet JS pur et nettoyage
            const projectObj = projectDoc.toObject({ virtuals: true });

            // 🛑 ON SUPPRIME LE CHAMP BRIEF S'IL EXISTE DANS L'OBJET
            // Cela oblige GraphQL à appeler le Resolver "brief" défini plus bas
            delete projectObj.brief;

            patchProjectUsers(projectObj);

            return projectObj;
        },
    },

    Mutation: {
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

            await logActivity({
                userId: context.user!.id as any,
                details: `Assigned new dynamic PM: ${(newPm as any)?.name || newPmId}`,
                action: 'PROJECT_UPDATE',
                project: projectId
            });

            await createNotification({
                userIds: [newPmId],
                message: `You have been assigned as Project Manager for project ${updatedProject.title}.`,
                level: NotificationLevel.IMPORTANT,
                project: projectId,
                link: `/dashboard/projects/${projectId}`
            });

            return updatedProject;
        },

        updateProject: async (_: unknown, { id, input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            // 👇👇👇 FIX COMMENCE ICI 👇👇👇

            // 1. On récupère le vrai NOM du rôle depuis la base de données
            // Car context.user.role contient seulement l'ID (ex: "6943...")
            const roleData = await Role.findById(context.user.role);
            const userRoleName = roleData?.name;

            // console.log("DEBUG ROLE:", userRoleName); // Décommente pour tester

            // 2. Vérification des permissions
            const isAuthorized = userRoleName === 'ADMIN' || userRoleName === 'PROPOSAL_MANAGER';

            if (!isAuthorized) {
                // On bloque si le rôle n'est pas dans la liste
                throw new ApolloError('Access denied', 'FORBIDDEN');
            }

            // 3. Exécuter la mise à jour
            try {
                const updatedProject = await Project.findByIdAndUpdate(
                    id,
                    { ...input },
                    { new: true }
                );

                return updatedProject;
            } catch (error) {
                console.error(error);
                throw new ApolloError('Error updating project', 'INTERNAL_SERVER_ERROR');
            }
        },

        proposal_createProject: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'create_project_proposal');

            // 1. Génération Code Projet
            const lastProject = await Project.findOne({}, { projectCode: 1 }).sort({ createdAt: -1 });
            let nextSequence = 1;
            if (lastProject && lastProject.projectCode) {
                const parts = lastProject.projectCode.split('-');
                if (parts.length === 2 && !isNaN(parseInt(parts[1]))) nextSequence = parseInt(parts[1]) + 1;
            }

            const prefixMap: Record<string, string> = { 'PUBLIC_TENDER': 'PU', 'CONFIRMED': 'CO', 'INTERNAL': 'IN' };
            const prefix = prefixMap[input.projectType] || input.projectType.slice(0, 2).toUpperCase();
            const projectCode = `${prefix}-${nextSequence.toString().padStart(4, '0')}`;

            // 2. Logic Status
            const isDirectProduction = input.projectType === 'CONFIRMED' || input.projectType === 'INTERNAL';
            const initialStatus = isDirectProduction ? 'TO_PREPARE' : 'DRAFT';
            const initialStage = isDirectProduction ? 'ADMINISTRATIVE' : 'PROPOSAL';

            // 3. Création (AVEC BUDGETS EXPLICITES)
            const project = await Project.create({
                // Données de base
                title: input.title,
                object: input.object,
                projectType: input.projectType,
                referenceAO: input.referenceAO,
                submissionDeadline: input.submissionDeadline,
                technicalOfferRequired: input.technicalOfferRequired,

                // 👇 HAHOMA L-BUDGETS BAYNIN HNA 👇
                marketEstimate: input.marketEstimate || 0,
                estimatedBudget: input.estimatedBudget || 0,
                cautionAmount: input.cautionAmount || 0,

                // Meta data
                projectCode,
                createdBy: context.user!.id,
                preparationStatus: initialStatus,
                generalStatus: 'IN_PROGRESS',
                currentStage: initialStage,
                stages: {
                    administrative: { responsible: ['PROPOSAL_MANAGER', 'ADMIN'], documents: [] },
                    technical: { responsible: ['PROPOSAL_MANAGER', 'PROJECT_MANAGER', 'COORDINATOR'], documents: [] },
                    technicalOffer: { responsible: ['PROJECT_MANAGER', 'COORDINATOR'], documents: [] },
                    financialOffer: { responsible: ['PROPOSAL_MANAGER', 'PROJECT_MANAGER', 'COORDINATOR'], documents: [] },
                    printing: { responsible: [], documents: [] },
                    workshop: { responsible: [], documents: [] },
                    field: { responsible: [], documents: [] },
                    logistics: { responsible: [], documents: [] },
                },
            });

            await logActivity({
                userId: context.user!.id as any,
                action: 'PROPOSAL_CREATE',
                project: project._id,
                details: `Projet créé: "${project.title}" (${projectCode}) - Budget: ${input.estimatedBudget}`
            });

            return project;
        },

        proposal_uploadDocument: async (_: unknown, { projectId, stageName, docType, fileUrl, originalFileName }: any, context: IContext) => {
            await checkPermission(context, 'create_project_proposal');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const newDocument = await handleUpload(fileUrl, originalFileName, docType, context.user!.id);
            ((project.stages as any)[stageName].documents as any).push(newDocument._id);

            const isCPS = docType.includes('CPS') || originalFileName.toLowerCase().includes('cps');

            if (isCPS) {
                console.log("🤖 CPS détecté, analyse contextuelle IA...");
                const absoluteFilePath = path.join(process.cwd(), newDocument.fileUrl);

                try {
                    const analysis = await aiService.analyzeCPSPDF(
                        absoluteFilePath,
                        project.title,
                        project.object
                    );

                    project.aiSummary = {
                        summary: analysis.summary,
                        thematic: analysis.thematic,
                        risks: analysis.risks || [],
                        generatedAt: new Date()
                    };
                    console.log("✅ Résumé IA généré avec succès !");
                } catch (err) {
                    console.error("⚠️ Echec analyse IA:", err);
                }
            }

            await project.save();

            await logActivity({
                userId: context.user!.id as any,
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
                userId: context.user!.id as any,
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
                userId: context.user!.id as any,
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
                // ✅ FIX: Casting 'project' as 'any' to avoid TS2339 error on 'endDate'
                // This ensures compilation works even if IProject interface isn't fully updated in all contexts
                const projectEndDate = (project as any).endDate ? new Date((project as any).endDate) : null;
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
                userId: context.user!.id as any,
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
                userId: context.user!.id as any,
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
                userId: context.user!.id as any,
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
                userId: context.user!.id as any,
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
                userId: context.user!.id as any,
                action: 'PM_VALIDATE_STAGE',
                project: project._id,
                details: `Stage ${stage} validated by PM.`,
            });
            return project;
        },

        giveProposalAvis: async (_: unknown, { projectId, status, reason }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const canAccess = await checkPMAccess(context, project, 'assign_project_managers');
            if (!canAccess) throw new ApolloError('Forbidden - You must be the assigned Project Manager or Admin', 'FORBIDDEN');

            project.proposalAvis = {
                status,
                reason: status === 'NOT_ACCEPTED' ? reason : undefined,
                givenBy: context.user.id as any,
                givenAt: new Date(),
            } as any;

            if (status === 'ACCEPTED') {
                project.preparationStatus = 'FEASIBILITY_PENDING';
            } else if (status === 'NOT_ACCEPTED') {
                project.preparationStatus = 'NO';
            }

            await project.save();
            await logActivity({ userId: context.user.id as any, action: 'GIVE_PROPOSAL_AVIS', project: project._id, details: `Avis: ${status}` });

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

        cp_uploadEstimate: async (_: unknown, { projectId, fileUrl, originalFileName }: any, context: IContext) => {
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const canAccess = await checkPMAccess(context, project, 'manage_assigned_projects');
            if (!canAccess) throw new ApolloError('Forbidden', 'FORBIDDEN');

            const allowedStatuses = ['TO_PREPARE', 'FEASIBILITY_PENDING'];
            if (!allowedStatuses.includes(project.preparationStatus)) {
                throw new ApolloError(`Statut invalide pour upload estimation: ${project.preparationStatus}`);
            }

            const newDocument = await handleUpload(fileUrl, originalFileName, 'CP_ESTIMATE', context.user!.id);
            (project.stages.technical.documents as any).push(newDocument._id);

            await logActivity({ userId: context.user!.id as any, action: 'CP_UPLOAD_ESTIMATE', project: project._id, details: `Estimation uploadée` });
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

        cp_assignTeam: async (_: unknown, { input }: any, context: IContext) => {
            const { projectId, infographisteIds, team3DIds, coordinatorIds, pmJuniorIds } = input;

            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const canAccess = await checkPMAccess(context, project, 'assign_creative_tasks');
            if (!canAccess) throw new ApolloError('Forbidden', 'FORBIDDEN');

            project.team.infographistes = infographisteIds || [];
            project.team.team3D = team3DIds || [];
            project.team.coordinators = coordinatorIds || [];
            project.team.pmJuniors = pmJuniorIds || [];

            const allIds = [...new Set([
                ...infographisteIds,
                ...team3DIds,
                ...coordinatorIds,
                ...pmJuniorIds
            ])];

            project.assignedTeam = allIds;

            await logActivity({
                userId: context.user!.id as any,
                action: 'CP_ASSIGN_TEAM',
                project: project._id,
                details: `Team updated (Coordinators & PM Juniors added)`
            });

            await project.save();

            if (allIds.length > 0) {
                await createNotification({
                    userIds: allIds,
                    level: NotificationLevel.STANDARD,
                    message: `Vous avez été assigné à l'équipe du projet: "${project.object}"`,
                    link: `/dashboard/projects/${project._id}`,
                    project: project._id.toString()
                });
            }
            return project;
        },

        cp_uploadFinalOffer: async (_: unknown, { projectId, fileUrl, originalFileName }: any, context: IContext) => {
            await checkPermission(context, 'manage_assigned_projects');
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const newDocument = await handleUpload(fileUrl, originalFileName, 'FINAL_OFFER_TECH', context.user!.id);
            (project.stages.technicalOffer.documents as any).push(newDocument._id);

            await logActivity({
                userId: context.user!.id as any,
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

            const newDocument = await handleUpload(fileUrl, originalFileName, 'ASSET', context.user!.id);
            (project.stages.technical.documents as any).push(newDocument._id);

            await logActivity({
                userId: context.user!.id as any,
                action: 'CP_UPLOAD_ASSET',
                project: project._id,
                details: `CP uploaded an asset: "${originalFileName}"`,
            });

            const teamIds = [
                ...project.team.infographistes.map(u => u.toString()),
                ...project.team.team3D.map(u => u.toString()),
                ...project.team.coordinators.map(u => u.toString()),
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
            project.caution.requestedBy = context.user!.id as any;
            project.caution.requestedAt = new Date();
            project.preparationStatus = 'IN_PRODUCTION';

            await logActivity({
                userId: context.user!.id as any,
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

            const newDocument = await handleUpload(fileUrl, originalFileName, 'METHODOLOGY', context.user!.id);
            (project.stages.technical.documents as any).push(newDocument._id);

            await logActivity({
                userId: context.user!.id as any,
                action: 'ASSISTANT_UPLOAD_METHODOLOGY',
                project: project._id,
                details: `Assistant uploaded methodology: "${originalFileName}"`,
            });
            await project.save();
            return project;
        },

        admin_deleteProject: async (_: unknown, { projectId }: { projectId: string }, context: IContext) => {
            // --- FIX HNA ---
            // 1. Ila kan Admin 3tih l-passe, sinon chouf permission
            // Hada kay-eviter l-mochkil dyal permission missing f DB
            const userRole = await Role.findById(context.user!.role);
            const isAdmin = userRole?.name === 'ADMIN';

            if (!isAdmin) {
                // Ila machi admin, 3ad n-verifier permission
                await checkPermission(context, 'delete_project');
            }
            // ----------------

            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            const projectTitle = project.title;

            console.log(`🗑️ Deleting project ${projectId} ...`);

            // Cascade Delete
            await Task.deleteMany({ project: projectId });
            await Notification.deleteMany({ project: projectId });

            await Project.findByIdAndDelete(projectId);

            await logActivity({
                userId: context.user!.id as any,
                action: 'PROJECT_DELETE',
                project: null,
                details: `Deleted project: "${projectTitle}"`
            });

            return true;
        },

        proposal_deleteDocument: async (_: unknown, { projectId, documentId, stageName }: { projectId: string, documentId: string, stageName: string }, context: IContext) => {
            // 1. Check Permissions
            await checkPermission(context, 'create_project_proposal');

            // 2. Find Project
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found');

            // 3. Verify Stage Exists (Safety Check)
            // @ts-ignore - access dynamic stage property
            if (!project.stages || !project.stages[stageName]) {
                throw new ApolloError(`Stage '${stageName}' not found in project.`);
            }

            // 4. Update Project: Remove document ID from the specific stage array
            // We use findByIdAndUpdate to atomically pull the ID from the array
            const updateQuery = {
                $pull: { [`stages.${stageName}.documents`]: documentId }
            };

            const updatedProject = await Project.findByIdAndUpdate(
                projectId,
                updateQuery,
                { new: true } // Return the updated document
            );

            // 5. Delete the actual Document record from the 'documents' collection
            const deletedDoc = await Document.findByIdAndDelete(documentId);

            // Optional: You might want to delete the file from disk/S3 here using deletedDoc.fileUrl

            // 6. Log Activity
            await logActivity({
                userId: context.user!.id as any,
                action: 'FILE_DELETE',
                project: project._id,
                details: `Document deleted: "${deletedDoc?.originalFileName || documentId}" from ${stageName}`,
            });

            // 7. Populate and Return
            // We need to populate the documents again to return the fresh list to the frontend
            await updatedProject?.populate({
                path: `stages.${stageName}.documents`,
                populate: { path: 'uploadedBy', select: userSelect },
            });

            // Also populate the other stage if needed, or just return the whole project structure
            // depending on what your frontend query expects.
            // For completeness based on your typical query:
            await updatedProject?.populate({
                path: 'stages.administrative.documents',
                populate: { path: 'uploadedBy', select: userSelect }
            });
            await updatedProject?.populate({
                path: 'stages.technical.documents',
                populate: { path: 'uploadedBy', select: userSelect }
            });

            return updatedProject;
        },

        archiveProject: async (_: unknown, { id }: { id: string }, context: IContext) => {
            // 1. Vérification des permissions (Admin ou Proposal Manager)
            const userRole = await Role.findById(context.user!.role);
            const allowedRoles = ['ADMIN', 'PROPOSAL_MANAGER'];

            if (!allowedRoles.includes(userRole?.name || '')) {
                throw new ApolloError('Permission denied', 'FORBIDDEN');
            }

            // 2. Mise à jour du statut
            const project = await Project.findByIdAndUpdate(
                id,
                { generalStatus: 'ARCHIVED' },
                { new: true }
            );

            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');

            // 3. Log de l'activité
            await logActivity({
                userId: context.user!.id as any,
                action: 'PROJECT_ARCHIVE',
                project: project._id,
                details: `Project archived: "${project.title}"`
            });

            return project;
        },
    },

    // ✅ Field Resolvers
    // 👇👇👇 FIELD RESOLVERS (C'est ici que la magie opère) 👇👇👇
    Project: {
        prestations: async (parent: any) => {
            const PrestationModel = require('../../models/Prestation').default;
            return await PrestationModel.find({ project: parent._id || parent.id });
        },
        invoices: async (parent: any) => {
            const InvoiceModel = require('../../models/Invoice').default;
            return await InvoiceModel.find({ project: parent._id || parent.id }).sort({ createdAt: -1 });
        },

        // ✅ LE RESOLVER BRIEF
        brief: async (parent: any) => {
            try {
                const projectId = parent._id || parent.id;
                console.log(`🔍 [RESOLVER] Fetching brief for project ${projectId}`);

                const brief = await ProjectBriefModel.findOne({ project: projectId });

                if (brief) {
                    console.log("✅ [RESOLVER] Brief Found with ID:", brief._id);
                    return brief;
                } else {
                    console.log("⚠️ [RESOLVER] No brief found in DB");
                    return null;
                }
            } catch (error) {
                console.error("❌ Error resolving brief:", error);
                return null;
            }
        },

        aiSummary: (parent: any) => parent.aiSummary
    }
};