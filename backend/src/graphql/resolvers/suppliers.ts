import { ApolloError } from 'apollo-server-errors';
import Supplier from '../../models/Supplier';
import { IContext } from '../../server';
import { checkPermission, userSelect } from './helpers';
import { logActivity } from '../../utils/logger';

export const supplierResolvers = {
    Query: {
        suppliers: async (_: unknown, __: unknown, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            // On peut ajouter une permission si nécessaire, ex: 'view_suppliers'
            // await checkPermission(context, 'view_suppliers');

            return await Supplier.find()
                .sort({ createdAt: -1 })
                .populate({ path: 'createdBy', select: userSelect });
        },

        supplier: async (_: unknown, { id }: { id: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            const supplier = await Supplier.findById(id).populate({ path: 'createdBy', select: userSelect });
            if (!supplier) throw new ApolloError('Supplier not found', 'NOT_FOUND');

            return supplier;
        },
    },

    Mutation: {
        createSupplier: async (_: unknown, { input }: any, context: IContext) => {
            // Vérification des permissions (tu peux ajouter 'manage_suppliers' dans tes rôles plus tard)
            if (!context.user) throw new ApolloError('Not authenticated');
            // await checkPermission(context, 'manage_suppliers');

            const newSupplier = await Supplier.create({
                ...input,
                createdBy: context.user.id
            });

            await logActivity({
                userId: context.user.id as any,
                action: 'CREATE_SUPPLIER',
                details: `Nouveau prestataire créé : ${newSupplier.name}`,
            });

            return await newSupplier.populate({ path: 'createdBy', select: userSelect });
        },

        updateSupplier: async (_: unknown, { id, input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            const updatedSupplier = await Supplier.findByIdAndUpdate(
                id,
                { $set: input },
                { new: true }
            ).populate({ path: 'createdBy', select: userSelect });

            if (!updatedSupplier) throw new ApolloError('Supplier not found');

            await logActivity({
                userId: context.user.id as any,
                action: 'UPDATE_SUPPLIER',
                details: `Prestataire mis à jour : ${updatedSupplier.name}`,
            });

            return updatedSupplier;
        },

        deleteSupplier: async (_: unknown, { id }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');
            // await checkPermission(context, 'delete_suppliers');

            const deleted = await Supplier.findByIdAndDelete(id);
            if (!deleted) throw new ApolloError('Supplier not found');

            await logActivity({
                userId: context.user.id as any,
                action: 'DELETE_SUPPLIER',
                details: `Prestataire supprimé : ${deleted.name}`,
            });

            return true;
        },
    },
};