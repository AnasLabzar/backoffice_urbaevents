import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import DocumentModel, { IDocument } from './Document';

// --- SUB-SCHEMAS ---
const ProposalAvisSchema: Schema = new Schema({
  status: { type: String, enum: ['ACCEPTED', 'NOT_ACCEPTED'], required: true },
  reason: { type: String },
  givenBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  givenAt: { type: Date, default: Date.now }
});

export interface IProposalAvis extends Document {
  status: 'ACCEPTED' | 'NOT_ACCEPTED';
  reason?: string;
  givenBy: IUser['_id'];
  givenAt: Date;
}

type StageStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';
const StageSchema = new Schema({
  status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED'], default: 'TODO' },
  deadline: { type: Date, required: false },
  responsible: [{ type: String, required: true }],
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }]
});

// --- MAIN PROJECT INTERFACE ---
export interface IProject extends Document {
  projectCode: string;
  projectType: 'PUBLIC_TENDER' | 'CONFIRMED' | 'INTERNAL';
  createdBy: IUser['_id'];
  title: string;

  aiSummary?: {
    summary: string;
    thematic: string;
    risks: string[];
    generatedAt: Date;
  };

  object: string;
  referenceAO: string;
  technicalOfferRequired: boolean;
  location: string;
  submissionDeadline: Date;
  cautionRequestDate: Date;
  estimatedBudget: Number;
  marketEstimate: Number;
  cautionAmount: Number;

  preparationStatus: string;
  projectManagers: IUser['_id'][];
  assignedTeam: IUser['_id'][];
  generalStatus: 'IN_PROGRESS' | 'DONE' | 'CANCELED';
  currentStage: string;

  stages: any; // Simplified for brevity, kept structure in Schema
  feasibilityChecks: any;
  proposalAvis?: IProposalAvis;

  caution: {
    status: 'PENDING' | 'REQUESTED';
    requestedBy?: IUser['_id'];
    requestedAt?: Date;
  };

  team: {
    infographistes: IUser['_id'][];
    team3D: IUser['_id'][];
    coordinators: IUser['_id'][];
    pmJuniors: IUser['_id'][];
  };

  finalSubmission?: { type: Object, required: false };
  createdAt: Date;
  updatedAt: Date;
}

// --- MAIN PROJECT SCHEMA ---
const ProjectSchema: Schema = new Schema(
  {
    projectCode: { type: String, required: true, unique: true },
    projectType: { type: String, enum: ['PUBLIC_TENDER', 'CONFIRMED', 'INTERNAL'], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },

    aiSummary: {
      summary: String,
      thematic: String,
      risks: [String],
      generatedAt: Date
    },

    object: { type: String, required: true },
    referenceAO: { type: String },
    technicalOfferRequired: { type: Boolean, default: true },
    location: { type: String },
    submissionDeadline: { type: Date, required: true },
    cautionRequestDate: { type: Date },
    marketEstimate: { type: Number, default: 0 },
    estimatedBudget: { type: Number },
    cautionAmount: { type: Number },

    preparationStatus: {
      type: String,
      enum: ['DRAFT', 'TO_CONFIRM', 'TO_PREPARE', 'FEASIBILITY_PENDING', 'CAUTION_PENDING', 'IN_PRODUCTION', 'FINAL_REVIEW', 'DONE', 'NO'],
      default: 'DRAFT'
    },

    projectManagers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    assignedTeam: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    generalStatus: { type: String, enum: ['IN_PROGRESS', 'DONE', 'CANCELED'], default: 'IN_PROGRESS' },
    currentStage: { type: String, default: 'PROPOSAL' },

    stages: {
      administrative: { ...StageSchema.obj, responsible: { type: [String], default: ['PROPOSAL_MANAGER'] } },
      technical: { ...StageSchema.obj, responsible: { type: [String], default: ['PROPOSAL_MANAGER', 'PROJECT_MANAGER', 'COORDINATOR', 'DIRECTOR_EVENT', 'IT_MANAGER'] } },
      technicalOffer: { ...StageSchema.obj, responsible: { type: [String], default: ['PROJECT_MANAGER', 'COORDINATOR', 'DIRECTOR_EVENT', 'IT_MANAGER'] } },
      financialOffer: { ...StageSchema.obj, responsible: { type: [String], default: ['PROPOSAL_MANAGER', 'PROJECT_MANAGER', 'COORDINATOR'] } },
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

    proposalAvis: ProposalAvisSchema,

    caution: {
      status: { type: String, enum: ['PENDING', 'REQUESTED'], default: 'PENDING' },
      requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
      requestedAt: { type: Date, required: false }
    },

    team: {
      infographistes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      team3D: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      coordinators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      pmJuniors: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    },

    finalSubmission: { type: Object, required: false }
  },
  { timestamps: true }
);

// ✅ FIX: Explicit Type Casting
const ProjectModel: mongoose.Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default ProjectModel;