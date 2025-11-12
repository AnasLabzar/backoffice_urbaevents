import { Schema, model, Document, Types } from 'mongoose';

// Hado homa l-levels li tlabti
export enum NotificationLevel {
  INFO = 'INFO', // Info 3amma (l-kolchi)
  STANDARD = 'STANDARD', // Notif 3adia (ex: task assigned)
  IMPORTANT = 'IMPORTANT', // Mohimma (ex: status changed)
  URGENT = 'URGENT', // Urgent (ex: admin message)
  DEADLINE = 'DEADLINE' // Deadline qrib (ex: +1j)
}

export interface INotification extends Document {
  users: Types.ObjectId[]; // L-User li ghadi tchofha. Ila INFO, tkon khawia
  level: NotificationLevel;
  message: string;
  link?: string; // Link l-l-projet wla l-task
  readBy: Types.ObjectId[]; // Lista dyal li qrawha
  emailed: boolean; // Wach siftna email (bach ma n-spammiwch)
  project?: Types.ObjectId;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  users: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  level: {
    type: String,
    enum: Object.values(NotificationLevel),
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  link: String,
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  emailed: {
    type: Boolean,
    default: false,
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default model<INotification>('Notification', NotificationSchema);