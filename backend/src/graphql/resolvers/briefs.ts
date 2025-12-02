import { ApolloError } from 'apollo-server-errors';
import ProjectBrief from '../../models/ProjectBrief';
import Project from '../../models/Project';
import { IContext } from '../../server';
import { logActivity } from '../../utils/logger';

export const briefResolvers = {
    Query: {
        getProjectBrief: async (_: unknown, { projectId }: { projectId: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');
            return await ProjectBrief.findOne({ project: projectId });
        },
    },

    Mutation: {
        saveProjectBrief: async (_: unknown, { input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            // Vérifier si le projet existe
            const project = await Project.findById(input.projectId);
            if (!project) throw new ApolloError('Project not found');

            // Trouver le brief existant ou en créer un
            let brief = await ProjectBrief.findOne({ project: input.projectId });

            if (brief) {
                // MISE À JOUR
                brief = await ProjectBrief.findOneAndUpdate(
                    { project: input.projectId },
                    { ...input, updatedBy: context.user.id },
                    { new: true }
                );

                await logActivity({
                    userId: context.user.id as any,
                    action: 'UPDATE_BRIEF',
                    project: input.projectId,
                    details: 'Mise à jour du Brief / Détails Projet',
                });

            } else {
                // CRÉATION
                brief = await ProjectBrief.create({
                    ...input,
                    project: input.projectId,
                    updatedBy: context.user.id
                });

                await logActivity({
                    userId: context.user.id as any,
                    action: 'CREATE_BRIEF',
                    project: input.projectId,
                    details: 'Création du Brief initial',
                });
            }

            return brief;
        }
    }
};