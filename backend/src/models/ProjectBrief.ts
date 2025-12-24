import mongoose, { Document, Schema } from 'mongoose';
import { IProject } from './Project';

interface ISpace {
    name: string;
    surface: number;
    capacity: number;
    type: string;
}

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
    spaces: ISpace[];
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
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
}


const SpaceSchema = new Schema({
    name: { type: String },
    surface: { type: Number },
    capacity: { type: Number },
    type: { type: String, default: 'RECEPTION' } 
}, { _id: false }); // _id: false est optionnel, mettez true si vous voulez un ID par zone


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
        eventGoal: [{ type: String }], 
        targetAudience: [{ type: String }],
        mainObjective: { type: String },
        subObjectives: [{ type: String }],
        history: { type: String },
        themeConcept: { type: String },
        themeDeclination: { type: String },
        spaces: [SpaceSchema],
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
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
);

// ✅ FIX: Explicit Type Casting
const ProjectBriefModel: mongoose.Model<IProjectBrief> = mongoose.models.ProjectBrief || mongoose.model<IProjectBrief>('ProjectBrief', ProjectBriefSchema);

export default ProjectBriefModel;