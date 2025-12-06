"use client";

import { useState, useEffect } from "react";
import { useMutation, gql, useQuery } from "@apollo/client";
import { toast } from "sonner";
import {
    IconTarget, IconDeviceFloppy, IconLoader,
    IconCurrencyDirham, IconBuildingSkyscraper,
    IconFileDownload, IconInfoCircle, IconBriefcase, IconFileTypePdf,
    IconCalendar, IconDownload
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Import du Manager
import { PrestationManager } from "./prestation-manager";

// --- GRAPHQL ---

const SAVE_BRIEF_MUTATION = gql`
  mutation SaveProjectBrief($input: ProjectBriefInput!) {
    saveProjectBrief(input: $input) { id updatedAt }
  }
`;

const GET_ESTIMATION = gql`
  query GetProjectEstimation($projectId: ID!) {
    getProjectEstimation(projectId: $projectId) {
      id
      reference
      totalAmount
    }
  }
`;

// --- TYPES ---

interface BriefFormProps {
    projectId: string;
    projectTitle: string;
    projectObject: string;
    initialData?: any;
    documents?: any[];
    onSave?: () => void;
}

// --- COMPONENT ---

export function BriefForm({ projectId, projectTitle, projectObject, initialData, documents = [], onSave }: BriefFormProps) {

    // Helper URL
    const getFileUrl = (filePath: string) => {
        if (!filePath) return "#";
        const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
            ? 'https://backoffice.urbagroupe.ma'
            : 'http://localhost:5002';
        return `${baseUrl}/${filePath}`;
    };

    const safeJoin = (arr: any) => Array.isArray(arr) ? arr.join(", ") : (arr || "");

    // Form State
    const [formData, setFormData] = useState({
        clientNature: initialData?.clientNature || "",
        eventFormat: initialData?.eventFormat || "PHYSIQUE",
        toneStyle: initialData?.toneStyle || "",
        location: initialData?.location || "",
        locationType: initialData?.locationType || "INDOOR",
        visitorsCount: initialData?.visitorsCount || 0,
        estimatedBudget: initialData?.estimatedBudget || 0,
        startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
        endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
        eventGoal: initialData?.eventGoal || "",
        targetAudience: safeJoin(initialData?.targetAudience),
        mainObjective: initialData?.mainObjective || "",
        history: initialData?.history || "",
    });

    // Cost State
    const [technicalCost, setTechnicalCost] = useState(0);

    // Queries & Mutations
    const { data: invoiceData, loading: loadingInvoice } = useQuery(GET_ESTIMATION, {
        variables: { projectId }
    });

    const [saveBrief, { loading: isSaving }] = useMutation(SAVE_BRIEF_MUTATION, {
        onCompleted: () => { toast.success("Brief sauvegardé !"); if (onSave) onSave(); },
        onError: (error) => toast.error(error.message)
    });

    // Handlers
    const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        const input = {
            projectId,
            ...formData,
            // Requirements vides car gérés par PrestationManager
            requirements: { logistics: "", audiovisual: "", accommodation: "", catering: "", transport: "", digital: "", hr: "", animation: "" },
            visitorsCount: parseInt(formData.visitorsCount.toString()) || 0,
            estimatedBudget: parseFloat(formData.estimatedBudget.toString()) || 0,
            targetAudience: formData.targetAudience.split(',').map((s: string) => s.trim()).filter(Boolean)
        };
        await saveBrief({ variables: { input } });
    };

    const handleDownloadAll = () => {
        if (documents.length === 0) return toast.error("Aucun document.");
        documents.forEach(doc => window.open(getFileUrl(doc.fileUrl), '_blank'));
    };

    // Financial Logic
    const estimationId = invoiceData?.getProjectEstimation?.id;
    const budgetClient = parseFloat(formData.estimatedBudget.toString()) || 0;
    const marge = budgetClient - technicalCost;
    const margePercent = budgetClient > 0 ? (marge / budgetClient) * 100 : 0;
    const isProfit = marge >= 0;

    return (
        <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">

            {/* --- 1. TOP HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 rounded-xl border bg-card shadow-sm">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary text-xs uppercase tracking-wider font-bold">
                        <IconBriefcase className="w-3.5 h-3.5" /> Espace Production
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{projectObject}</h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{projectTitle}</Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline-block">• Configuration du projet</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleSubmit} disabled={isSaving} size="lg" className="shadow-lg bg-primary text-primary-foreground hover:bg-primary/90">
                        {isSaving ? <IconLoader className="w-4 h-4 mr-2 animate-spin" /> : <IconDeviceFloppy className="w-4 h-4 mr-2" />}
                        Enregistrer
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* --- LEFT COLUMN (MAIN FORM) --- */}
                <div className="xl:col-span-8 space-y-8">

                    {/* INFO STRATEGIQUE */}
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-muted/20 border-b py-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <IconTarget className="w-4 h-4 text-primary" /> Cadrage Stratégique
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 p-6">
                            <div className="grid gap-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Objectif Principal</Label>
                                <Textarea
                                    className="bg-muted/10 min-h-[80px]"
                                    placeholder="Ex: Lancement de produit, Team building..."
                                    value={formData.mainObjective}
                                    onChange={e => handleChange('mainObjective', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Cible (Audience)</Label>
                                    <Input
                                        className="bg-muted/10"
                                        placeholder="Ex: VIP, Presse, Influenceurs"
                                        value={formData.targetAudience}
                                        onChange={e => handleChange('targetAudience', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Ton & Style</Label>
                                    <Input
                                        className="bg-muted/10"
                                        placeholder="Ex: Luxe, Tech, Eco-friendly"
                                        value={formData.toneStyle}
                                        onChange={e => handleChange('toneStyle', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* INFO LOGISTIQUE */}
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-muted/20 border-b py-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <IconBuildingSkyscraper className="w-4 h-4 text-primary" /> Logistique & Format
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="grid gap-2">
                                    <Label>Nature Client</Label>
                                    <Select value={formData.clientNature} onValueChange={v => handleChange('clientNature', v)}>
                                        <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Institutionnel">Institutionnel</SelectItem>
                                            <SelectItem value="Privé">Privé</SelectItem>
                                            <SelectItem value="Association">Association</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Format</Label>
                                    <Select value={formData.eventFormat} onValueChange={v => handleChange('eventFormat', v)}>
                                        <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PHYSIQUE">Physique</SelectItem>
                                            <SelectItem value="DIGITAL">Digital</SelectItem>
                                            <SelectItem value="HYBRIDE">Hybride</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Type Lieu</Label>
                                    <Select value={formData.locationType} onValueChange={v => handleChange('locationType', v)}>
                                        <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INDOOR">Indoor</SelectItem>
                                            <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                                            <SelectItem value="CHAPITEAU">Chapiteau</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-2">
                                    <Label>Lieu / Ville</Label>
                                    <Input
                                        className="bg-muted/10"
                                        placeholder="Ex: Sofitel Casablanca"
                                        value={formData.location}
                                        onChange={e => handleChange('location', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nombre Pax</Label>
                                    <Input
                                        type="number"
                                        className="bg-muted/10"
                                        value={formData.visitorsCount}
                                        onChange={e => handleChange('visitorsCount', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- PRESTATIONS MANAGER (The Core) --- */}
                    {/* <div className="pt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-px bg-border flex-1" />
                            <span className="text-xs font-bold text-muted-foreground uppercase px-2">Détail Technique & Devis</span>
                            <div className="h-px bg-border flex-1" />
                        </div>

                        {loadingInvoice ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <IconLoader className="animate-spin w-6 h-6 mx-auto mb-2" />
                                Initialisation du module de chiffrage...
                            </div>
                        ) : estimationId ? (
                            <PrestationManager
                                projectId={projectId}
                                invoiceId={estimationId}
                                onTotalChange={setTechnicalCost}
                            />
                        ) : (
                            <Alert variant="destructive">
                                <AlertTitle>Erreur de configuration</AlertTitle>
                                <AlertDescription>Aucune estimation n'est liée à ce projet. Contactez l'administrateur.</AlertDescription>
                            </Alert>
                        )}
                    </div> */}
                </div>

                {/* --- RIGHT COLUMN (SIDEBAR) --- */}
                <div className="xl:col-span-4 space-y-6">

                    {/* 1. FINANCIAL CARD */}
                    <Card className={cn("border shadow-md overflow-hidden", isProfit ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900")}>
                        <div className={cn("h-1 w-full", isProfit ? "bg-green-500" : "bg-red-500")} />
                        <CardHeader className="pb-4 border-b bg-card">
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                <IconCurrencyDirham className="w-4 h-4" /> Rentabilité
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 p-6 bg-muted/5">
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase text-muted-foreground font-bold">Budget Client (HT)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        className="pl-3 pr-12 text-lg font-bold font-mono bg-background shadow-sm border-input"
                                        value={formData.estimatedBudget}
                                        onChange={e => handleChange('estimatedBudget', e.target.value)}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">DH</span>
                                </div>
                            </div>

                            <div className="p-3 bg-background rounded border border-border flex justify-between items-center">
                                <span className="text-xs font-medium text-muted-foreground">Coût Technique</span>
                                <span className="font-mono font-bold text-sm">{technicalCost.toLocaleString()} DH</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Marge Nette</span>
                                    <div className="text-right">
                                        <div className={cn("text-xl font-bold font-mono", isProfit ? "text-green-600" : "text-red-600")}>
                                            {marge.toLocaleString()} DH
                                        </div>
                                        <div className={cn("text-[10px] font-bold", isProfit ? "text-green-500" : "text-red-500")}>
                                            {margePercent.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                                <Progress
                                    value={Math.min(Math.max(margePercent, 0), 100)}
                                    className={cn("h-2", isProfit ? "bg-green-100" : "bg-red-100")}
                                    indicatorClassName={isProfit ? "bg-green-500" : "bg-red-500"}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. PLANNING CARD */}
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/10">
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                <IconCalendar className="w-4 h-4 text-muted-foreground" /> Dates Clés
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3 p-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Début</Label>
                                <Input type="date" className="h-8 text-xs" value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fin</Label>
                                <Input type="date" className="h-8 text-xs" value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. DOCUMENTS CARD */}
                    <Card className="border shadow-sm bg-muted/10 border-dashed">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2 text-muted-foreground">
                                <IconFileDownload className="w-4 h-4" /> Fichiers Joints
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {documents.length > 0 ? documents.map((doc, i) => (
                                    <a
                                        key={i}
                                        href={getFileUrl(doc.fileUrl)}
                                        target="_blank"
                                        className="flex items-center gap-3 p-2 bg-background border rounded hover:border-primary/50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red-500 border border-red-100 shrink-0">
                                            <IconFileTypePdf className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate text-foreground">{doc.originalFileName || doc.fileName}</p>
                                            <p className="text-[10px] text-muted-foreground">Document</p>
                                        </div>
                                        <IconDownload className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )) : (
                                    <div className="text-center py-4 text-xs text-muted-foreground italic">
                                        Aucun document disponible
                                    </div>
                                )}
                            </div>
                            {documents.length > 0 && (
                                <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed" onClick={handleDownloadAll}>
                                    Tout télécharger
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}