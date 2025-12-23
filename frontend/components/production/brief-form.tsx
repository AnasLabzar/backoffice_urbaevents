"use client";

import { useState, useEffect } from "react";
import { useMutation, gql, useQuery } from "@apollo/client";
import { toast } from "sonner";
import {
    IconTarget, IconDeviceFloppy, IconLoader,
    IconCurrencyDirham, IconBuildingSkyscraper,
    IconFileDownload, IconInfoCircle, IconBriefcase, IconFileTypePdf,
    IconCalendar, IconDownload, IconPlus, IconX, IconUsers, IconUser, IconAlertTriangle, IconListCheck,
    IconRefresh
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const GET_PROJECT_TEAM = gql`
  query GetProjectTeam($projectId: ID!) {
    project(id: $projectId) {
        id
        projectManagers { id name }
        team {
            infographistes { id name }
            team3D { id name }
            coordinators { id name }
        }
    }
  }
`;

// --- HELPER COMPONENT: MULTI-INPUT ---
function MultiInput({ label, values, onChange, maxItems, placeholder, icon: Icon }: any) {
    const [inputValue, setInputValue] = useState("");
    // Ensure values is always an array
    const safeValues = Array.isArray(values) ? values : [];

    const addValue = () => {
        if (inputValue.trim() && safeValues.length < maxItems) {
            onChange([...safeValues, inputValue.trim()]);
            setInputValue("");
        }
    };

    const removeValue = (index: number) => {
        onChange(safeValues.filter((_: any, i: number) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    {Icon && <Icon className="w-3 h-3" />} {label}
                </Label>
                <span className="text-[10px] text-muted-foreground">{safeValues.length}/{maxItems}</span>
            </div>

            <div className="flex gap-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    className="h-8 text-sm bg-muted/20 focus:bg-background transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
                    disabled={safeValues.length >= maxItems}
                />
                <Button
                    type="button"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    variant="outline"
                    onClick={addValue}
                    disabled={safeValues.length >= maxItems || !inputValue.trim()}
                >
                    <IconPlus className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2 min-h-[32px]">
                {safeValues.length > 0 ? safeValues.map((val: string, i: number) => (
                    <Badge key={i} variant="secondary" className="pl-2 pr-1 py-0.5 h-6 text-xs gap-1 font-normal bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                        {val}
                        <div
                            className="cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                            onClick={() => removeValue(i)}
                        >
                            <IconX className="w-3 h-3" />
                        </div>
                    </Badge>
                )) : (
                    <span className="text-xs text-muted-foreground italic">Aucun élément ajouté</span>
                )}
            </div>
        </div>
    );
}

// --- HELPER COMPONENT: TEAM MEMBER ROW ---
function TeamMemberRow({ role, members }: { role: string, members: any[] }) {
    if (!members || members.length === 0) return null;
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-card border border-border/50 hover:border-border hover:bg-accent/5 transition-all gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32 flex-shrink-0">{role}</span>
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end flex-1">
                {members.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2 bg-background border px-2.5 py-1 rounded-full shadow-sm">
                        <Avatar className="h-5 w-5 border border-muted">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{m.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground whitespace-nowrap">{m.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

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

    // Check Update Mode
    const isUpdate = !!initialData?.id;

    // Helper URL
    const getFileUrl = (filePath: string) => {
        if (!filePath) return "#";
        const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
            ? 'https://backoffice.urbagroupe.ma'
            : 'http://localhost:5002';
        return `${baseUrl}/${filePath}`;
    };

    // Parsing helper (VERSION AMÉLIORÉE)
    const parseList = (data: any) => {
        if (!data) return [];

        // 1. Ila kan deja Array
        if (Array.isArray(data)) {
            // N-verifier wach wst l-array kayn chi string fih virgule (Ex: ["A, B"])
            // Ila kan, n-ferqohom
            return data.flatMap(item =>
                typeof item === 'string' && item.includes(',')
                    ? item.split(',').map(s => s.trim())
                    : item
            ).filter(Boolean); // Supprime les chaines vides
        }

        // 2. Ila kan String fih virgules
        if (typeof data === 'string') {
            return data.includes(',')
                ? data.split(',').map(s => s.trim())
                : [data];
        }

        return [];
    };

    // Form State
    const [formData, setFormData] = useState({
        clientNature: "",
        eventFormat: "PHYSIQUE",
        toneStyle: "",
        location: "",
        locationType: "INDOOR",
        visitorsCount: 0,
        estimatedBudget: 0,
        startDate: "",
        endDate: "",
        targetAudience: [] as string[],
        eventGoal: [] as string[],
        mainObjective: "",
        history: "",
        constraints: "",
        requirements: { logistics: "", audiovisual: "", accommodation: "", catering: "", transport: "", digital: "", hr: "", animation: "" }
    });

    // Cost State
    const [technicalCost, setTechnicalCost] = useState(0);

    // Queries
    const { data: teamData } = useQuery(GET_PROJECT_TEAM, { variables: { projectId } });
    const { data: invoiceData, loading: loadingInvoice } = useQuery(GET_ESTIMATION, { variables: { projectId } });

    const [saveBrief, { loading: isSaving }] = useMutation(SAVE_BRIEF_MUTATION, {
        onCompleted: () => {
            toast.success(isUpdate ? "Brief mis à jour !" : "Brief créé !");
            if (onSave) onSave();
        },
        onError: (error) => toast.error(error.message)
    });

    // ✅ Ajoute cette fonction helper juste avant le composant BriefForm ou à l'intérieur
    const safeDate = (dateVal: any) => {
        if (!dateVal) return "";
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0];
    };

    // ✅ FIX IMPORTANTE : UseEffect pour synchroniser initialData avec le state quand il arrive
    useEffect(() => {
        if (initialData) {
            // Création sécurisée de l'objet requirements par défaut
            const defaultReqs = {
                logistics: "", audiovisual: "", accommodation: "", catering: "",
                transport: "", digital: "", hr: "", animation: ""
            };

            // Fusion sécurisée
            const safeReqs = initialData.requirements
                ? { ...defaultReqs, ...initialData.requirements }
                : defaultReqs;

            setFormData({
                clientNature: initialData.clientNature || "",
                eventFormat: initialData.eventFormat || "PHYSIQUE",
                toneStyle: initialData.toneStyle || "",
                location: initialData.location || "",
                locationType: initialData.locationType || "INDOOR",
                visitorsCount: initialData.visitorsCount || 0,
                estimatedBudget: initialData.estimatedBudget || 0,

                // 👇 UTILISATION DE safeDate() ICI 👇
                // ✅ Utilisation de safeDate pour éviter le RangeError
                startDate: safeDate(initialData.startDate),
                endDate: safeDate(initialData.endDate),

                // ✅ Utilisation du parser pour s'assurer que c'est un tableau
                targetAudience: parseList(initialData.targetAudience),
                eventGoal: parseList(initialData.eventGoal),
                mainObjective: initialData.mainObjective || "",
                history: initialData.history || "",
                constraints: initialData.constraints || "",
                requirements: safeReqs
            });
        }
    }, [initialData]);

    // Handlers
    const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        // Safe conversion of arrays to strings if needed by backend, or keep as array if schema allows
        // Here we assume backend accepts Arrays for targetAudience/eventGoal based on your schema info, 
        // OR we join them if your schema requires String. 
        // Based on previous JSON, they are Arrays in frontend, but check your schema.
        // If schema is String, do .join(', '). If [String], keep as is.
        // Assuming [String] based on "Array (1)" in your JSON dump.

        const input = {
            projectId,
            ...formData,
            requirements: formData.requirements,
            visitorsCount: parseInt(formData.visitorsCount.toString()) || 0,
            estimatedBudget: parseFloat(formData.estimatedBudget.toString()) || 0,
            // Keep arrays as arrays if backend supports [String], otherwise join them
            targetAudience: formData.targetAudience,
            eventGoal: formData.eventGoal,
            constraints: formData.constraints
        };
        await saveBrief({ variables: { input } });
    };

    const handleDownloadAll = () => {
        if (documents.length === 0) return toast.error("Aucun document.");
        documents.forEach(doc => window.open(getFileUrl(doc.fileUrl), '_blank'));
    };

    // Financial Logic
    const budgetClient = parseFloat(formData.estimatedBudget.toString()) || 0;
    const marge = budgetClient - technicalCost;
    const margePercent = budgetClient > 0 ? (marge / budgetClient) * 100 : 0;
    const isProfit = marge >= 0;
    const estimationId = invoiceData?.getProjectEstimation?.id;

    const projectTeam = teamData?.project || {};

    return (
        <div className="space-y-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* --- 1. TOP HEADER --- */}
            <div className="sticky top-16 z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-4 md:p-6 rounded-xl border bg-background/95 backdrop-blur-md shadow-sm border-primary/10 transition-all">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary text-xs uppercase tracking-wider font-bold">
                        <IconBriefcase className="w-3.5 h-3.5" /> Espace Production
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{projectObject}</h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs border-primary/20 text-primary bg-primary/5">{projectTitle}</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleSubmit} disabled={isSaving} size="lg" className="shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
                        {isSaving ? <IconLoader className="w-4 h-4 mr-2 animate-spin" /> : isUpdate ? <IconRefresh className="w-4 h-4 mr-2" /> : <IconDeviceFloppy className="w-4 h-4 mr-2" />}
                        {isSaving ? "Sauvegarde..." : isUpdate ? "Mettre à jour" : "Enregistrer"}
                    </Button>
                </div>
            </div>
            {/* --- DIAGNOSTIC ALERT --- */}
            <Alert className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900 shadow-sm">
                <IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-700 dark:text-blue-300 font-semibold">Information Stratégique</AlertTitle>
                <AlertDescription className="text-blue-600/90 dark:text-blue-400/90 text-xs mt-1">
                    Définissez les objectifs clés et la cible pour aligner l'équipe technique. Ces informations apparaîtront sur le bon de commande.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* --- LEFT COLUMN (MAIN FORM) --- */}
                <div className="xl:col-span-8 space-y-8">

                    {/* 1. ÉQUIPE PROJET */}
                    <Card className="border shadow-sm overflow-hidden bg-card/50">
                        <CardHeader className="bg-muted/30 border-b py-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <IconUsers className="w-4 h-4 text-primary" /> Équipe Projet Assignée
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 p-5">
                            {(!projectTeam.projectManagers?.length && !projectTeam.team?.infographistes?.length && !projectTeam.team?.team3D?.length && !projectTeam.team?.coordinators?.length) ? (
                                <div className="text-center text-sm text-muted-foreground py-6 italic bg-muted/20 rounded-lg border border-dashed">
                                    Aucune équipe assignée pour le moment.
                                </div>
                            ) : (
                                <>
                                    <TeamMemberRow role="Chef de Projet" members={projectTeam.projectManagers} />
                                    <TeamMemberRow role="Création" members={projectTeam.team?.infographistes} />
                                    <TeamMemberRow role="3D / Archi" members={projectTeam.team?.team3D} />
                                    <TeamMemberRow role="Coordination" members={projectTeam.team?.coordinators} />
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* 2. CADRAGE STRATEGIQUE */}
                    <Card className="border shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b py-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <IconTarget className="w-4 h-4 text-primary" /> Cadrage & Objectifs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 p-6">

                            {/* Nature du Client */}
                            <div className="grid gap-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <IconUser className="w-3 h-3" /> Nature du Client
                                </Label>
                                <Select value={formData.clientNature} onValueChange={v => handleChange('clientNature', v)}>
                                    <SelectTrigger className="bg-muted/10 h-10 border-input/50 focus:ring-1 focus:ring-primary/20"><SelectValue placeholder="Sélectionner le type de client..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Institutionnel">🏛️ Institutionnel</SelectItem>
                                        <SelectItem value="Privé">🏢 Privé (Entreprise)</SelectItem>
                                        <SelectItem value="Association">🤝 Association / ONG</SelectItem>
                                        <SelectItem value="Grand Public">🌍 Grand Public</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* But de l'événement */}
                            <div className="grid gap-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">But de l'événement</Label>
                                <Textarea
                                    className="bg-muted/10 min-h-[80px] border-input/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                                    placeholder="Quel est le but ultime de cet événement ?"
                                    value={formData.mainObjective}
                                    onChange={e => handleChange('mainObjective', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Cible (Dynamic) */}
                                <MultiInput
                                    label="Public Cible"
                                    icon={IconUsers}
                                    values={formData.targetAudience}
                                    onChange={(val: any) => handleChange('targetAudience', val)}
                                    maxItems={5}
                                    placeholder="Ajouter une cible..."
                                />

                                {/* Objectifs (Dynamic) */}
                                <MultiInput
                                    label="Objectifs Principaux"
                                    icon={IconTarget}
                                    values={formData.eventGoal}
                                    onChange={(val: any) => handleChange('eventGoal', val)}
                                    maxItems={7}
                                    placeholder="Ajouter un objectif..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Historique</Label>
                                    <Input
                                        className="bg-muted/10 border-input/50"
                                        placeholder="Ex: Édition 2023..."
                                        value={formData.history}
                                        onChange={e => handleChange('history', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Thème & Concept</Label>
                                    <Input
                                        className="bg-muted/10 border-input/50"
                                        placeholder="Ex: Innovation & Futur"
                                        value={formData.toneStyle}
                                        onChange={e => handleChange('toneStyle', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. CONDITIONS & CONTRAINTES */}
                    <Card className="border shadow-sm overflow-hidden border-l-4 border-l-amber-500/50">
                        <CardHeader className="bg-amber-500/5 border-b py-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <IconAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Conditions & Contraintes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid gap-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Risques, Contraintes Techniques & Conditions Spéciales</Label>
                                <Textarea
                                    className="bg-muted/10 min-h-[100px] border-input/50 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                                    placeholder="Détaillez les contraintes d'accès, risques météo, délais serrés, ou toute condition particulière..."
                                    value={formData.constraints}
                                    onChange={e => handleChange('constraints', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. LOGISTIQUE */}
                    <Card className="border shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b py-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <IconBuildingSkyscraper className="w-4 h-4 text-primary" /> Logistique & Format
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="grid gap-2">
                                    <Label>Format</Label>
                                    <Select value={formData.eventFormat} onValueChange={v => handleChange('eventFormat', v)}>
                                        <SelectTrigger className="bg-muted/10"><SelectValue placeholder="-" /></SelectTrigger>
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
                                        <SelectTrigger className="bg-muted/10"><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INDOOR">Indoor</SelectItem>
                                            <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                                            <SelectItem value="CHAPITEAU">Chapiteau</SelectItem>
                                        </SelectContent>
                                    </Select>
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

                            <div className="grid grid-cols-1 gap-6">
                                <div className="grid gap-2">
                                    <Label>Lieu / Ville</Label>
                                    <Input
                                        className="bg-muted/10"
                                        placeholder="Ex: Sofitel Casablanca"
                                        value={formData.location}
                                        onChange={e => handleChange('location', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 5. PRESTATIONS MANAGER */}
                    <div className="pt-4 animate-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-px bg-border flex-1" />
                            <span className="text-xs font-bold text-muted-foreground uppercase px-3 py-1 bg-muted/20 rounded-full border flex items-center gap-2">
                                <IconListCheck className="w-3.5 h-3.5" /> Détail Technique & Devis
                            </span>
                            <div className="h-px bg-border flex-1" />
                        </div>

                        {loadingInvoice ? (
                            <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                                <IconLoader className="animate-spin w-8 h-8 mb-3 text-primary/50" />
                                <span className="text-sm">Initialisation du module de chiffrage...</span>
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
                    </div>
                </div>

                {/* --- RIGHT COLUMN (SIDEBAR) --- */}
                <div className="xl:col-span-4 space-y-6">

                    {/* 1. FINANCIAL CARD */}
                    <Card className={cn("border shadow-md overflow-hidden transition-all duration-300", isProfit ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900")}>
                        <div className={cn("h-1 w-full", isProfit ? "bg-green-500" : "bg-red-500")} />
                        <CardHeader className="pb-4 border-b bg-card">
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                <IconCurrencyDirham className="w-4 h-4" /> Rentabilité
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 p-6 bg-muted/5">
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase text-muted-foreground font-bold">Budget Client (HT)</Label>
                                <div className="relative group">
                                    <Input
                                        type="number"
                                        className="pl-3 pr-12 text-lg font-bold font-mono bg-background shadow-sm border-input transition-all group-hover:border-primary/50"
                                        value={formData.estimatedBudget}
                                        onChange={e => handleChange('estimatedBudget', e.target.value)}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">DH</span>
                                </div>
                            </div>

                            <div className="p-3 bg-background rounded-md border border-border flex justify-between items-center shadow-sm">
                                <span className="text-xs font-medium text-muted-foreground">Coût Technique</span>
                                <span className="font-mono font-bold text-sm">{technicalCost.toLocaleString()} DH</span>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-dashed">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Marge Nette</span>
                                    <div className="text-right">
                                        <div className={cn("text-xl font-bold font-mono", isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                            {marge.toLocaleString()} DH
                                        </div>
                                        <div className={cn("text-[10px] font-bold", isProfit ? "text-green-500" : "text-red-500")}>
                                            {margePercent.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                                <Progress
                                    value={Math.min(Math.max(margePercent, 0), 100)}
                                    className={cn("h-2", isProfit ? "bg-green-100 dark:bg-green-950" : "bg-red-100 dark:bg-red-950")}
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
                                <Input type="date" className="h-8 text-xs bg-muted/10" value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fin</Label>
                                <Input type="date" className="h-8 text-xs bg-muted/10" value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. DOCUMENTS CARD */}
                    <Card className="border shadow-sm bg-muted/5 border-dashed">
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
                                        className="flex items-center gap-3 p-2 bg-background border rounded hover:border-primary/50 transition-colors group shadow-sm hover:shadow-md"
                                    >
                                        <div className="w-8 h-8 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 border border-red-100 dark:border-red-900 shrink-0">
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