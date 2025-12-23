import { ApolloError } from 'apollo-server-errors';
import ProjectBrief from '../../models/ProjectBrief';
import Project from '../../models/Project';
import { IContext } from '../../server';
import { logActivity } from '../../utils/logger';
import ProjectBriefModel from '../../models/ProjectBrief';

export const briefResolvers = {
    Query: {
        getProjectBrief: async (_: unknown, { projectId }: { projectId: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            try {
                return await ProjectBrief.findOne({ project: projectId });
            } catch (error: any) {
                console.error("Error fetching brief:", error);
                throw new ApolloError('Error fetching brief', 'INTERNAL_SERVER_ERROR');
            }
        },
    },

    Mutation: {
        saveProjectBrief: async (_: unknown, { input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            const { projectId, ...briefData } = input;

            // 1. Vérifier que le projet existe
            const project = await Project.findById(projectId);
            if (!project) throw new ApolloError('Project not found', 'NOT_FOUND');

            // 2. Chercher si un brief existe déjà
            let brief = await ProjectBrief.findOne({ project: projectId });

            if (brief) {
                // UPDATE
                brief = await ProjectBrief.findOneAndUpdate(
                    { project: projectId },
                    { ...briefData, updatedBy: context.user.id, updatedAt: new Date() },
                    { new: true }
                );
                await logActivity({
                    userId: context.user.id as any,
                    action: 'UPDATE_BRIEF',
                    project: projectId,
                    details: 'Mise à jour du Brief'
                });
            } else {
                // CREATE
                brief = await ProjectBrief.create({
                    project: projectId,
                    ...briefData,
                    updatedBy: context.user.id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                await logActivity({
                    userId: context.user.id as any,
                    action: 'CREATE_BRIEF',
                    project: projectId,
                    details: 'Création du Brief initial'
                });
            }
            return brief;
        }
    },
};