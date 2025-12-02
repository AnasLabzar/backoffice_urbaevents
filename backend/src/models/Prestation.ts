import mongoose, { Document, Schema } from 'mongoose';
import { IProject } from './Project';

export interface IPrestation extends Document {
    project: IProject['_id'];
    name: string; // Ex: "Location Écran LED"
    description?: string; // Ex: "5m x 3m P3.9"
    category:
    | 'RESSOURCES_HUMAINES'
    | 'AUDIO_VISUELLE'
    | 'HEBERGEMENT'
    | 'RESTAURATION'
    | 'TRANSPORT'
    | 'LOGISTIQUE'
    | 'COMMUNICATION_DIGITAL'
    | 'ANIMATION'
    | 'AUTRE';

    quantity: number;
    unitPrice: number;
    totalPrice: number; // Calculated
    status: 'PENDING' | 'VALIDATED' | 'COMPLETED' | 'CANCELLED';

    createdAt: Date;
    updatedAt: Date;
}

const PrestationSchema: Schema = new Schema(
    {
        project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
        name: { type: String, required: true },
        description: { type: String },
        category: {
            type: String,
            enum: [
                'RESSOURCES_HUMAINES',
                'AUDIO_VISUELLE',
                'HEBERGEMENT',
                'RESTAURATION',
                'TRANSPORT',
                'LOGISTIQUE',
                'COMMUNICATION_DIGITAL',
                'ANIMATION',
                'AUTRE'
            ],
            default: 'AUTRE',
            required: true
        },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        // On peut stocker le total ou le calculer à la volée. Stockons-le pour faciliter les requêtes.
        totalPrice: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['PENDING', 'VALIDATED', 'COMPLETED', 'CANCELLED'],
            default: 'PENDING'
        }
    },
    { timestamps: true }
);

// Petit Hook pour calculer le total avant de sauvegarder
PrestationSchema.pre<IPrestation>('save', function (next) {
    this.totalPrice = this.quantity * this.unitPrice;
    next();
});

export default mongoose.model<IPrestation>('Prestation', PrestationSchema);