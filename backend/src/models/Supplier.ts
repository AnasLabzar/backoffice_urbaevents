import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface ISupplier extends Document {
    name: string;
    category: 'SON' | 'LUMIERE' | 'VIDEO' | 'STRUCTURE' | 'MOBILIER' | 'LOGISTIC' | 'AUTRE';
    contactName: string;
    email: string;
    phone: string;
    address?: string;
    createdBy: IUser['_id'];
    createdAt: Date;
    updatedAt: Date;
}

const SupplierSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        category: {
            type: String,
            enum: ['SON', 'LUMIERE', 'VIDEO', 'STRUCTURE', 'MOBILIER', 'LOGISTIC', 'AUTRE'],
            default: 'AUTRE'
        },
        contactName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);