import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem extends Document {
    invoice: mongoose.Types.ObjectId; // Link to Parent Invoice
    project?: mongoose.Types.ObjectId; // Optional: for easier filtering

    // Snapshot Data (Copied from Catalog or Custom)
    category: string;
    subCategory: string;
    designation: string;
    description?: string;
    unit: string;

    // Transactional Data
    quantity: number;
    unitPrice: number;
    totalPrice: number;

    createdAt: Date;
    updatedAt: Date;
}

const InvoiceItemSchema = new Schema({
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project' }, // Optional

    category: {
        type: String,
        required: true,
        enum: ['RESSOURCES_HUMAINES', 'AUDIO_VISUELLE', 'HEBERGEMENT', 'RESTAURATION', 'TRANSPORT', 'LOGISTIQUE', 'COMMUNICATION_DIGITAL', 'ANIMATION', 'AUTRE', 'AMENAGEMENT_ESPACE', 'STRUCTURE']
    },
    subCategory: { type: String, default: 'Divers' },
    designation: { type: String, required: true },
    description: { type: String },
    unit: { type: String, default: 'U' },

    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number, default: 0 }
}, { timestamps: true });

// Calcul automatique avant save
InvoiceItemSchema.pre<IInvoiceItem>('save', function (next) {
    this.totalPrice = this.quantity * this.unitPrice;
    next();
});

// ✅ FIX: Explicit Type Casting
const InvoiceItemModel: mongoose.Model<IInvoiceItem> = mongoose.models.InvoiceItem || mongoose.model<IInvoiceItem>('InvoiceItem', InvoiceItemSchema);

export default InvoiceItemModel;