"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = void 0;
const Notification_1 = __importStar(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const pubsub_1 = require("./pubsub"); // Ghadi n-zido NEW_NOTIFICATION_EVENT
const email_1 = require("./email");
const createNotification = async (input) => {
    try {
        const { userIds, level, message, link, project } = input;
        // 1. Khznha f DB
        const newNotif = new Notification_1.default({
            users: userIds || [],
            level,
            message,
            link,
            project: project || null,
            emailed: false,
        });
        await newNotif.save();
        // 2. Sifetha f Socket (BO Notification)
        if (userIds && userIds.length > 0) {
            // Sifetha l-kol user f l-lista
            userIds.forEach(userId => {
                pubsub_1.pubsub.publish(pubsub_1.NEW_NOTIFICATION_EVENT, {
                    newNotification: { ...newNotif.toObject(), isRead: false, userId: userId }
                });
            });
        }
        else if (level === Notification_1.NotificationLevel.INFO) {
            // Sifetha l-kolchi (Global INFO)
            pubsub_1.pubsub.publish(pubsub_1.NEW_NOTIFICATION_EVENT, {
                newNotification: { ...newNotif.toObject(), isRead: false, userId: 'GLOBAL' }
            });
        }
        // 3. Sifet Email (ila Urgent wla Deadline)
        if (level === Notification_1.NotificationLevel.URGENT || level === Notification_1.NotificationLevel.DEADLINE) {
            if (userIds && userIds.length > 0) {
                const users = await User_1.default.find({ _id: { $in: userIds } });
                for (const user of users) {
                    if (user.email) {
                        (0, email_1.sendEmail)({
                            to: user.email,
                            subject: `[${level}] Notification: ${message.substring(0, 20)}...`,
                            text: `Notification: ${message}\n\nLien: https://backoffice.urbagroupe.ma${link || ''}`,
                            html: `<p>${message}</p><a href="https://backoffice.urbagroupe.ma${link || ''}">Voir les détails</a>`,
                        });
                    }
                }
                // N-markiwaha blli tsifet email
                newNotif.emailed = true;
                await newNotif.save();
            }
        }
        return newNotif;
    }
    catch (error) {
        console.error('Error creating notification:', error);
    }
};
exports.createNotification = createNotification;
