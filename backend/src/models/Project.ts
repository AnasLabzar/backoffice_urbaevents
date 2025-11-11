import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import DocumentModel, { IDocument } from './Document';

// --- L-SCHEMA DYAL L-AVIS ---
const ProposalAvisSchema: Schema = new Schema({
  status: { 
    type: String, 
    enum: ['ACCEPTED', 'NOT_ACCEPTED'], 
    required: true 
  },
  reason: { type: String },
  givenBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  givenAt: { type: Date, default: Date.now }
});

// --- L-INTERFACE DYAL L-AVIS ---
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

// --- L-Status dyal l-Workflow ---
type PreparationStatus =
  | 'DRAFT'
  | 'TO_CONFIRM'
  | 'TO_PREPARE'
  | 'FEASIBILITY_PENDING'
  | 'CAUTION_PENDING'
  | 'IN_PRODUCTION'
  | 'FINAL_REVIEW'
  | 'DONE'
  | 'NO';

export interface IProject extends Document {
  // 1. Type & ID
  projectCode: string;
  projectType: 'PUBLIC_TENDER' | 'CONFIRMED' | 'INTERNAL';
  createdBy: IUser['_id'];

  // 2. Proposal Details (Mn 3nd "Yassmin")
  title: string;
  object: string;
  referenceAO: string;
  technicalOfferRequired: boolean;
  location: string;
  submissionDeadline: Date;
  cautionRequestDate: Date;
  estimatedBudget: number;
  cautionAmount: number;

  // 3. Management Details (Mn 3nd l-Admin)
  preparationStatus: PreparationStatus;
  projectManagers: IUser['_id'][];
  assignedTeam: IUser['_id'][];

  // 4. Workflow & Status
  generalStatus: 'IN_PROGRESS' | 'DONE' | 'CANCELED';
  currentStage: string;

  stages: {
    administrative: { status: StageStatus, responsible: string[], documents: IDocument[] };
    technical: { status: StageStatus, responsible: string[], documents: IDocument[] };
    technicalOffer: { status: StageStatus, responsible: string[], documents: IDocument[] };
    financialOffer: { status: StageStatus, responsible: string[], documents: IDocument[] };
    printing: { status: StageStatus };
    workshop: { status: StageStatus };
    field: { status: StageStatus };
    logistics: { status: StageStatus };
  };

  // L-Checks dyal l-Admin
  feasibilityChecks: {
    administrative: 'PENDING' | 'PASS' | 'FAIL';
    technical: 'PENDING' | 'PASS' | 'FAIL';
    financial: 'PENDING' | 'PASS' | 'FAIL';
  };

  // --- L-AVIS L-JDID ---
  proposalAvis?: IProposalAvis;

  // L-Khdma dyal Safia (Finance)
  caution: {
    status: 'PENDING' | 'REQUESTED';
    requestedBy?: IUser['_id'];
    requestedAt?: Date;
  };

  // L-Équipe li 3zl l-CP
  team: {
    infographistes: IUser['_id'][];
    team3D: IUser['_id'][];
    assistants: IUser['_id'][];
  };

  // Fichiers l-finaliyin
  finalSubmission?: { type: Object, required: false }
}

const ProjectSchema: Schema = new Schema(
  {
    projectCode: { type: String, required: true, unique: true },
    projectType: { type: String, enum: ['PUBLIC_TENDER', 'CONFIRMED', 'INTERNAL'], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    object: { type: String, required: true },
    referenceAO: { type: String },
    technicalOfferRequired: { type: Boolean, default: true },
    location: { type: String },
    submissionDeadline: { type: Date, required: true },
    cautionRequestDate: { type: Date },
    estimatedBudget: { type: Number },
    cautionAmount: { type: Number },

    preparationStatus: {
      type: String,
      enum: [
        'DRAFT', 'TO_CONFIRM', 'TO_PREPARE',
        'FEASIBILITY_PENDING', 'CAUTION_PENDING', 'IN_PRODUCTION',
        'FINAL_REVIEW', 'DONE', 'NO'
      ],
      default: 'DRAFT'
    },

    projectManagers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    assignedTeam: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    generalStatus: { type: String, enum: ['IN_PROGRESS', 'DONE', 'CANCELED'], default: 'IN_PROGRESS' },
    currentStage: { type: String, default: 'PROPOSAL' },

    stages: {
      administrative: { ...StageSchema.obj, responsible: { type: [String], default: ['PROPOSAL_MANAGER'] } },
      technical: { ...StageSchema.obj, responsible: { type: [String], default: ['PROPOSAL_MANAGER', 'PROJECT_MANAGER', 'ASSISTANT_PM'] } },
      technicalOffer: { ...StageSchema.obj, responsible: { type: [String], default: ['PROJECT_MANAGER'] } },
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
    proposalAvis: ProposalAvisSchema, // <-- MAINTENANT IL EST DÉFINI

    caution: {
      status: { type: String, enum: ['PENDING', 'REQUESTED'], default: 'PENDING' },
      requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
      requestedAt: { type: Date, required: false }
    },

    team: {
      infographistes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      team3D: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      assistants: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    },

    finalSubmission: { type: Object, required: false }
  },
  { timestamps: true }
);

export default mongoose.model<IProject>('Project', ProjectSchema);