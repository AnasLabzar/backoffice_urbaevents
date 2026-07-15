"use client";

import React, { useState } from "react";
import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { IconSparkles, IconLoader } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AIAnalysisModal } from "@/components/projects/drawers/ai-analysis-modal";

import {
    ANALYZE_CPS_MUTATION,
    GENERATE_TASKS_MUTATION,
    IMPORT_AI_PRODUCTION,
    GET_ESTIMATION,
    EXTRACT_BRIEF_FROM_CPS_MUTATION,
    EXTRACT_SPACES_FROM_CPS_MUTATION,
    GET_TASKS_BY_PROJECT_QUERY,
    ADD_PRESTATION_MUTATION
} from "@/lib/graphql/projects";

interface AIAssistantButtonProps {
    projectId: string;
    documents?: any[]; 
    mode?: 'full' | 'brief' | 'spaces' | 'financial';
    onExtractBrief?: (data: any) => void;
    onExtractSpaces?: (data: any) => void;
    onExtractFinancial?: (data: any) => void;
}

export function AIAssistantButton({ projectId, documents, mode = 'full', onExtractBrief, onExtractSpaces, onExtractFinancial }: AIAssistantButtonProps) {
    const router = useRouter();
    const [analyzeCPS, { loading: analyzingFull }] = useMutation(ANALYZE_CPS_MUTATION);
    const [extractBrief, { loading: analyzingBrief }] = useMutation(EXTRACT_BRIEF_FROM_CPS_MUTATION);
    const [generateTasks, { loading: generating }] = useMutation(GENERATE_TASKS_MUTATION);
    const [importAI, { loading: importing }] = useMutation(IMPORT_AI_PRODUCTION);
    const [addPrestation] = useMutation(ADD_PRESTATION_MUTATION);
    
    const [extractSpaces, { loading: extractingSpaces }] = useMutation(EXTRACT_SPACES_FROM_CPS_MUTATION, {
        onError: (err) => {
            console.error(err);
            toast.error(`Erreur d'analyse des espaces: ${err.message}`, { id: 'ai-tasks' });
        }
    });

    const isProcessing = analyzingFull || analyzingBrief || generating || importing || extractingSpaces;

    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiData, setAiData] = useState<any>(null);

    const handleAnalyzeAI = async () => {
        try {
            const cpsDoc = documents?.find((d: any) => d.fileName === 'CPS' || d.originalFileName?.includes('CPS'));
            
            if (!cpsDoc || !cpsDoc.fileUrl) {
                toast.error("Veuillez d'abord uploader un fichier CPS (Cahier des Charges) sur le projet.");
                return;
            }

            let targetFileUrl = cpsDoc.fileUrl;
            if (targetFileUrl.startsWith('/')) {
                let apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                    ? 'http://localhost:5002'
                    : 'https://backoffice.urbagroupe.ma';
                targetFileUrl = `${apiBaseUrl}${targetFileUrl}`;
            }

            if (mode === 'spaces') {
                toast.loading("Analyse spatiale en cours...", { id: 'ai-tasks' });
                const extractRes = await extractSpaces({
                    variables: { projectId, fileUrl: targetFileUrl }
                });
                toast.success("Plan de masse généré !", { id: 'ai-tasks' });
                if (onExtractSpaces) onExtractSpaces(extractRes.data.extractPlanDeMasseFromCPS);
                return;
            }

            toast.info("Analyse du CPS en cours...");

            if (mode === 'brief') {
                const response = await extractBrief({
                    variables: { projectId, fileUrl: targetFileUrl }
                });
                const briefData = response.data?.extractBriefFromCPS;
                if (briefData) {
                    toast.success("Informations du Brief extraites avec succès !");
                    if (onExtractBrief) onExtractBrief(briefData);
                } else {
                    throw new Error("L'analyse n'a retourné aucune information de brief.");
                }
            } else {
                const response = await analyzeCPS({
                    variables: { projectId, fileUrl: targetFileUrl }
                });
                
                const prestations = response.data?.analyzeCPS;
                if (prestations) {
                    if (mode === 'financial') {
                        toast.success("Prestations extraites avec succès !");
                        if (onExtractFinancial) onExtractFinancial({ prestations });
                        return;
                    }
                    setAiData({ prestations });
                    setAiModalOpen(true);
                } else {
                    throw new Error("L'analyse n'a retourné aucune prestation.");
                }
            }
        } catch (error: any) {
            console.error("Erreur IA:", error);
            toast.error("Erreur lors de l'analyse IA : " + error.message);
        }
    };

    const handleAISave = async (validatedData: any) => {
        try {
            toast.info("Génération des tâches et sauvegarde du catalogue...", { duration: Infinity, id: 'ai-tasks' });
            
            // 1. Ajouter les nouvelles prestations au catalogue de l'agence
            const newPrestations = validatedData.prestations.filter((p: any) => p.isNew);
            if (newPrestations.length > 0) {
                for (const p of newPrestations) {
                    try {
                        await addPrestation({
                            variables: {
                                input: {
                                    projectId,
                                    name: p.designation,
                                    category: p.category,
                                    description: p.description,
                                    unit: 'U',
                                    unitPrice: p.unitPrice
                                }
                            }
                        });
                    } catch(e) {
                        console.error("Impossible d'ajouter au catalogue", e);
                    }
                }
            }
            
            const cleanPrestations = validatedData.prestations.map((p: any) => ({
                designation: p.designation,
                category: p.category,
                subCategory: p.subCategory,
                description: p.description,
                quantity: p.quantity,
                unitPrice: p.unitPrice
            }));

            const tasksResponse = await generateTasks({
                variables: {
                    projectId,
                    prestations: cleanPrestations
                }
            });

            const { tasks, creativeSummary, projectBrief } = tasksResponse.data.generateTasksFromPrestations;
            
            const cleanProjectBrief = projectBrief ? { ...projectBrief } : undefined;
            if (cleanProjectBrief) {
                delete cleanProjectBrief.__typename;
            }
            
            toast.success("Génération terminée ! Importation au projet...", { id: 'ai-tasks' });

            await importAI({
                variables: {
                    input: {
                        projectId,
                        prestations: cleanPrestations,
                        tasks: tasks.map((t: any) => ({
                            title: t.title,
                            description: t.description,
                            department: t.department,
                            priority: t.priority
                        })),
                        creativeSummary,
                        projectBrief: cleanProjectBrief
                    }
                },
                refetchQueries: [
                    { query: GET_ESTIMATION, variables: { projectId } },
                    { query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId } }
                ]
            });
            
            toast.success(`Succès ! Prestations cataloguées, Brief rempli, Tâches créées !`, { id: 'ai-tasks' });
            setAiModalOpen(false);
            
            router.push(`/dashboard/projects/${projectId}`);
            router.refresh();
            
        } catch (error: any) {
            console.error("Erreur Import IA:", error);
            toast.error(error.message || "Erreur lors de l'importation IA", { id: 'ai-tasks' });
        }
    };

    return (
        <>
            <Button
                onClick={handleAnalyzeAI}
                disabled={isProcessing || !documents || documents.length === 0}
                variant={mode === 'full' ? "outline" : "default"}
                size="sm"
                className={cn(
                    "h-8 text-xs transition-all font-bold group relative overflow-hidden",
                    mode === 'full' ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800" : "bg-indigo-600 text-white hover:bg-indigo-700"
                )}
            >
                {mode === 'full' && <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                {isProcessing ? (
                    <IconLoader className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                    <IconSparkles className="mr-2 h-3 w-3" />
                )}
                {isProcessing ? "Analyse..." : (mode === 'brief' ? "Auto-remplir (IA)" : mode === 'spaces' ? "Générer Plan (IA)" : mode === 'financial' ? "Auto-remplir Devis (IA)" : "Re-analyser (IA)")}
            </Button>

            {mode === 'full' && (
                <AIAnalysisModal
                    open={aiModalOpen}
                    onOpenChange={setAiModalOpen}
                    data={aiData}
                    onSave={handleAISave}
                />
            )}
        </>
    );
}
