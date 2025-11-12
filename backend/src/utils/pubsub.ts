import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();

// --- ZID HADI ---
// Hada howa smiya dyal "l-canal" li ghadi nssifto fih l-notification
export const NEW_TASK_EVENT = 'TASK_CREATED';
export const TASK_UPDATED_EVENT = 'TASK_UPDATED';
export const NEW_NOTIFICATION_EVENT = 'NEW_NOTIFICATION'; // <-- ZID HADA
// ----------------