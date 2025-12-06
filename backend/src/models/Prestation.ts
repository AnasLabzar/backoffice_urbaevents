import mongoose, { Document, Schema } from 'mongoose';

export interface IPrestation extends Document {
  project?: mongoose.Types.ObjectId; // Optional: Si lié à un projet spécifique
  
  // Catalog Data
  category: string; 
  subCategory: string; 
  designation: string; 
  description?: string;
  unit: string;
  unitPrice: number; // Prix Standard (Reference)
  supplier?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const PrestationSchema: Schema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: false },
    // Invoice link REMOVED (Catalog shouldn't know about Invoices)
    
    category: { 
      type: String, 
      required: true,
      enum: [
        'RESSOURCES_HUMAINES', 'AUDIO_VISUELLE', 'HEBERGEMENT', 'RESTAURATION', 
        'TRANSPORT', 'LOGISTIQUE', 'COMMUNICATION_DIGITAL', 'ANIMATION', 
        'AUTRE', 'AMENAGEMENT_ESPACE', 'STRUCTURE'
      ] 
    },
    subCategory: { type: String, default: 'Divers' }, 
    
    designation: { type: String, required: true },
    description: { type: String },
    
    unit: { type: String, default: 'U' },
    unitPrice: { type: Number, required: true, default: 0 }, // Prix catalogue
    
    supplier: { type: String }
  },
  { timestamps: true }
);

// ✅ FIX: Explicit Type Casting
const PrestationModel: mongoose.Model<IPrestation> = mongoose.models.Prestation || mongoose.model<IPrestation>('Prestation', PrestationSchema);

export default PrestationModel;