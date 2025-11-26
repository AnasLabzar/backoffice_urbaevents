"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = exports.ACTIONS = void 0;
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
// Smiyat dyal l-Actions (bach dima nktbo nafs l-7aja)
exports.ACTIONS = {
    // Dossier
    CREATE_DOSSIER: 'CREATE_DOSSIER',
    // Task
    CREATE_TASK: 'CREATE_TASK',
    UPDATE_TASK_STATUS: 'UPDATE_TASK_STATUS',
    // Auth
    USER_LOGIN: 'USER_LOGIN',
};
/**
 * Ghadi n3iyto l-had l-function bach nssjlo ay 7aja
 */
const logActivity = async (options) => {
    try {
        await ActivityLog_1.default.create({
            user: options.userId,
            action: options.action,
            project: options.project, // <-- L-BDIL 2: Smiynah "project"
            details: options.details,
        });
        console.log('✅ Activity Logged:', options.details); // N-affichiw f console bach nt2kdo
    }
    catch (error) {
        console.error('❌ Error logging activity:', error.message);
    }
};
exports.logActivity = logActivity;
