"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationLevel = void 0;
const mongoose_1 = require("mongoose");
// Hado homa l-levels li tlabti
var NotificationLevel;
(function (NotificationLevel) {
    NotificationLevel["INFO"] = "INFO";
    NotificationLevel["STANDARD"] = "STANDARD";
    NotificationLevel["IMPORTANT"] = "IMPORTANT";
    NotificationLevel["URGENT"] = "URGENT";
    NotificationLevel["DEADLINE"] = "DEADLINE"; // Deadline qrib (ex: +1j)
})(NotificationLevel || (exports.NotificationLevel = NotificationLevel = {}));
const NotificationSchema = new mongoose_1.Schema({
    users: [{
            type: mongoose_1.Schema.Types.ObjectId,
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
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
            default: [],
        }],
    emailed: {
        type: Boolean,
        default: false,
    },
    project: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Project',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
exports.default = (0, mongoose_1.model)('Notification', NotificationSchema);
