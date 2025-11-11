import ActivityLog from '../models/ActivityLog';
import { IProject } from '../models/Project';
import { IUser } from '../models/User';

// Smiyat dyal l-Actions (bach dima nktbo nafs l-7aja)
export const ACTIONS = {
  // Dossier
  CREATE_DOSSIER: 'CREATE_DOSSIER',
  // Task
  CREATE_TASK: 'CREATE_TASK',
  UPDATE_TASK_STATUS: 'UPDATE_TASK_STATUS',
  // Auth
  USER_LOGIN: 'USER_LOGIN',
};

// Interface dyal l-Options
interface LogOptions {
  userId: IUser['_id'];
  action: string;
  project?: IProject['_id']; // <-- L-BDIL 1: Smiynah "project"
  details: string;
}

/**
 * Ghadi n3iyto l-had l-function bach nssjlo ay 7aja
 */
export const logActivity = async (options: LogOptions) => {
  try {
    await ActivityLog.create({
      user: options.userId,
      action: options.action,
      project: options.project, // <-- L-BDIL 2: Smiynah "project"
      details: options.details,
    });
    console.log('✅ Activity Logged:', options.details); // N-affichiw f console bach nt2kdo
  } catch (error) {
    console.error('❌ Error logging activity:', error.message);
  }
};