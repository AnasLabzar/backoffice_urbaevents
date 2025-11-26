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
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Schema: Kaychrah l-Mongoose kifach ykhzn l-User
const UserSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true, // Kol user 3ndo email dyalo
        lowercase: true, // Dima email b 7rof sghar
    },
    password: {
        type: String,
        required: true,
        select: false, // <-- MOHIM: Mli njib user mn database, majibch l-password m3ah
    },
    role: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Role', // Hna fin kanrbto l-User m3a l-Model 'Role'
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
// ---- HASHING L-PASSWORD (Otomatik) ----
// Qbl maytssjl ay user jdid (pre-save hook)
UserSchema.pre('save', async function (next) {
    // Kan-hashiw ghir ila l-password t-modifa (wla jdid)
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    try {
        // N-generiw "salt" (chwiya dyal l-mel7) bach nchffro
        const salt = await bcryptjs_1.default.genSalt(10);
        // N-hashiw l-password
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Exporti l-model
exports.default = mongoose_1.default.model('User', UserSchema);
