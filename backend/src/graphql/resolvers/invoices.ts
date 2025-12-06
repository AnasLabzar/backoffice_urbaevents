import { ApolloError } from 'apollo-server-errors';
import Invoice from '../../models/Invoice';
import InvoiceItem from '../../models/InvoiceItem';
import Prestation from '../../models/Prestation';
import { IContext } from '../../server';

// Helper: Recalculer le total de la facture
const recalculateInvoiceTotal = async (invoiceId: string) => {
    // 1. Jib ga3 les items dyal had l facture
    const items = await InvoiceItem.find({ invoice: invoiceId });

    // 2. 7seb lmjmou3
    const total = items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);

    // 3. Miti l'invoice
    await Invoice.findByIdAndUpdate(invoiceId, { totalAmount: total });
    return total;
};

export const invoiceResolvers = {
    Query: {
        // Jib l facture aw crea wehda jdida (Estimation)
        getProjectEstimation: async (_: unknown, { projectId }: { projectId: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            let invoice = await Invoice.findOne({ project: projectId, type: 'ESTIMATION' });

            if (!invoice) {
                const count = await Invoice.countDocuments({ type: 'ESTIMATION' });
                const ref = `EST-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

                invoice = await Invoice.create({
                    project: projectId,
                    type: 'ESTIMATION',
                    reference: ref,
                    status: 'DRAFT',
                    totalAmount: 0,
                    createdBy: context.user.id
                });
            }
            return invoice;
        },

        // Jib les items dyal l facture
        getInvoiceItems: async (_: unknown, { invoiceId }: { invoiceId: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');
            return await InvoiceItem.find({ invoice: invoiceId }).sort({ createdAt: 1 });
        },

        // Catalog Helpers
        getPrestationCatalog: async (_: unknown, __: unknown, context: IContext) => {
            return await Prestation.distinct('category');
        },

        searchPrestation: async (_: unknown, { category, search }: any) => {
            const query: any = {};
            if (category) query.category = category;
            if (search) query.designation = { $regex: search, $options: 'i' };
            return await Prestation.find(query).limit(20);
        }
    },

    Mutation: {
        // Zid Sbar (Item) + Recalculate Total
        addInvoiceItem: async (_: unknown, { input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            const invoice = await Invoice.findById(input.invoiceId);
            if (!invoice) throw new Error("Facture introuvable");

            // 1. Create Item in separate table (InvoiceItem)
            const newItem = await InvoiceItem.create({
                invoice: input.invoiceId,
                project: input.projectId, // Optional

                category: input.category,
                subCategory: input.subCategory || 'Divers',
                designation: input.name, // Mapping name -> designation
                description: input.description,
                unit: 'U',

                quantity: input.quantity,
                unitPrice: input.unitPrice
                // totalPrice calculated automatically in Model pre-save hook
            });

            // 2. IMPORTANT: Recalculate Invoice Total
            await recalculateInvoiceTotal(input.invoiceId);

            return newItem;
        },

        // Mse7 Sbar (Item) + Recalculate Total
        deleteInvoiceItem: async (_: unknown, { id }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            const item = await InvoiceItem.findById(id);
            if (!item) throw new ApolloError("Item introuvable");

            const invoiceId = item.invoice;

            // Delete
            await InvoiceItem.findByIdAndDelete(id);

            // Recalculate Total
            await recalculateInvoiceTotal(invoiceId.toString());

            return true;
        }
    },

    // Field Resolver: Bach GraphQL ye3ref kifach yjib "items" mli tbeghihom mn Invoice
    Invoice: {
        items: async (parent: any) => {
            return await InvoiceItem.find({ invoice: parent._id || parent.id });
        },
        id: (parent: any) => parent._id ? parent._id.toString() : parent.id
    }
};