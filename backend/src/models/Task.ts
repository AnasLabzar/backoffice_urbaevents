import mongoose, { Document, Schema } from 'mongoose';
import { IProject } from './Project';
import { IDocument } from './Document';
import { IUser } from './User';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
// Add Priority Type
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Department = 'CREATIVE' | 'TECHNICAL_OFFICE' | 'WORKSHOP' | 'FIELD' | 'LOGISTICS' | 'PROJECT_MANAGEMENT';

export interface ITask extends Document {
  description: string;
  status: TaskStatus;
  priority: TaskPriority; // <--- ADD THIS
  project: IProject['_id'];
  assignedTo: IUser['_id'];
  department: Department;
  dueDate?: Date;
  v1Uploads: IDocument[];
  finalUpload?: IDocument;
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
    // --- ADD THIS SECTION ---
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
    // ------------------------
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: {
      type: String,
      enum: ['CREATIVE', 'TECHNICAL_OFFICE', 'WORKSHOP', 'FIELD', 'LOGISTICS', 'PROJECT_MANAGEMENT'],
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