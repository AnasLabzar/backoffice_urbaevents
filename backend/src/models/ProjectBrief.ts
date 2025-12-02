import mongoose, { Document, Schema } from 'mongoose';
import { IProject } from './Project';

export interface IProjectBrief extends Document {
    project: IProject['_id'];

    // Données Client
    clientName: string;
    clientNature: string;

    // Données Générales
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

    // Public Cible & Objectifs
    eventGoal: string; // But de l'événement
    targetAudience: string[]; // Cibles 1, 2, 3...
    mainObjective: string;
    subObjectives: string[];
    history: string; // Historique événements même nature
    themeConcept: string;
    themeDeclination: string;

    // Contraintes
    constraints: string;

    // Prestations Attendues (Description textuelle du besoin)
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

    // Plan d'implantation
    spaces: string[]; // Espace 1, Espace 2...

    updatedBy: string; // User ID
    createdAt: Date;
    updatedAt: Date;
}

const ProjectBriefSchema: Schema = new Schema(
    {
        project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },

        // Client
        clientName: { type: String },
        clientNature: { type: String },

        // Général
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

        // Stratégie
        eventGoal: { type: String },
        targetAudience: [{ type: String }],
        mainObjective: { type: String },
        subObjectives: [{ type: String }],
        history: { type: String },
        themeConcept: { type: String },
        themeDeclination: { type: String },

        // Contraintes
        constraints: { type: String },

        // Besoins (Texte libre pour décrire le besoin avant chiffrage)
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

export default mongoose.model<IProjectBrief>('ProjectBrief', ProjectBriefSchema);