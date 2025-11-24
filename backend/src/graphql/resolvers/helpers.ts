import { ApolloError } from 'apollo-server-errors';
import Document from '../../models/Document';
import Role from '../../models/Role';
import User from '../../models/User';
import { IContext } from '../../server';

// --- CONSTANTS ---
export const userSelect = 'name email role';

export const stagePopulates = [
    { path: 'stages.administrative.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.technical.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.technicalOffer.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.financialOffer.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.printing.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.workshop.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.field.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.logistics.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
] as const;

export const teamPopulates = [
    { path: 'team.infographistes', select: userSelect },
    { path: 'team.team3D', select: userSelect },
    { path: 'team.assistants', select: userSelect },
] as const;

export const defaultUser = { _id: 'DELETED_USER_ID', id: 'DELETED_USER_ID', name: 'Utilisateur Supprimé', email: '', role: null };

const DYNAMIC_PM_CANDIDATE_ROLES = [
    'PROJECT_MANAGER', 
    'DIRECTOR_EVENT', 
    'IT_MANAGER', 
    'CREATIVE', 
    'TEAM_MEMBER', 
    'ASSISTANT_PM'
] as const;

// --- FUNCTIONS ---

export const checkPermission = async (context: IContext, required: string) => {
    if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
    const userRole = await Role.findById(context.user.role);
    if (!userRole || !userRole.permissions.includes(required as any)) {
        throw new ApolloError(`Forbidden: Permission '${required}' required.`, 'FORBIDDEN');
    }
    return userRole;
};

export const handleUpload = async (fileUrl: string, originalFileName: string, docType: string, userId: string) => {
    return await Document.create({
        fileName: docType,
        fileUrl,
        originalFileName,
        uploadedBy: userId,
        createdAt: new Date(),
    });
};

export const isDynamicPmCandidate = async (userId: string): Promise<boolean> => {
    try {
        const user = await User.findById(userId).populate('role');
        const roleName = (user?.role as any)?.name;
        if (!roleName) return false;
        return DYNAMIC_PM_CANDIDATE_ROLES.includes(roleName as any);
    } catch (error) {
        console.error('Error checking dynamic PM candidate:', error);
        return false;
    }
};

export const getRoleUserIds = async (roleName: string): Promise<string[]> => {
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

export function buildProjectFilter(permissions: string[], userId: string) {
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

/**
 * Helper to patch null users in a project object to avoid frontend crashes
 */
export const patchProjectUsers = (project: any) => {
    if (!project.createdBy) project.createdBy = defaultUser;
    project.projectManagers = (project.projectManagers || []).filter((pm: any) => pm).map((pm: any) => pm || defaultUser);
    project.assignedTeam = (project.assignedTeam || []).filter((team: any) => team).map((team: any) => team || defaultUser);

    if (project.team) {
        project.team.infographistes = (project.team.infographistes || []).filter((u: any) => u).map((u: any) => u || defaultUser);
        project.team.team3D = (project.team.team3D || []).filter((u: any) => u).map((u: any) => u || defaultUser);
        project.team.assistants = (project.team.assistants || []).filter((u: any) => u).map((u: any) => u || defaultUser);
    }

    if (project.stages) {
        Object.keys(project.stages).forEach(stageKey => {
            const stage = (project.stages as any)[stageKey];
            if (stage && Array.isArray(stage.documents)) {
                stage.documents = stage.documents.filter((doc: any) => doc).map((doc: any) => {
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
};