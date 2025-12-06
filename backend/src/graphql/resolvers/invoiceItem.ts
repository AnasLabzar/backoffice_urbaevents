// resolvers/invoiceItemResolvers.ts
import { ApolloError } from 'apollo-server-errors';
import InvoiceItem from '../../models/InvoiceItem';
import Invoice from '../../models/Invoice';
import { IContext } from '../../server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export const invoiceItemResolvers = {
    Query: {
        // Jib lina items dyal had l facture
        getInvoiceItems: async (_: unknown, { invoiceId }: { invoiceId: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');
            // Kanjibo items b tartib
            return await InvoiceItem.find({ invoice: invoiceId }).sort({ createdAt: 1 });
        }
    },

    Mutation: {
        // Ajouter un item
        addInvoiceItem: async (_: unknown, { input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            const newItem = await InvoiceItem.create({
                invoice: input.invoiceId,
                project: input.projectId,

                // Content
                category: input.category,
                subCategory: input.subCategory || 'Divers',
                designation: input.name, // Mapping name -> designation
                description: input.description,
                unit: 'U', // Default

                // Numbers
                quantity: input.quantity,
                unitPrice: input.unitPrice
                // totalPrice est calculé auto
            });

            return newItem;
        },

        // Supprimer un item
        deleteInvoiceItem: async (_: unknown, { id }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');
            await InvoiceItem.findByIdAndDelete(id);
            return true;
        },

        // Import Excel (Directement vers InvoiceItems)
        importInvoiceItems: async (_: unknown, { projectId, invoiceId, fileUrl }: any, context: IContext) => {
            // ... (Nfss logic dyl Excel walakin kan-sauvegardiw f InvoiceItem direct)
            // ...
            // const createdItems = await InvoiceItem.insertMany(itemsToInsert);
            // return createdItems;

            // Ila bghiti logic kaml dyl import goulha lia nktebha lik
            return [];
        }
    }
};