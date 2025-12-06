import mongoose, { Document, Schema } from 'mongoose';
import { IProject } from './Project';

export interface IProjectBrief extends Document {
    project: IProject['_id'];
    clientName: string;
    clientNature: string;
    projectName: string;
    eventFormat: string;
    toneStyle: string;
    location: string;
    locationType: 'OUTDOOR' | 'INDOOR' | 'CHAPITEAU' | 'STAND' | 'AUTRE';
    visitorsCount: number;
    startDate: Date;
    endDate: Date;
    durationDays: number;
    estimatedBudget: number;
    eventGoal: string;
    targetAudience: string[];
    mainObjective: string;
    subObjectives: string[];
    history: string;
    themeConcept: string;
    themeDeclination: string;
    constraints: string;
    requirements: {
        logistics?: string;
        accommodation?: string;
        catering?: string;
        audiovisual?: string;
        transport?: string;
        digital?: string;
        hr?: string;
        animation?: string;
    };
    spaces: string[];
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectBriefSchema: Schema = new Schema(
    {
        project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
        clientName: { type: String },
        clientNature: { type: String },
        projectName: { type: String },
        eventFormat: { type: String },
        toneStyle: { type: String },
        location: { type: String },
        locationType: { type: String },
        visitorsCount: { type: Number },
        startDate: { type: Date },
        endDate: { type: Date },
        durationDays: { type: Number },
        estimatedBudget: { type: Number },
        eventGoal: { type: String },
        targetAudience: [{ type: String }],
        mainObjective: { type: String },
        subObjectives: [{ type: String }],
        history: { type: String },
        themeConcept: { type: String },
        themeDeclination: { type: String },
        constraints: { type: String },
        requirements: {
            logistics: String,
            accommodation: String,
            catering: String,
            audiovisual: String,
            transport: String,
            digital: String,
            hr: String,
            animation: String
        },
        spaces: [{ type: String }],
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
);

// ✅ FIX: Explicit Type Casting
const ProjectBriefModel: mongoose.Model<IProjectBrief> = mongoose.models.ProjectBrief || mongoose.model<IProjectBrief>('ProjectBrief', ProjectBriefSchema);

export default ProjectBriefModel;