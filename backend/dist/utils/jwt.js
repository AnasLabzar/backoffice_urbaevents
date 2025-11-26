"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'MySuperSecretKey123';
const JWT_EXPIRES_IN = '7d';
// Function katssawb l-token (Déjà 3ndk)
const generateToken = (user) => {
    // ... (nafs l-code, matbdl walo)
    const tokenPayload = {
        id: user._id,
        email: user.email,
        role: user.role,
    };
    const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    return token;
};
exports.generateToken = generateToken;
// Function kat-verifi l-token
const verifyToken = (req) => {
    const authorizationHeader = req.headers.authorization || '';
    if (!authorizationHeader) {
        return { user: null };
    }
    // L-Token kayji bhal: "Bearer eyJhbGciOi..."
    const token = authorizationHeader.split('Bearer ')[1];
    if (!token) {
        return { user: null };
    }
    try {
        // 7ll l-token w rj3 l-ma3lomat dyal l-user
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return { user: decoded };
    }
    catch (error) {
        // Ila l-token mzyan (expired wla ghalet)
        return { user: null };
    }
};
exports.verifyToken = verifyToken;
