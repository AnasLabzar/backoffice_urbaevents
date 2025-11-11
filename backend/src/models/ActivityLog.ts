import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IProject } from './Project'; // <-- BDILNAH L-PROJECT

// Interface: Chno ghadi nkhzno
export interface IActivityLog extends Document {
  user: IUser['_id']; // L-user li dar l-action
  action: string; // Smiya dyal l-action
  project?: IProject['_id']; // <-- BDILNAH L-PROJECT
  details: string; // Chi description bssita
}

// Schema: Kifach nkhznoh f MongoDB
const ActivityLogSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    project: { // <-- BDILNAH L-PROJECT
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: false,
    },
    details: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model<IActivityLog>(
  'ActivityLog',
  ActivityLogSchema
);