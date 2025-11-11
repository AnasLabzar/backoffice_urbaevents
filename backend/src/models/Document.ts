import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';


// Hada howa l-model dyal ay fichier f l-système
export interface IDocument extends Document {
  fileName: string; // "CPS", "RC", "CP_ESTIMATE", "TASK_V1", "ASSET"
  fileUrl: string; // uploads/project_id/file.pdf
  originalFileName: string; // Smiya l-7qiqia
  uploadedBy: IUser['_id'];
  createdAt: Date;
}

const DocumentSchema: Schema = new Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  originalFileName: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IDocument>('Document', DocumentSchema);