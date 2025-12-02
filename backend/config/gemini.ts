import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// On utilise require pour pdf-parse
const pdf = require("pdf-parse");

dotenv.config();

// ✅ HADI HIYA L-CLÉ DYAL GOOGLE (Machi OpenAI)
// Jbtha mn l-messages 9dam dyalk
const API_KEY = "AIzaSyDA6MvQ1Y-_y_F1_3PRA9ek2LkSFLxlrCU"; 

export const aiService = {

    /**
     * Fonctions Helper: Appelle Gemini via HTTP Direct (Bypass Library Issues)
     */
    async callGeminiRaw(prompt: string) {
        // ✅ URL MAGIC: On utilise 'v1beta' avec 'gemini-1.5-flash'
        // Hada howa l-endpoint l-fabor li kaykhdm 3nd kolchi
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        
        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
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
            
            // Extraction
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) throw new Error("Réponse vide de Gemini");
            
            return text;
b
        } catch (error) {
            console.error("❌ ERREUR NETWORK GEMINI:", error);
            return null;
        }
    },

    /**
     * MÉTHODE 1 : Analyse PDF
     */
    async analyzeCPSPDF(filePath: string) {
        console.log(`📂 Lecture du fichier PDF: ${filePath}`);

        try {
            if (!fs.existsSync(filePath)) {
                return this.defaultResponse("Fichier introuvable");
            }
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdf(dataBuffer);
            let extractedText = pdfData.text;

            if (!extractedText || extractedText.trim().length === 0) {
                 return this.defaultResponse("PDF vide ou image scannée");
            }

            // Gemini 1.5 Flash supporte 1 Million de tokens !
            // On peut envoyer 100k caractères sans problème.
            if (extractedText.length > 100000) {
                extractedText = extractedText.substring(0, 100000) + "...[TRONQUÉ]";
            }

            console.log("📝 Texte extrait (longueur):", extractedText.length);

            const prompt = `
            Tu es un expert BTP. Analyse ce CPS :
            """
            ${extractedText}
            """
            
            Tâche : Résumé (max 3 phrases), Thématique, 3 Risques.
            Réponds UNIQUEMENT en JSON valide au format :
            { "summary": "...", "thematic": "...", "risks": ["...", "..."] }
            `;

            console.log("📤 Envoi à Gemini Flash (HTTP)...");
            const rawText = await this.callGeminiRaw(prompt);

            if (!rawText) return this.defaultResponse("Pas de réponse de l'IA");

            return this.cleanJson(rawText);

        } catch (error) {
            console.error("❌ ERREUR SERVICE PDF:", error);
            return this.defaultResponse("Erreur interne");
        }
    },

    /**
     * MÉTHODE 2 : Analyse Texte (Titre/Objet)
     */
    async analyzeCPS(title: string, object: string) {
        try {
            const prompt = `
            Expert BTP. Analyse :
            TITRE: ${title}
            OBJET: ${object}

            Format JSON attendu :
            { "summary": "...", "thematic": "...", "risks": [] }
            `;

            console.log("📤 Envoi à Gemini Flash (HTTP)...");
            const rawText = await this.callGeminiRaw(prompt);

            if (!rawText) return this.defaultResponse("Pas de réponse de l'IA");

            return this.cleanJson(rawText);

        } catch (error) {
            console.error("❌ ERREUR SERVICE TEXTE:", error);
            return this.defaultResponse("Erreur interne");
        }
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