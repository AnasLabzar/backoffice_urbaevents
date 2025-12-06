import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
    project: mongoose.Types.ObjectId;
    type: 'ESTIMATION' | 'DEVIS' | 'FACTURE' | 'BON_COMMANDE';
    reference: string;
    status: 'DRAFT' | 'VALIDATED' | 'SENT' | 'PAID' | 'CANCELLED';
    totalAmount: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema(
    {
        project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
        type: {
            type: String,
            enum: ['ESTIMATION', 'DEVIS', 'FACTURE', 'BON_COMMANDE'],
            required: true
        },
        reference: { type: String },
        status: {
            type: String,
            enum: ['DRAFT', 'VALIDATED', 'SENT', 'PAID', 'CANCELLED'],
            default: 'DRAFT'
        },
        // IMPORTANT: Items are now in a separate collection (InvoiceItem)
        totalAmount: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
);

// ✅ FIX: Explicit Type Casting to avoid "Not Callable" error
const InvoiceModel: mongoose.Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default InvoiceModel;