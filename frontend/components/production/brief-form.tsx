"use client";

import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { toast } from "sonner";
import {
    IconMapPin, IconCalendar, IconTarget,
    IconCpu, IconFileDownload, IconDeviceFloppy, IconLoader,
    IconCurrencyDirham, IconBuildingSkyscraper, IconUsersGroup,
    IconDownload, IconFile
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

const SAVE_BRIEF_MUTATION = gql`
  mutation SaveProjectBrief($input: ProjectBriefInput!) {
    saveProjectBrief(input: $input) { id updatedAt }
  }
`;

interface BriefFormProps {
    projectId: string;
    projectTitle: string; // Nom du projet (Read Only)
    projectObject: string; // Nom du client/Objet (Read Only)
    initialData?: any;
    documents?: any[]; // Liste des fichiers pour le zip
    onSave?: () => void;
}

export function BriefForm({ projectId, projectTitle, projectObject, initialData, documents = [], onSave }: BriefFormProps) {
    const safeJoin = (arr: any) => Array.isArray(arr) ? arr.join(", ") : (arr || "");

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
        requirements: {
            logistics: initialData?.requirements?.logistics || "",
            audiovisual: initialData?.requirements?.audiovisual || "",
            accommodation: initialData?.requirements?.accommodation || "",
            catering: initialData?.requirements?.catering || "",
            transport: initialData?.requirements?.transport || "",
            digital: initialData?.requirements?.digital || "",
            hr: initialData?.requirements?.hr || "",
            animation: initialData?.requirements?.animation || "",
        }
    });

    const [saveBrief, { loading: isSaving }] = useMutation(SAVE_BRIEF_MUTATION, {
        onCompleted: () => { toast.success("Brief sauvegardé"); if (onSave) onSave(); },
        onError: (error) => toast.error(`Erreur: ${error.message}`)
    });

    const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
    const handleRequirementChange = (key: string, value: string) => setFormData(prev => ({ ...prev, requirements: { ...prev.requirements, [key]: value } }));

    const handleSubmit = async () => {
        const input = {
            projectId,
            ...formData,
            visitorsCount: parseInt(formData.visitorsCount.toString()) || 0,
            estimatedBudget: parseFloat(formData.estimatedBudget.toString()) || 0,
            targetAudience: formData.targetAudience.split(',').map((s: string) => s.trim()).filter(Boolean)
        };
        await saveBrief({ variables: { input } });
    };

    // Fonction fictive pour le moment (Le backend devrait générer un ZIP)
    const handleDownloadZip = () => {
        if (documents.length === 0) return toast.error("Aucun document disponible.");
        toast.info("Préparation du téléchargement...");
        // Ici, idéalement tu aurais une route API /api/download-project-zip/${projectId}
        // Pour l'instant, on peut ouvrir le premier document comme exemple ou lister
        documents.forEach(doc => {
            window.open(`https://backoffice.urbagroupe.ma/${doc.fileUrl}`, '_blank');
        });
    };

    return (
        <div className="space-y-8 pb-20">

            {/* --- EN-TÊTE CONTEXTUEL (Read Only) --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{projectObject}</h2>
                    <p className="text-muted-foreground mt-1 text-lg">{projectTitle}</p>
                </div>
                <Button onClick={handleSubmit} disabled={isSaving} size="lg" className="shadow-sm">
                    {isSaving ? <IconLoader className="w-4 h-4 mr-2 animate-spin" /> : <IconDeviceFloppy className="w-4 h-4 mr-2" />}
                    Enregistrer le Brief
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* --- GAUCHE : FORMULAIRE --- */}
                <div className="xl:col-span-8 space-y-8">

                    {/* INFO GÉNÉRALES */}
                    <Card className="shadow-none border border-border bg-card">
                        <CardHeader className="pb-4 border-b border-border/50">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <IconBuildingSkyscraper className="w-4 h-4 text-muted-foreground" /> Informations Générales
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
                                <Label>Format Événement</Label>
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
                                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INDOOR">Indoor</SelectItem>
                                            <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                                            <SelectItem value="CHAPITEAU">Chapiteau</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input value={formData.location} onChange={e => handleChange('location', e.target.value)} placeholder="Ex: Hôtel Royal, Salle A" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* STRATÉGIE */}
                    <Card className="shadow-none border border-border bg-card">
                        <CardHeader className="pb-4 border-b border-border/50">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <IconTarget className="w-4 h-4 text-muted-foreground" /> Stratégie
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label>Objectif Principal</Label>
                                <Textarea rows={2} value={formData.mainObjective} onChange={e => handleChange('mainObjective', e.target.value)} placeholder="But de l'événement..." />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Cible (Audience)</Label>
                                    <Textarea rows={3} value={formData.targetAudience} onChange={e => handleChange('targetAudience', e.target.value)} placeholder="VIP, Presse..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ton & Style</Label>
                                    <Textarea rows={3} value={formData.toneStyle} onChange={e => handleChange('toneStyle', e.target.value)} placeholder="Ambiance souhaitée..." />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* TECHNIQUE (GRID) */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 px-1">
                            <IconCpu className="w-4 h-4" /> Besoins Techniques
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <RequirementItem label="Logistique" value={formData.requirements.logistics} onChange={v => handleRequirementChange('logistics', v)} />
                            <RequirementItem label="Audiovisuel" value={formData.requirements.audiovisual} onChange={v => handleRequirementChange('audiovisual', v)} />
                            <RequirementItem label="Restauration" value={formData.requirements.catering} onChange={v => handleRequirementChange('catering', v)} />
                            <RequirementItem label="Digital" value={formData.requirements.digital} onChange={v => handleRequirementChange('digital', v)} />
                            <RequirementItem label="Ressources Humaines" value={formData.requirements.hr} onChange={v => handleRequirementChange('hr', v)} />
                            <RequirementItem label="Animation" value={formData.requirements.animation} onChange={v => handleRequirementChange('animation', v)} />
                        </div>
                    </div>
                </div>

                {/* --- DROITE : SIDEBAR (BUDGET & DOWNLOAD) --- */}
                <div className="xl:col-span-4 space-y-6">

                    {/* KPI CARD */}
                    <Card className="shadow-none border border-border bg-card">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Métriques</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Budget (DH)</Label>
                                <div className="relative">
                                    <IconCurrencyDirham className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        className="pl-9 font-mono text-lg font-semibold"
                                        value={formData.estimatedBudget}
                                        onChange={e => handleChange('estimatedBudget', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Invités (Pax)</Label>
                                <div className="relative">
                                    <IconUsersGroup className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        className="pl-9"
                                        value={formData.visitorsCount}
                                        onChange={e => handleChange('visitorsCount', e.target.value)}
                                    />
                                </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Début</Label>
                                    <Input type="date" className="text-xs" value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Fin</Label>
                                    <Input type="date" className="text-xs" value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* DOWNLOAD CARD (NOUVEAU) */}
                    <Card className="bg-muted/30 border border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <IconFileDownload className="w-4 h-4" /> Dossier Projet
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-muted-foreground">
                                Contient le CPS, RC, Plans et autres documents techniques disponibles.
                            </p>

                            {/* Liste simplifiée des fichiers */}
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {documents.length > 0 ? documents.map((doc, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-background p-2 rounded border border-border">
                                        <IconFile className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{doc.originalFileName || doc.fileName}</span>
                                    </div>
                                )) : <span className="text-xs italic text-muted-foreground">Aucun document disponible</span>}
                            </div>

                            <Button
                                variant="outline"
                                className="w-full bg-background hover:bg-accent text-foreground border-dashed"
                                onClick={handleDownloadZip}
                                disabled={documents.length === 0}
                            >
                                <IconDownload className="w-4 h-4 mr-2" />
                                Télécharger Tout (ZIP)
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function RequirementItem({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="space-y-2 p-4 rounded-lg border border-border bg-card hover:border-primary/20 transition-colors">
            <Label className="text-xs font-bold uppercase text-muted-foreground">{label}</Label>
            <Textarea
                className="min-h-[80px] text-sm bg-transparent border-none shadow-none resize-none p-0 focus-visible:ring-0 placeholder:text-muted-foreground/30"
                placeholder="Ajouter des détails..."
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}