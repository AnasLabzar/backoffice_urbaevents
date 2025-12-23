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
    { path: 'team.coordinators', select: userSelect },
] as const;

export const defaultUser = { _id: 'DELETED_USER_ID', id: 'DELETED_USER_ID', name: 'Utilisateur Supprimé', email: '', role: null };

const DYNAMIC_PM_CANDIDATE_ROLES = [
    'PROJECT_MANAGER',
    'DIRECTOR_EVENT',
    'IT_MANAGER',
    'CREATIVE',
    'TEAM_MEMBER',
    'COORDINATOR'
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
    // 1. Admin ou Super-User (DB ghadi ywelli ychouf kolchi: DRAFT, COMPLETED, etc.)
    if (permissions.includes('view_all_analytics')) {
        return {}; // <--- Khellina hada khawi bach mayfiltrich Drafts
    }

    // 2. Proposal Manager (Voit ce qu'il a créé OU ce qu'il gère explicitement - Y compris ses propres brouillons)
    if (permissions.includes('create_project_proposal')) {
        return {
            $or: [
                { createdBy: userId },
                { projectManagers: userId } // Au cas où il serait aussi PM sur un autre projet
            ]
        };
    }

    // 3. Finance (Voit les cautions)
    if (permissions.includes('manage_cautions')) {
        return { preparationStatus: 'CAUTION_PENDING' };
    }

    // 4. TOUS LES AUTRES (PM, Assistant, Creative, 3D, etc.)
    // Règle d'or : "Si mon ID est quelque part dans le projet, je le vois."
    return {
        $and: [
            // Condition 1 : Ne pas montrer les brouillons (sauf si on est le créateur, mais géré plus haut)
            { preparationStatus: { $ne: 'DRAFT' } },

            // Condition 2 : Être impliqué dans le projet
            {
                $or: [
                    { projectManagers: userId },       // <-- Assigné comme Chef de Projet
                    { assignedTeam: userId },          // <-- Assigné dans l'équipe globale
                    { 'team.infographistes': userId }, // <-- Assigné comme Infographiste
                    { 'team.team3D': userId },         // <-- Assigné comme 3D
                    { 'team.coordinators': userId }    // <-- Assigné comme Assistant
                ]
            }
        ]
    };
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
        project.team.coordinators = (project.team.coordinators || []).filter((u: any) => u).map((u: any) => u || defaultUser);
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