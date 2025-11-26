"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchProjectUsers = exports.getRoleUserIds = exports.isDynamicPmCandidate = exports.handleUpload = exports.checkPermission = exports.defaultUser = exports.teamPopulates = exports.stagePopulates = exports.userSelect = void 0;
exports.buildProjectFilter = buildProjectFilter;
const apollo_server_errors_1 = require("apollo-server-errors");
const Document_1 = __importDefault(require("../../models/Document"));
const Role_1 = __importDefault(require("../../models/Role"));
const User_1 = __importDefault(require("../../models/User"));
// --- CONSTANTS ---
exports.userSelect = 'name email role';
exports.stagePopulates = [
    { path: 'stages.administrative.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.technical.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.technicalOffer.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.financialOffer.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.printing.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.workshop.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.field.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
    { path: 'stages.logistics.documents', populate: { path: 'uploadedBy', select: 'name email role' } },
];
exports.teamPopulates = [
    { path: 'team.infographistes', select: exports.userSelect },
    { path: 'team.team3D', select: exports.userSelect },
    { path: 'team.assistants', select: exports.userSelect },
];
exports.defaultUser = { _id: 'DELETED_USER_ID', id: 'DELETED_USER_ID', name: 'Utilisateur Supprimé', email: '', role: null };
const DYNAMIC_PM_CANDIDATE_ROLES = [
    'PROJECT_MANAGER',
    'DIRECTOR_EVENT',
    'IT_MANAGER',
    'CREATIVE',
    'TEAM_MEMBER',
    'ASSISTANT_PM'
];
// --- FUNCTIONS ---
const checkPermission = async (context, required) => {
    if (!context.user)
        throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
    const userRole = await Role_1.default.findById(context.user.role);
    if (!userRole || !userRole.permissions.includes(required)) {
        throw new apollo_server_errors_1.ApolloError(`Forbidden: Permission '${required}' required.`, 'FORBIDDEN');
    }
    return userRole;
};
exports.checkPermission = checkPermission;
const handleUpload = async (fileUrl, originalFileName, docType, userId) => {
    return await Document_1.default.create({
        fileName: docType,
        fileUrl,
        originalFileName,
        uploadedBy: userId,
        createdAt: new Date(),
    });
};
exports.handleUpload = handleUpload;
const isDynamicPmCandidate = async (userId) => {
    try {
        const user = await User_1.default.findById(userId).populate('role');
        const roleName = user?.role?.name;
        if (!roleName)
            return false;
        return DYNAMIC_PM_CANDIDATE_ROLES.includes(roleName);
    }
    catch (error) {
        console.error('Error checking dynamic PM candidate:', error);
        return false;
    }
};
exports.isDynamicPmCandidate = isDynamicPmCandidate;
const getRoleUserIds = async (roleName) => {
    try {
        const role = await Role_1.default.findOne({ name: roleName });
        if (!role)
            return [];
        const users = await User_1.default.find({ role: role._id });
        return users.map(user => user._id.toString());
    }
    catch (error) {
        console.error(`Error fetching user IDs for role ${roleName}:`, error);
        return [];
    }
};
exports.getRoleUserIds = getRoleUserIds;
function buildProjectFilter(permissions, userId) {
    // 1. Admin ou Super-User (Voit tout sauf les brouillons)
    if (permissions.includes('view_all_analytics')) {
        return { preparationStatus: { $ne: 'DRAFT' } };
    }
    // 2. Proposal Manager (Voit ce qu'il a créé OU ce qu'il gère explicitement)
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
                    { projectManagers: userId }, // <-- Assigné comme Chef de Projet
                    { assignedTeam: userId }, // <-- Assigné dans l'équipe globale
                    { 'team.infographistes': userId }, // <-- Assigné comme Infographiste
                    { 'team.team3D': userId }, // <-- Assigné comme 3D
                    { 'team.assistants': userId } // <-- Assigné comme Assistant
                ]
            }
        ]
    };
}
/**
 * Helper to patch null users in a project object to avoid frontend crashes
 */
const patchProjectUsers = (project) => {
    if (!project.createdBy)
        project.createdBy = exports.defaultUser;
    project.projectManagers = (project.projectManagers || []).filter((pm) => pm).map((pm) => pm || exports.defaultUser);
    project.assignedTeam = (project.assignedTeam || []).filter((team) => team).map((team) => team || exports.defaultUser);
    if (project.team) {
        project.team.infographistes = (project.team.infographistes || []).filter((u) => u).map((u) => u || exports.defaultUser);
        project.team.team3D = (project.team.team3D || []).filter((u) => u).map((u) => u || exports.defaultUser);
        project.team.assistants = (project.team.assistants || []).filter((u) => u).map((u) => u || exports.defaultUser);
    }
    if (project.stages) {
        Object.keys(project.stages).forEach(stageKey => {
            const stage = project.stages[stageKey];
            if (stage && Array.isArray(stage.documents)) {
                stage.documents = stage.documents.filter((doc) => doc).map((doc) => {
                    if (doc && !doc.uploadedBy) {
                        doc.uploadedBy = exports.defaultUser;
                    }
                    return doc;
                });
            }
        });
    }
    if (project.proposalAvis && !project.proposalAvis.givenBy) {
        project.proposalAvis.givenBy = exports.defaultUser;
    }
};
exports.patchProjectUsers = patchProjectUsers;
