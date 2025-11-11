import mongoose, { Document, Schema } from 'mongoose';
import { IProject } from './Project'; // BDILNAH L-PROJECT
import { IDocument } from './Document'; // ZIDNA HADA
import { IUser } from './User';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Department = 'CREATIVE' | 'TECHNICAL_OFFICE' | 'WORKSHOP' | 'FIELD' | 'LOGISTICS'; // ZIDNA DEPARTMENT

export interface ITask extends Document {
  description: string;
  status: TaskStatus;
  project: IProject['_id']; // BDILNAH L-PROJECT
  assignedTo: IUser['_id'];
  department: Department; // ZIDNA HADA
  dueDate?: Date;
  // --- ZIDNA HADO L-JDAD ---
  v1Uploads: IDocument[]; // L-screenshots
  finalUpload?: IDocument; // L-fichier finali
}

const TaskSchema: Schema = new Schema(
  {
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'DONE'],
      default: 'TODO',
    },
    project: { // BDILNAH L-PROJECT
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: { // ZIDNA HADA
      type: String,
      enum: ['CREATIVE', 'TECHNICAL_OFFICE', 'WORKSHOP', 'FIELD', 'LOGISTICS'],
      required: true,
    },
    dueDate: {
      type: Date,
      required: false,
    },
    v1Uploads: [
      { type: Schema.Types.ObjectId, ref: 'Document' }
    ],
    finalUpload: {
      type: Schema.Types.ObjectId, ref: 'Document', required: false
    }
  },
  { timestamps: true }
);

export default mongoose.model<ITask>('Task', TaskSchema);