"use client";

import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { toast } from "sonner";
import {
    IconMapPin, IconCalendar, IconTarget,
    IconCpu, IconFileDownload, IconDeviceFloppy, IconLoader,
    IconCurrencyDirham, IconBuildingSkyscraper, IconUsersGroup,
    IconDownload, IconFile, IconInfoCircle, IconBriefcase, IconFileTypePdf
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; // N'oublie pas d'installer ça si tu l'as pas

import { PrestationManager } from "./prestation-manager";

const SAVE_BRIEF_MUTATION = gql`
  mutation SaveProjectBrief($input: ProjectBriefInput!) {
    saveProjectBrief(input: $input) { id updatedAt }
  }
`;

interface BriefFormProps {
    projectId: string;
    projectTitle: string;
    projectObject: string;
    initialData?: any;
    documents?: any[];
    onSave?: () => void;
}

export function BriefForm({ projectId, projectTitle, projectObject, initialData, documents = [], onSave }: BriefFormProps) {
    const safeJoin = (arr: any) => Array.isArray(arr) ? arr.join(", ") : (arr || "");

    // State
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

    // Total technique (Calculé via PrestationManager)
    const [technicalCost, setTechnicalCost] = useState(0);

    const [saveBrief, { loading: isSaving }] = useMutation(SAVE_BRIEF_MUTATION, {
        onCompleted: () => { toast.success("Brief sauvegardé avec succès"); if (onSave) onSave(); },
        onError: (error) => toast.error(`Erreur: ${error.message}`)
    });

    const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        const input = {
            projectId,
            ...formData,
            requirements: { logistics: "", audiovisual: "", accommodation: "", catering: "", transport: "", digital: "", hr: "", animation: "" },
            visitorsCount: parseInt(formData.visitorsCount.toString()) || 0,
            estimatedBudget: parseFloat(formData.estimatedBudget.toString()) || 0,
            targetAudience: formData.targetAudience.split(',').map((s: string) => s.trim()).filter(Boolean)
        };
        await saveBrief({ variables: { input } });
    };

    const handleDownloadZip = () => {
        if (documents.length === 0) return toast.error("Aucun document disponible.");
        toast.info("Téléchargement...");
        documents.forEach(doc => window.open(`https://backoffice.urbagroupe.ma/${doc.fileUrl}`, '_blank'));
    };

    // Calculs Financiers
    const budgetClient = parseFloat(formData.estimatedBudget.toString()) || 0;
    const marge = budgetClient - technicalCost;
    const margePercent = budgetClient > 0 ? (marge / budgetClient) * 100 : 0;
    const isProfit = marge >= 0;

    return (
        <div className="space-y-6 pb-20">

            {/* --- BANNIÈRE --- */}
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300 font-semibold">Initialisation du Projet</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400 text-xs">
                    Remplissez les détails stratégiques. La liste des prestations sert à estimer le coût technique.
                </AlertDescription>
            </Alert>

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-xl border bg-card shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                        <IconBriefcase className="w-3 h-3" /> Projet En Cours
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{projectObject}</h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-medium">{projectTitle}</Badge>
                        <span className="text-sm text-muted-foreground">• Identifiant Unique</span>
                    </div>
                </div>
                <Button onClick={handleSubmit} disabled={isSaving} size="lg" className="shadow-md bg-primary hover:bg-primary/90">
                    {isSaving ? <IconLoader className="w-4 h-4 mr-2 animate-spin" /> : <IconDeviceFloppy className="w-4 h-4 mr-2" />}
                    Sauvegarder le Brief
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* --- GAUCHE : FORMULAIRE --- */}
                <div className="xl:col-span-8 space-y-8">

                    {/* 1. CONTEXTE */}
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <IconTarget className="w-4 h-4 text-primary" /> Contexte & Stratégie
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-6 pt-6">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Objectif Principal</Label>
                                <Textarea
                                    rows={3}
                                    placeholder="Quel est le but ultime de cet événement ?"
                                    className="bg-muted/10 resize-none focus:bg-background transition-colors"
                                    value={formData.mainObjective}
                                    onChange={e => handleChange('mainObjective', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Cible</Label>
                                    <Textarea
                                        rows={3}
                                        placeholder="Qui sont les invités ? (VIP, Grand public, Presse...)"
                                        className="bg-muted/10 resize-none"
                                        value={formData.targetAudience}
                                        onChange={e => handleChange('targetAudience', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Ton & Style</Label>
                                    <Textarea
                                        rows={3}
                                        placeholder="Ex: Moderne, Épuré, Traditionnel, High-Tech..."
                                        className="bg-muted/10 resize-none"
                                        value={formData.toneStyle}
                                        onChange={e => handleChange('toneStyle', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. LOGISTIQUE */}
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <IconBuildingSkyscraper className="w-4 h-4 text-primary" /> Logistique & Format
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                            <div className="space-y-2">
                                <Label>Nature du Client</Label>
                                <Select value={formData.clientNature} onValueChange={v => handleChange('clientNature', v)}>
                                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Institutionnel">Institutionnel</SelectItem>
                                        <SelectItem value="Privé">Privé / Corporate</SelectItem>
                                        <SelectItem value="Association">Association</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Format</Label>
                                <Select value={formData.eventFormat} onValueChange={v => handleChange('eventFormat', v)}>
                                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PHYSIQUE">Physique</SelectItem>
                                        <SelectItem value="DIGITAL">Digital</SelectItem>
                                        <SelectItem value="HYBRIDE">Hybride</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Lieu / Ville</Label>
                                <div className="flex gap-2">
                                    <Select value={formData.locationType} onValueChange={v => handleChange('locationType', v)}>
                                        <SelectTrigger className="w-[140px] bg-muted/10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INDOOR">Indoor</SelectItem>
                                            <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                                            <SelectItem value="CHAPITEAU">Chapiteau</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        value={formData.location}
                                        onChange={e => handleChange('location', e.target.value)}
                                        placeholder="Adresse..."
                                        className="bg-muted/10 focus:bg-background"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. PRESTATIONS (Nouvelle Version) */}
                    <PrestationManager projectId={projectId} onTotalChange={(total) => setTechnicalCost(total)} />
                </div>

                {/* --- DROITE : SIDEBAR (FINANCE & FILES) --- */}
                <div className="xl:col-span-4 space-y-6">

                    {/* CARTE FINANCIÈRE INTELLIGENTE */}
                    <Card className={cn("border shadow-md transition-colors", isProfit ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900" : "bg-red-50/50 border-red-100")}>
                        <CardHeader className="pb-3 border-b border-black/5">
                            <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-2">
                                <IconCurrencyDirham className="w-4 h-4" /> Analyse Financière
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground font-semibold uppercase">Budget Client (HT)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">DH</span>
                                    <Input
                                        type="number"
                                        className="pl-10 bg-background font-mono font-bold text-lg border-input shadow-sm"
                                        value={formData.estimatedBudget}
                                        onChange={e => handleChange('estimatedBudget', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* CALCUL DU COÛT REEL */}
                            <div className="flex justify-between items-center text-sm p-2 bg-background/50 rounded border">
                                <span className="text-muted-foreground">Coût Technique:</span>
                                <span className="font-mono font-medium">{technicalCost.toLocaleString()} DH</span>
                            </div>

                            {/* MARGE & PROGRESS BAR */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span>Marge: {margePercent.toFixed(1)}%</span>
                                    <span className={isProfit ? "text-green-600" : "text-red-600"}>
                                        {marge.toLocaleString()} DH
                                    </span>
                                </div>
                                <Progress value={Math.max(0, Math.min(100, margePercent))} className={cn("h-2", isProfit ? "bg-green-100" : "bg-red-100")} indicatorClassName={isProfit ? "bg-green-500" : "bg-red-500"} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* CARTE PLANNING */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Planning</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3 pt-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Début</Label>
                                <Input type="date" className="text-xs h-9" value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fin</Label>
                                <Input type="date" className="text-xs h-9" value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* CARTE DOCUMENTS CLIQUABLES */}
                    <Card className="bg-muted/30 border border-dashed border-muted-foreground/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                                <IconFileDownload className="w-4 h-4" /> Dossier Technique
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {documents.length > 0 ? documents.map((doc, i) => (
                                    <a
                                        key={i}
                                        href={`https://backoffice.urbagroupe.ma/${doc.fileUrl}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 text-xs text-foreground bg-background p-2 rounded border border-border shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer group"
                                    >
                                        <div className="bg-red-50 text-red-600 p-1.5 rounded shrink-0">
                                            <IconFileTypePdf className="w-4 h-4" />
                                        </div>
                                        <span className="truncate flex-1 font-medium">{doc.originalFileName || doc.fileName}</span>
                                        <IconDownload className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )) : <span className="text-xs italic text-muted-foreground p-2 block text-center">Aucun document disponible.</span>}
                            </div>

                            <Button
                                variant="outline"
                                className="w-full border-dashed"
                                onClick={handleDownloadZip}
                                disabled={documents.length === 0}
                            >
                                <IconDownload className="w-4 h-4 mr-2" />
                                Télécharger le ZIP
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}