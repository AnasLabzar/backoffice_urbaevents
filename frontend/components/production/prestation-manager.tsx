"use client";

import { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { toast } from "sonner";
import {
    IconPlus, IconTrash, IconPackage, IconLoader,
    IconChecklist, IconSettings, IconX
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

// --- GRAPHQL ---
const GET_PRESTATIONS = gql`
  query GetPrestations($projectId: ID!) {
    prestationsByProject(projectId: $projectId) {
      id
      name
      category
      description
      quantity
      unitPrice
      totalPrice
    }
  }
`;

const ADD_PRESTATION = gql`
  mutation AddPrestation($input: AddPrestationInput!) {
    addPrestation(input: $input) { id name category quantity unitPrice totalPrice }
  }
`;

const DELETE_PRESTATION = gql`
  mutation DeletePrestation($id: ID!) {
    deletePrestation(id: $id)
  }
`;

// --- CONFIGURATION AVANCÉE DES CHAMPS ---
const CATEGORY_FIELDS: Record<string, { label: string; key: string; type: 
'text' | 'number' | 'select' | 'date' | 'textarea'; options?: string[]; 
placeholder?: string, width?: string }[]> = {
    AUDIO_VISUELLE: [
        { label: "Sous-Catégorie", key: "sub_cat", type: "select", options: ["Sonorisation", "Éclairage", "Vidéo / LED", "Structure Scénique", "Traduction Simultanée", "Régie / Câblage"] },
        { label: "Marque / Réf", key: "brand", type: "text", placeholder: "Ex: Shure, L-Acoustics..." },
        { label: "Puissance / Dims", key: "specs", type: "text", placeholder: "Ex: 2000W ou 5x3m" },
        { label: "Jours d'exploitation", key: "days", type: "number", placeholder: "1", width: "w-1/4" },
    ],
    HEBERGEMENT: [
        { label: "Type Chambre", key: "roomType", type: "select", options: ["Single", "Double / Twin", "Suite Junior", "Suite Executive", "Appartement"] },
        { label: "Formule", key: "board", type: "select", options: ["B&B (Ptit Dej)", "Demi-Pension", "Pension Complète", "All Inclusive"] },
        { label: "Check-in", key: "checkin", type: "date" },
        { label: "Check-out", key: "checkout", type: "date" },
    ],
    RESTAURATION: [
        { label: "Type de Repas", key: "mealType", type: "select", options: ["Pause Café Matin", "Pause Café Après-midi", "Déjeuner Buffet", "Déjeuner Assis", "Dîner Gala", "Cocktail Dînatoire", "Lunch Box"] },
        { label: "Standard", key: "standing", type: "select", options: ["Standard", "Premium", "VIP", "Luxe"] },
        { label: "Régime Spécial", key: "diet", type: "text", placeholder: "Sans Gluten, Végé..." },
    ],
    TRANSPORT: [
        { label: "Type Véhicule", key: "vehicle", type: "select", options: ["Berline Luxe", "Van (7pl)", "Minibus (20pl)", "Autocar (50pl)", "4x4", "Camion Logistique"] },
        { label: "Trajet", key: "route", type: "text", placeholder: "Départ > Arrivée" },
        { label: "Mise à disposition", key: "availability", type: "text", placeholder: "Ex: 08h - 20h" },
    ],
    RESSOURCES_HUMAINES: [
        { label: "Profil", key: "profile", type: "select", options: ["Hôtesse d'accueil", "Chef Hôtesse", "Agent Sécurité", "Bodyguard", "Technicien Son", "Technicien Lumière", "Manutentionnaire", "Chauffeur"] },
        { label: "Tenue", key: "outfit", type: "text", placeholder: "Ex: Tailleur noir, Gilet..." },
        { label: "Horaires", key: "hours", type: "text", placeholder: "Ex: 08h00 - 18h00" },
    ],
    LOGISTIQUE: [
        { label: "Type", key: "type", type: "select", options: ["Chapiteau / Tente", "Mobilier", "Moquette / Sol", "Climatisation", "Groupe Électrogène", "Sanitaires"] },
        { label: "Dimensions / Surface", key: "dims", type: "text", placeholder: "Ex: 10x20m" },
        { label: "Matière / Couleur", key: "finish", type: "text", placeholder: "Ex: Coton blanc, Bois..." },
    ],
    COMMUNICATION_DIGITAL: [
        { label: "Support", key: "support", type: "select", options: ["Impression Grand Format", "Signalétique", "Badges & Cordons", "Site Web Événementiel", "Application Mobile", "Couverture Photo/Vidéo"] },
        { label: "Format", key: "format", type: "text", placeholder: "Ex: A4, 16/9, 4x3m..." },
        { label: "Finition", key: "finish", type: "text", placeholder: "Ex: Forex, Bâche, Papier..." },
    ],
    ANIMATION: [
        { label: "Prestation", key: "act", type: "select", options: ["Groupe de Musique", "DJ", "Animateur Micro", "Spectacle Vivant", "Troupe Folklorique"] },
        { label: "Durée", key: "duration", type: "text", placeholder: "Ex: 2 passages de 45min" },
        { label: "Besoins", key: "needs", type: "text", placeholder: "Loges, Catering..." },
    ],
    AUTRE: [
        { label: "Description", key: "desc", type: "text", placeholder: "Description..." }
    ]
};

const PRESTATION_CATEGORIES = [
    { value: 'LOGISTIQUE', label: 'Logistique', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'AUDIO_VISUELLE', label: 'Audiovisuel', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'HEBERGEMENT', label: 'Hébergement', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'RESTAURATION', label: 'Traiteur', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'TRANSPORT', label: 'Transport', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'COMMUNICATION_DIGITAL', label: 'Com & Digital', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    { value: 'RESSOURCES_HUMAINES', label: 'RH / Staff', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    { value: 'ANIMATION', label: 'Animation', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'AUTRE', label: 'Autre', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
];

export function PrestationManager({ projectId, onTotalChange }: { projectId: string, onTotalChange?: (total: number) => void }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Formulaire de base
    const [category, setCategory] = useState("LOGISTIQUE");
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);

    // Champs standards dynamiques (pré-configurés)
    const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});

    // Champs 100% personnalisés (Key-Value)
    const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

    const { data, loading, refetch } = useQuery(GET_PRESTATIONS, {
        variables: { projectId },
        fetchPolicy: 'network-only',
        onCompleted: (d) => {
            const total = d.prestationsByProject.reduce((acc: number, p: any) => acc + (p.quantity * p.unitPrice), 0);
            if (onTotalChange) onTotalChange(total);
        }
    });

    const [addPrestation, { loading: adding }] = useMutation(ADD_PRESTATION, {
        onCompleted: () => {
            toast.success("Prestation ajoutée");
            setIsDialogOpen(false);
            resetForm();
            refetch().then(res => {
                const total = res.data.prestationsByProject.reduce((acc: number, p: any) => acc + (p.quantity * p.unitPrice), 0);
                if (onTotalChange) onTotalChange(total);
            });
        },
        onError: (err) => toast.error(err.message)
    });

    const [deletePrestation] = useMutation(DELETE_PRESTATION, {
        onCompleted: () => {
            toast.success("Supprimé");
            refetch().then(res => {
                const total = res.data.prestationsByProject.reduce((acc: number, p: any) => acc + (p.quantity * p.unitPrice), 0);
                if (onTotalChange) onTotalChange(total);
            });
        }
    });

    const resetForm = () => {
        setName("");
        setQuantity(1);
        setUnitPrice(0);
        setDynamicFields({});
        setCustomFields([]);
    };

    const handleAdd = () => {
        if (!name) return toast.error("L'intitulé est requis");

        // Fusionner les champs standards et personnalisés
        const finalDetails = { ...dynamicFields };
        customFields.forEach(f => {
            if (f.key && f.value) finalDetails[f.key] = f.value;
        });

        addPrestation({
            variables: {
                input: {
                    projectId,
                    name,
                    category,
                    description: JSON.stringify(finalDetails),
                    quantity: parseInt(quantity.toString()),
                    unitPrice: parseFloat(unitPrice.toString())
                }
            }
        });
    };

    const addCustomField = () => {
        setCustomFields([...customFields, { key: "", value: "" }]);
    };

    const updateCustomField = (index: number, field: 'key' | 'value', val: string) => {
        const newFields = [...customFields];
        newFields[index][field] = val;
        setCustomFields(newFields);
    };

    const removeCustomField = (index: number) => {
        const newFields = customFields.filter((_, i) => i !== index);
        setCustomFields(newFields);
    };

    // Rendu des détails dans le tableau
    const renderDetails = (jsonDesc: string) => {
        try {
            const fields = JSON.parse(jsonDesc);
            if (Object.keys(fields).length === 0) return <span className="text-muted-foreground text-xs italic">Standard</span>;

            return (
                <div className="flex flex-wrap gap-1.5 mt-1">
                    {Object.entries(fields).map(([key, val]) => (
                        <div key={key} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-muted/50 border border-border text-muted-foreground">
                            <span className="font-semibold mr-1 opacity-70 capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-medium text-foreground">{String(val)}</span>
                        </div>
                    ))}
                </div>
            );
        } catch (e) {
            return <span className="text-xs text-muted-foreground">{jsonDesc}</span>;
        }
    };

    const currentFields = CATEGORY_FIELDS[category] || CATEGORY_FIELDS['AUTRE'];

    return (
        <Card className="border-0 shadow-none bg-transparent p-0">
            <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-base flex items-center gap-2">
                        <IconChecklist className="w-5 h-5 text-primary" />
                        Liste des Prestations & Coûts
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Détaillez les besoins techniques et estimez les coûts.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <IconPlus className="h-4 w-4" /> Ajouter
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nouvelle Prestation</DialogTitle>
                            <DialogDescription>Ajoutez un élément au budget technique.</DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-5 py-4">

                            {/* 1. BASE */}
                            <div className="grid gap-2">
                                <Label>Catégorie</Label>
                                <Select value={category} onValueChange={(v) => { setCategory(v); setDynamicFields({}); }}>
                                    <SelectTrigger className="h-11 bg-muted/5"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PRESTATION_CATEGORIES.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("w-2 h-2 rounded-full", cat.color.split(' ')[0].replace('bg-', 'bg-'))} />
                                                    {cat.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 grid gap-2">
                                    <Label>Intitulé (Nom)</Label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Location Écran LED P3" className="font-medium" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Quantité</Label>
                                    <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>P.U Estimé (DH)</Label>
                                    <Input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)} placeholder="0.00" />
                                </div>
                            </div>

                            {/* 2. CHAMPS DYNAMIQUES */}
                            <div className="bg-muted/30 border border-dashed rounded-lg p-4 space-y-3 transition-all">
                                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-2">
                                    Détails : {PRESTATION_CATEGORIES.find(c => c.value === category)?.label}
                                </Label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentFields.map((field) => (
                                        <div key={field.key} className={cn("grid gap-1.5", field.type === 'textarea' ? "col-span-2" : "")}>
                                            <Label className="text-xs text-muted-foreground">{field.label}</Label>
                                            {field.type === 'select' ? (
                                                <Select
                                                    value={dynamicFields[field.key] || ""}
                                                    onValueChange={(v) => setDynamicFields(prev => ({ ...prev, [field.key]: v }))}
                                                >
                                                    <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="-" /></SelectTrigger>
                                                    <SelectContent>{field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                                </Select>
                                            ) : field.type === 'textarea' ? (
                                                <Textarea
                                                    placeholder={field.placeholder}
                                                    className="min-h-[80px] bg-background resize-none"
                                                    value={dynamicFields[field.key] || ''}
                                                    onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                />
                                            ) : (
                                                <Input
                                                    type={field.type}
                                                    placeholder={field.placeholder}
                                                    value={dynamicFields[field.key] || ""}
                                                    onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="h-9 bg-background"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. CHAMPS PERSONNALISÉS (Dynamic Builder) */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">Caractéristiques Supplémentaires</Label>
                                    <Button variant="ghost" size="sm" onClick={addCustomField} className="h-7 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                                        <IconPlus className="w-3 h-3 mr-1" /> Ajouter un champ
                                    </Button>
                                </div>

                                {customFields.length > 0 ? (
                                    <div className="space-y-2 p-4 border border-dashed rounded-lg bg-muted/5">
                                        {customFields.map((field, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <Input
                                                    placeholder="Nom (ex: Couleur)"
                                                    value={field.key}
                                                    onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
                                                    className="h-8 text-xs w-1/3"
                                                />
                                                <Input
                                                    placeholder="Valeur (ex: Rouge)"
                                                    value={field.value}
                                                    onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                                                    className="h-8 text-xs flex-1"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => removeCustomField(idx)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                    <IconX className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground italic px-4 py-2 border border-dashed rounded-lg text-center">
                                        Aucun champ personnalisé.
                                    </div>
                                )}
                            </div>

                        </div>

                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                            <Button onClick={handleAdd} disabled={adding}>
                                {adding && <IconLoader className="mr-2 h-4 w-4 animate-spin" />} Ajouter
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="w-[160px]">Catégorie</TableHead>
                            <TableHead>Détails de la Prestation</TableHead>
                            <TableHead className="w-[80px] text-center">Qté</TableHead>
                            <TableHead className="w-[100px] text-right">P.U (DH)</TableHead>
                            <TableHead className="w-[100px] text-right">Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center"><IconLoader className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                        ) : data?.prestationsByProject?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 bg-muted rounded-full"><IconPackage className="w-6 h-6 opacity-40" /></div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">Aucune prestation définie</p>
                                            <p className="text-xs text-muted-foreground">Commencez par ajouter les besoins techniques.</p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>Commencer</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.prestationsByProject?.map((item: any) => {
                                const catInfo = PRESTATION_CATEGORIES.find(c => c.value === item.category) || PRESTATION_CATEGORIES[8];
                                return (
                                    <TableRow key={item.id} className="group hover:bg-muted/5 transition-colors">
                                        <TableCell className="align-top py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("w-1 h-8 rounded-full", catInfo.color.split(' ')[0])} />
                                                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border">
                                                    {catInfo.label}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="font-semibold text-sm text-foreground">{item.name}</span>
                                                {item.description && renderDetails(item.description)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-sm align-top py-4">{item.quantity}</TableCell>
                                        <TableCell className="text-right font-mono text-sm text-muted-foreground align-top py-4">{item.unitPrice?.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold text-foreground align-top py-4">
                                            {(item.quantity * item.unitPrice).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="align-top py-4">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => { if (confirm('Supprimer ?')) deletePrestation({ variables: { id: item.id } }) }}
                                            >
                                                <IconTrash className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}
