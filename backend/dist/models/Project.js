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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// --- L-SCHEMA DYAL L-AVIS ---
const ProposalAvisSchema = new mongoose_1.Schema({
    status: {
        type: String,
        enum: ['ACCEPTED', 'NOT_ACCEPTED'],
        required: true
    },
    reason: { type: String },
    givenBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    givenAt: { type: Date, default: Date.now }
});
const StageSchema = new mongoose_1.Schema({
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED'], default: 'TODO' },
    deadline: { type: Date, required: false },
    responsible: [{ type: String, required: true }],
    documents: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Document' }]
});
const ProjectSchema = new mongoose_1.Schema({
    projectCode: { type: String, required: true, unique: true },
    projectType: { type: String, enum: ['PUBLIC_TENDER', 'CONFIRMED', 'INTERNAL'], required: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    object: { type: String, required: true },
    referenceAO: { type: String },
    technicalOfferRequired: { type: Boolean, default: true },
    location: { type: String },
    submissionDeadline: { type: Date, required: true },
    cautionRequestDate: { type: Date },
    marketEstimate: { type: Number, default: 0 },
    estimatedBudget: { type: Number },
    cautionAmount: { type: Number },
    // ✅ AJOUTE CES DEUX LIGNES :
    preparationStatus: {
        type: String,
        enum: [
            'DRAFT', 'TO_CONFIRM', 'TO_PREPARE',
            'FEASIBILITY_PENDING', 'CAUTION_PENDING', 'IN_PRODUCTION',
            'FINAL_REVIEW', 'DONE', 'NO'
        ],
        default: 'DRAFT'
    },
    projectManagers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    assignedTeam: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    generalStatus: { type: String, enum: ['IN_PROGRESS', 'DONE', 'CANCELED'], default: 'IN_PROGRESS' },
    currentStage: { type: String, default: 'PROPOSAL' },
    stages: {
        administrative: { ...StageSchema.obj, responsible: { type: [String], default: ['PROPOSAL_MANAGER'] } },
        technical: {
            // Zidna l-possible PM l-jddad ila kan 3ndhom chi rôle f technical stage
            ...StageSchema.obj,
            responsible: {
                type: [String], default: ['PROPOSAL_MANAGER', 'PROJECT_MANAGER', 'ASSISTANT_PM', 'DIRECTOR_EVENT', 'IT_MANAGER']
            }
        },
        technicalOffer: { ...StageSchema.obj, responsible: { type: [String], default: ['PROJECT_MANAGER', 'DIRECTOR_EVENT', 'IT_MANAGER'] } },
        financialOffer: { ...StageSchema.obj, responsible: { type: [String], default: ['PROPOSAL_MANAGER', 'PROJECT_MANAGER'] } },
        printing: StageSchema,
        workshop: StageSchema,
        field: StageSchema,
        logistics: StageSchema,
    },
    feasibilityChecks: {
        administrative: { type: String, enum: ['PENDING', 'PASS', 'FAIL'], default: 'PENDING' },
        technical: { type: String, enum: ['PENDING', 'PASS', 'FAIL'], default: 'PENDING' },
        financial: { type: String, enum: ['PENDING', 'PASS', 'FAIL'], default: 'PENDING' }
    },
    // --- L-AVIS L-JDID ---
    proposalAvis: ProposalAvisSchema,
    caution: {
        status: { type: String, enum: ['PENDING', 'REQUESTED'], default: 'PENDING' },
        requestedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: false },
        requestedAt: { type: Date, required: false }
    },
    team: {
        infographistes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
        team3D: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
        assistants: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }]
    },
    finalSubmission: { type: Object, required: false }
}, { timestamps: true });
exports.default = mongoose_1.default.model('Project', ProjectSchema);
