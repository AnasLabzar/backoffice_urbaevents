import { ApolloError } from 'apollo-server-errors';
import ProjectBrief from '../../models/ProjectBrief';
import Project from '../../models/Project';
import { IContext } from '../../server'; // Vérifie ton chemin d'import pour IContext
import { logActivity } from '../../utils/logger';

export const briefResolvers = {
    Query: {
        // ✅ QUERY : Récupérer le brief par ID du projet
        getProjectBrief: async (_: unknown, { projectId }: { projectId: string }, context: IContext) => {
            // Sécurité : Utilisateur connecté requis
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            try {
                // Recherche du brief lié à ce projectId
                const brief = await ProjectBrief.findOne({ project: projectId });
                return brief; // Peut retourner null si aucun brief n'existe encore, c'est normal
            } catch (error: any) {
                console.error("Error fetching brief:", error);
                throw new ApolloError('Error fetching brief', 'INTERNAL_SERVER_ERROR');
            }
        },
    },

    Mutation: {
        // ✅ MUTATION : Créer ou Mettre à jour le brief
        saveProjectBrief: async (_: unknown, { input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            const { projectId, ...briefData } = input;

            // 1. Vérifier que le projet existe
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');

            // 2. Chercher si un brief existe déjà pour ce projet
            let brief = await ProjectBrief.findOne({ project: projectId });

            if (brief) {
                // --- MODE MISE À JOUR ---
                brief = await ProjectBrief.findOneAndUpdate(
                    { project: projectId },
                    {
                        ...briefData,
                        updatedBy: context.user.id,
                        updatedAt: new Date()
                    },
                    { new: true } // Retourne l'objet mis à jour
                );

                await logActivity({
                    userId: context.user.id as any,
                    action: 'UPDATE_BRIEF',
                    project: projectId,
                    details: 'Mise à jour du Brief / Détails Projet',
                });

            } else {
                // --- MODE CRÉATION ---
                brief = await ProjectBrief.create({
                    project: projectId,
                    ...briefData,
                    updatedBy: context.user.id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                // (Optionnel) Si tu veux stocker l'ID du brief dans le projet, décommente ça :
                // await Project.findByIdAndUpdate(projectId, { brief: brief._id });

                await logActivity({
                    userId: context.user.id as any,
                    action: 'CREATE_BRIEF',
                    project: projectId,
                    details: 'Création du Brief initial',
                });
            }

            return brief;
        }
    }
};