import Project from '../../models/Project';
import { aiService } from '../../../services/aiService';

export const aiResolver = {
    Mutation: {
        generateCPSSummary: async (_: any, { projectId }: { projectId: string }) => {
            console.log(`🤖 Force Update AI pour le projet: ${projectId}`);
            try {
                const project = await Project.findById(projectId);
                if (!project) throw new Error("Projet introuvable");

                const analysis = await aiService.analyzeCPS(
                    project.title || "Inconnu",
                    project.object || "Sans objet"
                );

                // Update Project
                project.aiSummary = {
                    summary: analysis.summary,
                    thematic: analysis.thematic,
                    risks: analysis.risks,
                    generatedAt: new Date()
                };

                await project.save();
                console.log("✅ Projet mis à jour avec succès !");
                return project;

            } catch (error) {
                console.error("❌ Erreur Resolver:", error);
                throw new Error("Impossible de générer le résumé");
            }
        }
    }
};