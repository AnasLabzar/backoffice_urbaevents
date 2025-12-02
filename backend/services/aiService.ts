import dotenv from "dotenv";
// Ma bqinach mhtajin fs wla path wla pdf-parse hit maghadich n9raw l-fichier
// const pdf = require("pdf-parse"); <--- MSAHNAH

dotenv.config();

const API_KEY = "AIzaSyDA6MvQ1Y-_y_F1_3PRA9ek2LkSFLxlrCU"; 

export const aiService = {

    /**
     * Helper HTTP Direct (Gemini Flash v1beta)
     */
    async callGeminiRaw(prompt: string) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        
        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`⚠️ Gemini API Error (${response.status}):`, errText);
                return null;
            }

            const data: any = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            
            return text || null;

        } catch (error) {
            console.error("❌ ERREUR NETWORK GEMINI:", error);
            return null;
        }
    },

    /**
     * NOUVELLE VERSION: Ignite le PDF, utilise Titre + Objet
     * On garde le nom "analyzeCPSPDF" pour ne pas casser le code existant, 
     * mais on ajoute les arguments title et object.
     */
    async analyzeCPSPDF(filePath: string, title: string, object: string) {
        console.log(`🤖 Analyse IA déclenchée pour: ${title}`);
        
        // Note: On n'utilise plus filePath ni fs.readFileSync
        // On passe directement à l'analyse contextuelle

        try {
            const prompt = `
            Agis comme un expert en Gestion de Projets et Marchés Publics (BTP, Événementiel, Services).
            Analyse ce projet sur la base de son intitulé et son objet :

            👉 TITRE DU PROJET : "${title}"
            👉 CLIENT / OBJET : "${object}"

            Tâche :
            1. Résumé : Rédige un résumé exécutif professionnel et concis (max 3 phrases) qui explique la nature du projet.
            2. Thématique : Déduis la catégorie principale (ex: Travaux BTP, Aménagement, Événementiel, Informatique, Gardiennage, etc.).
            3. Risques : Liste 3 points de vigilance ou risques standards pour ce type de prestation.

            Réponds UNIQUEMENT en format JSON valide (sans markdown) :
            { 
              "summary": "...", 
              "thematic": "...", 
              "risks": ["...", "...", "..."] 
            }
            `;

            console.log("📤 Envoi à Gemini (Contextuel)...");
            const rawText = await this.callGeminiRaw(prompt);

            if (!rawText) return this.defaultResponse("Pas de réponse de l'IA");

            return this.cleanJson(rawText);

        } catch (error) {
            console.error("❌ ERREUR SERVICE IA:", error);
            return this.defaultResponse("Erreur interne");
        }
    },

    /**
     * Garde celle-ci pour le test manuel (identique à l'autre maintenant)
     */
    async analyzeCPS(title: string, object: string) {
        return this.analyzeCPSPDF("", title, object);
    },

    cleanJson(text: string) {
        try {
            let clean = text.replace(/```json|```/g, "").trim();
            const firstBrace = clean.indexOf('{');
            const lastBrace = clean.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                clean = clean.substring(firstBrace, lastBrace + 1);
            }
            return JSON.parse(clean);
        } catch (e) {
            return this.defaultResponse("Erreur Parsing JSON");
        }
    },

    defaultResponse(reason: string) {
        return {
            summary: `Analyse indisponible (${reason}).`,
            thematic: "Non défini",
            risks: []
        };
    }
};