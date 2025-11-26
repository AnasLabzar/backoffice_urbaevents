"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEW_NOTIFICATION_EVENT = exports.TASK_UPDATED_EVENT = exports.NEW_TASK_EVENT = exports.pubsub = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
exports.pubsub = new graphql_subscriptions_1.PubSub();
// --- ZID HADI ---
// Hada howa smiya dyal "l-canal" li ghadi nssifto fih l-notification
exports.NEW_TASK_EVENT = 'TASK_CREATED';
exports.TASK_UPDATED_EVENT = 'TASK_UPDATED';
exports.NEW_NOTIFICATION_EVENT = 'NEW_NOTIFICATION'; // <-- ZID HADA
// ----------------
