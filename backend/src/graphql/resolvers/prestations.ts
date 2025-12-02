import { ApolloError } from 'apollo-server-errors';
import Prestation from '../../models/Prestation';
import Project from '../../models/Project';
import { IContext } from '../../server';
import { logActivity } from '../../utils/logger';

export const prestationResolvers = {
    Query: {
        // Récupérer toutes les prestations d'un projet spécifique
        prestationsByProject: async (_: unknown, { projectId }: { projectId: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            return await Prestation.find({ project: projectId }).sort({ createdAt: 1 });
        },
    },

    Mutation: {
        addPrestation: async (_: unknown, { input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            const project = await Project.findById(input.projectId);
            if (!project) throw new ApolloError('Project not found');

            const newPrestation = await Prestation.create({
                project: input.projectId,
                name: input.name,
                category: input.category,
                description: input.description,
                quantity: input.quantity,
                unitPrice: input.unitPrice
                // totalPrice est calculé automatiquement par le hook "pre save"
            });

            await logActivity({
                userId: context.user.id as any,
                action: 'ADD_PRESTATION',
                project: input.projectId,
                details: `Ajout prestation : ${input.name} (${input.category})`,
            });

            return newPrestation;
        },

        updatePrestation: async (_: unknown, { id, input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            // Si on modifie prix ou qté, il faut recalculer le total manuellement ici ou laisser le hook faire si on save()
            // Pour updateOne/findOneAndUpdate, le hook save ne marche pas toujours, donc on recalcule :
            let updateData = { ...input };

            // Si l'input contient prix ou quantité, on doit recalculer le total
            // Note: C'est une simplification, idéalement on fetch d'abord pour avoir les anciennes valeurs si l'une manque.
            if (input.quantity !== undefined && input.unitPrice !== undefined) {
                updateData.totalPrice = input.quantity * input.unitPrice;
            }

            const updated = await Prestation.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true }
            );

            if (!updated) throw new ApolloError('Prestation not found');

            return updated;
        },

        deletePrestation: async (_: unknown, { id }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            const deleted = await Prestation.findByIdAndDelete(id);
            if (!deleted) throw new ApolloError('Prestation not found');

            await logActivity({
                userId: context.user.id as any,
                action: 'DELETE_PRESTATION',
                project: deleted.project,
                details: `Prestation supprimée : ${deleted.name}`,
            });

            return true;
        }
    }
};