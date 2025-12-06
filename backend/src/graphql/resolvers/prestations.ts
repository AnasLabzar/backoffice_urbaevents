import { ApolloError } from 'apollo-server-errors';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import Prestation from '../../models/Prestation';
import Invoice from '../../models/Invoice';
import InvoiceItem from '../../models/InvoiceItem'; // ✅ N7tajo Model Jdid
import { IContext } from '../../server';
import { logActivity } from '../../utils/logger';

// Helper pour recalculer le total (Copie locale ou importée)
const recalculateInvoiceTotal = async (invoiceId: string) => {
    const items = await InvoiceItem.find({ invoice: invoiceId });
    const total = items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
    await Invoice.findByIdAndUpdate(invoiceId, { totalAmount: total });
};

export const prestationResolvers = {
    Query: {
        prestationsByProject: async (_: unknown, { projectId }: { projectId: string }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const prestations = await Prestation.find({ project: projectId }).sort({ createdAt: 1 });
            return prestations.map(p => {
                const obj: any = p.toObject();
                obj.id = obj._id;
                obj.name = obj.designation;
                return obj;
            });
        },
    },

    Mutation: {
        addPrestation: async (_: unknown, { input }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');
            // Ajout au catalogue seulement
            const newPrestation = await Prestation.create({
                project: input.projectId,
                designation: input.name,
                category: input.category,
                description: input.description,
                unit: input.unit || 'U',
                unitPrice: input.unitPrice
            });
            const res: any = newPrestation.toObject();
            res.id = res._id;
            res.name = res.designation;
            return res;
        },

        deletePrestation: async (_: unknown, { id }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');
            const deleted = await Prestation.findByIdAndDelete(id);
            if (!deleted) throw new ApolloError('Prestation not found');
            return true;
        },

        // ✅ LOGIC IMPORT CORRIGÉE
        importPrestationsFromExcel: async (_: unknown, { projectId, invoiceId, fileUrl }: any, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated');

            // 1. Vérifier Facture
            const invoice = await Invoice.findById(invoiceId);
            if (!invoice) throw new ApolloError("Facture introuvable");

            // 2. Trouver Fichier
            const cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
            let filePath = '';
            const possiblePaths = [path.join(process.cwd(), cleanPath), fileUrl];
            for (const p of possiblePaths) { if (fs.existsSync(p)) { filePath = p; break; } }
            if (!filePath) throw new ApolloError("Fichier Excel introuvable.");

            // 3. Lire Excel
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData: any[] = XLSX.utils.sheet_to_json(sheet);
            if (rawData.length === 0) throw new ApolloError("Fichier vide.");

            const createdItems = [];
            let importedCount = 0;

            // 4. Boucle
            for (const row of rawData) {
                const designation = row['Designation'] || row['C (Désignation)'] || row['Item'];
                if (!designation || designation === 'Article') continue;

                const qty = Number(row['Quantity'] || row['E (Qté)']) || 1;
                const price = Number(row['UnitPrice'] || row['G (P.U)'] || row['Prix Unitaire']) || 0;

                // A. Create/Find Catalog Prestation (Optional but good for history)
                // (On ne lie plus rien ici, juste pour remplir le catalogue)
                await Prestation.findOneAndUpdate(
                    { designation: designation },
                    {
                        category: 'AUTRE',
                        subCategory: row['SubCategory'] || 'Divers',
                        unitPrice: price, // Update price reference
                        project: projectId
                    },
                    { upsert: true, new: true }
                );

                // B. ✅ CREATE INVOICE ITEM DIRECTLY
                const newItem = await InvoiceItem.create({
                    invoice: invoiceId, // LIEN IMPORTANT
                    project: projectId,
                    category: 'AUTRE', // Mapping intelligent possible ici
                    subCategory: row['SubCategory'] || 'Divers',
                    designation: designation,
                    description: row['Description'] || '',
                    quantity: qty,
                    unitPrice: price,
                    unit: row['Unit'] || 'U'
                    // totalPrice calculé auto par le model
                });

                createdItems.push(newItem);
                importedCount++;
            }

            // 5. ✅ UPDATE INVOICE TOTAL
            await recalculateInvoiceTotal(invoiceId);

            await logActivity({
                userId: context.user.id,
                action: 'IMPORT_EXCEL',
                project: projectId,
                details: `Import de ${importedCount} lignes dans la facture ${invoice.reference}`,
            });

            // Return items format for Frontend
            return createdItems.map(item => ({
                id: item._id,
                name: item.designation,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice
            }));
        }
    }
};