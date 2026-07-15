import fs from 'fs';
import path from 'path';
const pdfParseLib = require('pdf-parse');
const pdfParse = typeof pdfParseLib === 'function' ? pdfParseLib : (pdfParseLib.PDFParse || pdfParseLib.default || pdfParseLib);
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import mammoth from 'mammoth';

// Configurer le client OpenAI pour utiliser OpenRouter (Garden of Tokens)
const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key',
});

// Modèles de secours (Garden of Tokens) pour garantir la continuité du service
const AI_MODELS_FALLBACK_LIST = [
    process.env.AI_MODEL || 'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-chat:free',
    'mistralai/mistral-7b-instruct:free'
];

export interface ExtractedPrestation {
    designation: string;
    category: string;
    subCategory: string;
    quantity: number;
    unitPrice: number;
    description: string;
}

export interface ExtractedTasksResult {
    tasks: {
        title: string;
        description: string;
        department: string;
        priority: string;
    }[];
    creativeSummary: string;
    projectBrief?: any;
}

/**
 * PHASE 1: Analyse le fichier CPS (PDF) et extrait uniquement les prestations.
 */
export const analyzeCPSForPrestations = async (fileUrl: string): Promise<ExtractedPrestation[]> => {
    try {
        // 1. Lire le fichier PDF localement
        let relativePath = fileUrl;
        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
            try {
                const urlObj = new URL(fileUrl);
                relativePath = urlObj.pathname;
            } catch (e) {
                // Ignore invalid URL
            }
        }
        const cleanFileUrl = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
        const filePath = path.join(__dirname, '../../', cleanFileUrl);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const systemPrompt = `
Vous êtes un expert en gestion de projets événementiels et en analyse de Cahiers des Charges (CPS).
Votre tâche est d'analyser le document fourni (issu d'un CPS) et d'extraire UNIQUEMENT la liste des prestations au format JSON EXACT.

"prestations" : Les services ou livrables demandés.
   - designation: string (Titre court de la prestation)
   - category: string (L'une des valeurs EXACTES suivantes : 'RESSOURCES_HUMAINES', 'AUDIO_VISUELLE', 'HEBERGEMENT', 'RESTAURATION', 'TRANSPORT', 'LOGISTIQUE', 'COMMUNICATION_DIGITAL', 'ANIMATION', 'AUTRE', 'AMENAGEMENT_ESPACE', 'STRUCTURE')
   - subCategory: string (par défaut 'Divers')
   - quantity: number (Quantité estimée ou mentionnée, par défaut 1)
   - unitPrice: number (Estimation du prix unitaire, ou 0 si inconnu)
   - description: string (Détail de la prestation)

RETOURNEZ UNIQUEMENT LE JSON VALIDE SANS MARKDOWN NI TEXTE AVANT OU APRES.
Format attendu:
{
  "prestations": [...]
}
        `;

        const fileExtension = path.extname(filePath).toLowerCase();
        let content = '';

        if (fileExtension === '.docx') {
            console.log("[AI] Fichier DOCX détecté, extraction locale via Mammoth...");
            const result = await mammoth.extractRawText({ path: filePath });
            const docxText = result.value;
            
            if (!docxText || docxText.trim().length < 50) {
                throw new Error("Le document DOCX semble être vide.");
            }

            const truncatedText = docxText.slice(0, 150000);
            
            if (process.env.GEMINI_API_KEY) {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const aiResult = await model.generateContent([
                    systemPrompt,
                    `Texte du CPS :\n\n${truncatedText}`
                ]);
                content = aiResult.response.text();
            } else {
                content = await callAIWithFallback(systemPrompt, `Texte du CPS :\n\n${truncatedText}`);
            }
        } else if (process.env.GEMINI_API_KEY) {
            console.log("[AI] Utilisation de l'API Native Gemini avec FileManager pour supporter le PDF scanné...");
            const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            
            // Upload file to Google
            const uploadResult = await fileManager.uploadFile(filePath, {
                mimeType: "application/pdf",
                displayName: "CPS Document",
            });
            console.log(`[AI] Fichier uploadé vers Gemini avec succès : ${uploadResult.file.uri}`);

            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent([
                    systemPrompt,
                    {
                        fileData: {
                            mimeType: uploadResult.file.mimeType,
                            fileUri: uploadResult.file.uri
                        }
                    }
                ]);
                
                content = result.response.text();
            } catch (apiError: any) {
                console.error("[AI] Erreur API Gemini :", apiError.message);
                if (apiError.message.includes("has no pages")) {
                    throw new Error("Le document PDF semble être vide, corrompu, ou ne contient aucune page lisible. Veuillez uploader un PDF valide.");
                }
                throw apiError;
            } finally {
                // Cleanup file from Google servers
                await fileManager.deleteFile(uploadResult.file.name).catch(() => {});
            }
        } else {
            console.log("[AI] Utilisation du Fallback local. Tentative de lecture de texte natif...");
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            const textContent = pdfData.text;

            if (!textContent || textContent.trim().length < 50) {
                throw new Error("Le PDF semble être scanné (images) ou vide. Veuillez utiliser la clé API Gemini ou uploader un PDF texte natif.");
            }

            const truncatedText = textContent.slice(0, 150000);
            content = await callAIWithFallback(systemPrompt, `Texte du CPS :\n\n${truncatedText}`);
        }

        // Clean markdown JSON blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('\`\`\`json')) cleanContent = cleanContent.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
        else if (cleanContent.startsWith('\`\`\`')) cleanContent = cleanContent.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');

        const parsedData = JSON.parse(cleanContent);
        return parsedData.prestations || [];

    } catch (error: any) {
        console.error("[AI Analysis Error]:", error);
        throw new Error(`Erreur lors de l'analyse IA : ${error.message}`);
    }
};

/**
 * PHASE 2: Génère les tâches créatives et le résumé à partir des prestations validées.
 */
export const generateTasksFromPrestations = async (prestations: any[]): Promise<ExtractedTasksResult> => {
    try {
        const systemPrompt = `
Vous êtes un Directeur de Projet Événementiel expert.
À partir de la liste des prestations validées ci-dessous, vous devez :
1. Générer une liste de tâches de production (fabrication, design, coordination, achats) nécessaires pour réaliser ces prestations.
2. Rédiger un "Résumé Créatif et Technique" de l'événement.
3. Déduire les éléments clés du Brief Projet (Objectifs, Concept, Type de lieu, Public cible, Contraintes).

CRITIQUE - POUR LES TACHES ("tasks") :
Chaque tâche DOIT avoir une priorité ("priority") intelligente définie selon la structure de l'événement (ex: logistique urgente = HIGH, design préventif = NORMAL). Cette priorité sera modifiable par la suite par le chef de projet.

Format exact attendu pour chaque tâche :
   - title: string (Nom court de la tâche, max 5 mots)
   - description: string (Action précise à réaliser)
   - department: string (Exactement : 'CREATIVE', 'TECHNICAL_OFFICE', 'WORKSHOP', 'FIELD', 'LOGISTICS', ou 'PROJECT_MANAGEMENT')
   - priority: string (Exactement : 'LOW', 'NORMAL', 'MEDIUM', 'HIGH')

"projectBrief" :
   - eventGoal: string[] (Objectifs de l'événement déduits, ex: ["Lancement", "Fidélisation"])
   - mainObjective: string (Objectif principal en une phrase)
   - themeConcept: string (Concept thématique déduit des prestations, ex: "Soirée de Gala Gatsby")
   - locationType: string (L'un de: 'OUTDOOR', 'INDOOR', 'CHAPITEAU', 'STAND', 'AUTRE')
   - visitorsCount: number (Nombre estimé s'il y a des repas ou des chaises, sinon 0)
   - constraints: string (Contraintes logistiques ou temporelles apparentes)

RETOURNEZ UNIQUEMENT LE JSON VALIDE.
Format attendu:
{
  "tasks": [...],
  "creativeSummary": "...",
  "projectBrief": {
    "eventGoal": [],
    "mainObjective": "",
    "themeConcept": "",
    "locationType": "AUTRE",
    "visitorsCount": 0,
    "constraints": ""
  }
}
        `;

        const prestationsText = JSON.stringify(prestations, null, 2);
        let content = '';

        if (process.env.GEMINI_API_KEY) {
            console.log("[AI] Génération des tâches via API Native Gemini...");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent([
                systemPrompt,
                `Prestations validées :\n\n${prestationsText}`
            ]);
            content = result.response.text();
        } else {
            content = await callAIWithFallback(systemPrompt, `Prestations validées :\n\n${prestationsText}`);
        }

        let cleanContent = content.trim();
        if (cleanContent.startsWith('\`\`\`json')) cleanContent = cleanContent.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
        else if (cleanContent.startsWith('\`\`\`')) cleanContent = cleanContent.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
        
        const parsedData = JSON.parse(cleanContent) as any;
        return {
            tasks: parsedData.tasks || [],
            creativeSummary: parsedData.creativeSummary || "",
            projectBrief: parsedData.projectBrief || null
        } as ExtractedTasksResult;

    } catch (error: any) {
        console.error("[AI Tasks Generation Error]:", error);
        throw new Error(`Erreur lors de la génération des tâches : ${error.message}`);
    }
};

/**
 * PHASE 3 (Contextual): Extrait uniquement le Brief depuis le CPS.
 */
export const extractBriefFromCPS = async (fileUrl: string): Promise<any> => {
    try {
        let relativePath = fileUrl;
        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
            try {
                const urlObj = new URL(fileUrl);
                relativePath = urlObj.pathname;
            } catch (e) {}
        }
        const cleanFileUrl = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
        const filePath = path.join(__dirname, '../../', cleanFileUrl);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const systemPrompt = `
Vous êtes un Directeur de Projet Événementiel expert.
Analysez le document fourni (Cahier des Charges / CPS) et extrayez UNIQUEMENT les informations stratégiques de l'événement au format JSON EXACT.

"projectBrief" :
   - clientNature: string (Type de client: 'Institutionnel', 'Privé', 'Association', 'Grand Public')
   - eventFormat: string ('PHYSIQUE', 'DIGITAL', ou 'HYBRIDE')
   - toneStyle: string (Thème ou concept global, court)
   - location: string (Ville ou lieu spécifique de l'événement)
   - locationType: string ('INDOOR', 'OUTDOOR', ou 'CHAPITEAU')
   - visitorsCount: number (Nombre de participants estimé)
   - startDate: string (Date de début au format YYYY-MM-DD, ou null si non trouvée)
   - endDate: string (Date de fin au format YYYY-MM-DD, ou null si non trouvée)
   - eventGoal: array of strings (Liste de 2 à 5 objectifs principaux de l'événement)
   - targetAudience: array of strings (Liste des publics cibles visés)
   - mainObjective: string (Le but ultime en une phrase)
   - constraints: string (Résumé court des risques, contraintes techniques, délais ou conditions d'accès)

RETOURNEZ UNIQUEMENT LE JSON VALIDE SANS MARKDOWN NI TEXTE AVANT OU APRES.
Format attendu:
{
  "projectBrief": { ... }
}
        `;

        const fileExtension = path.extname(filePath).toLowerCase();
        let content = '';

        if (fileExtension === '.docx') {
            console.log("[AI Brief Extract] Fichier DOCX détecté, extraction locale via Mammoth...");
            const result = await mammoth.extractRawText({ path: filePath });
            const docxText = result.value;
            
            if (!docxText || docxText.trim().length < 50) {
                throw new Error("Le document DOCX semble être vide.");
            }

            const truncatedText = docxText.slice(0, 150000);
            
            if (process.env.GEMINI_API_KEY) {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const aiResult = await model.generateContent([
                    systemPrompt,
                    `Texte du CPS :\n\n${truncatedText}`
                ]);
                content = aiResult.response.text();
            } else {
                content = await callAIWithFallback(systemPrompt, `Texte du CPS :\n\n${truncatedText}`);
            }
        } else if (process.env.GEMINI_API_KEY) {
            console.log("[AI Brief Extract] Utilisation de l'API Native Gemini...");
            const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            
            const uploadResult = await fileManager.uploadFile(filePath, {
                mimeType: "application/pdf",
                displayName: "CPS Document Brief",
            });

            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent([
                    systemPrompt,
                    {
                        fileData: {
                            mimeType: uploadResult.file.mimeType,
                            fileUri: uploadResult.file.uri
                        }
                    }
                ]);
                
                content = result.response.text();
            } catch (apiError: any) {
                if (apiError.message.includes("has no pages")) {
                    throw new Error("Le document PDF semble être vide, corrompu, ou ne contient aucune page lisible.");
                }
                throw apiError;
            } finally {
                await fileManager.deleteFile(uploadResult.file.name).catch(() => {});
            }
        } else {
            console.log("[AI Brief Extract] Fallback local...");
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            const textContent = pdfData.text;

            if (!textContent || textContent.trim().length < 50) {
                throw new Error("Le PDF semble être scanné ou vide.");
            }

            const truncatedText = textContent.slice(0, 150000);
            content = await callAIWithFallback(systemPrompt, `Texte du CPS :\n\n${truncatedText}`);
        }

        let cleanContent = content.trim();
        if (cleanContent.startsWith('\`\`\`json')) cleanContent = cleanContent.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
        else if (cleanContent.startsWith('\`\`\`')) cleanContent = cleanContent.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');

        const parsedData = JSON.parse(cleanContent);
        return parsedData.projectBrief;

    } catch (error: any) {
        console.error("[AI Brief Extract Error]:", error);
        throw new Error(`Erreur lors de l'extraction du brief IA : ${error.message}`);
    }
}

export const extractPlanDeMasseFromCPS = async (fileUrl: string) => {
    try {
        let cleanFileUrl = fileUrl.replace(/^http:\/\/localhost:\d+\//, '');
        cleanFileUrl = cleanFileUrl.replace(/^https?:\/\/[^\/]+\//, '');
        const filePath = path.join(__dirname, '../../', cleanFileUrl);

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const systemPrompt = `
Vous êtes un architecte événementiel expert (Event Designer).
À partir de ce Cahier des Prescriptions Spéciales (CPS), vous devez déduire l'aménagement des espaces (Plan de Masse).

L'espace global de l'événement est représenté par une GRILLE virtuelle de 12 colonnes (x: 0 à 11) et 12 lignes (y: 0 à 11).
L'entrée principale est généralement au Sud (y élevé), la scène au Nord (y faible).
Chaque zone occupe un rectangle défini par sa position (x, y) et sa taille (w = largeur, h = hauteur).
Vous devez générer les zones et éviter qu'elles ne se chevauchent sur la grille !

Pour chaque espace identifié, fournissez exactement ces champs :
- name: string (Nom clair de la zone)
- surface: number (Surface estimée en m²)
- capacity: number (Capacité estimée en pax)
- type: string (Choisissez STRICTEMENT parmi : 'PLENIERE', 'SCENE', 'ATELIER', 'STAND', 'RESTAURATION', 'VIP', 'ACCUEIL', 'TECHNIQUE', 'ACCES', 'ZONE_VIDE', 'AUTRE')
- x: number (Coordonnée X sur la grille de 0 à 11. 0 = Ouest, 11 = Est)
- y: number (Coordonnée Y sur la grille de 0 à 11. 0 = Nord, 11 = Sud)
- w: number (Largeur de la zone de 1 à 12)
- h: number (Hauteur de la zone de 1 à 12)
- features: array de strings (Parmi : 'ENTRANCE' pour l'accueil, 'EXIT' pour les sorties, 'EMERGENCY' pour les secours. Optionnel)

Exemple de réflexion d'aménagement :
- Scène : au fond (y: 0), largeur max (x: 2, w: 8, h: 2), type 'SCENE'
- Plénière : devant la scène (x: 2, y: 2, w: 8, h: 5), type 'PLENIERE'
- Accueil : à l'entrée au Sud (x: 4, y: 10, w: 4, h: 2), type 'ACCUEIL', features: ['ENTRANCE']

Répondez UNIQUEMENT avec un objet JSON valide contenant une propriété "spaces" qui est un tableau d'objets respectant ces champs.
        `;

        const fileExtension = path.extname(filePath).toLowerCase();
        let content = '';

        if (fileExtension === '.docx') {
            console.log("[AI Spaces] Fichier DOCX détecté, extraction locale via Mammoth...");
            const result = await mammoth.extractRawText({ path: filePath });
            const docxText = result.value;
            
            if (!docxText || docxText.trim().length < 50) {
                throw new Error("Le document DOCX semble être vide.");
            }

            const truncatedText = docxText.slice(0, 150000);
            
            if (process.env.GEMINI_API_KEY) {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const aiResult = await model.generateContent([
                    systemPrompt,
                    `Texte du CPS :\n\n${truncatedText}`
                ]);
                content = aiResult.response.text();
            } else {
                content = await callAIWithFallback(systemPrompt, `Texte du CPS :\n\n${truncatedText}`);
            }
        } else if (process.env.GEMINI_API_KEY) {
            console.log("[AI Spaces] Utilisation de l'API Native Gemini...");
            const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            
            const uploadResult = await fileManager.uploadFile(filePath, {
                mimeType: "application/pdf",
                displayName: "CPS Document",
            });

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const aiResult = await model.generateContent([
                {
                    fileData: {
                        mimeType: uploadResult.file.mimeType,
                        fileUri: uploadResult.file.uri
                    }
                },
                { text: systemPrompt }
            ]);

            content = aiResult.response.text();
        } else {
            console.log("[AI Spaces] Utilisation du Fallback (pdf-parse) avec OpenRouter...");
            const data = await pdfParse(fs.readFileSync(filePath));
            const truncatedText = data.text.slice(0, 150000);
            content = await callAIWithFallback(systemPrompt, `Texte du document :\n\n${truncatedText}`);
        }

        const rawContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error("Impossible d'extraire un JSON valide de la réponse IA.");
        }

        const data = JSON.parse(jsonMatch[0]);
        return data;

    } catch (error: any) {
        console.error("Erreur lors de l'extraction des espaces IA:", error);
        
        // Detailed error for "no pages"
        if (error.message && error.message.includes("has no pages")) {
            throw new Error("Erreur lors de l'analyse IA : Le document PDF semble être vide, corrompu, ou ne contient aucune page lisible. Veuillez uploader un PDF valide.");
        }

        throw new Error(`Erreur lors de l'extraction des espaces IA : ${error.message}`);
    }
};;

/**
 * Helper partagé pour appeler OpenRouter avec Fallback
 */
async function callAIWithFallback(systemPrompt: string, userPrompt: string): Promise<string> {
    let response;
    let content;
    let usedModel = '';

    for (const model of AI_MODELS_FALLBACK_LIST) {
        try {
            console.log(`[AI] Tentative avec le modèle : ${model}...`);
            response = await openai.chat.completions.create({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' }
            });
            
            content = response.choices[0]?.message?.content;
            if (content) {
                usedModel = model;
                console.log(`[AI] ✅ Succès avec le modèle : ${usedModel}`);
                break;
            }
        } catch (err: any) {
            console.warn(`[AI] ⚠️ Modèle ${model} a échoué. Passage au modèle suivant. Erreur: ${err.message}`);
            continue;
        }
    }
    
    if (!content) {
        throw new Error("L'IA n'a retourné aucune réponse après avoir essayé tous les modèles de secours.");
    }
    return content;
}
