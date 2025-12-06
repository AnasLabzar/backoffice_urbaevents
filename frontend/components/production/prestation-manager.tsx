"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { toast } from "sonner";
import {
    IconPlus, IconTrash, IconPackage, IconLoader,
    IconFileSpreadsheet, IconSearch, IconCalculator, IconSettings,
    IconInfoCircle, IconAlertCircle, IconChevronRight
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- 1. CONFIGURATION METIER ---

const CATEGORY_LABELS: Record<string, string> = {
    'AUDIO_VISUELLE': 'Audiovisuel & Technique',
    'HEBERGEMENT': 'Hébergement & Hôtellerie',
    'RESTAURATION': 'Restauration & Traiteur',
    'TRANSPORT': 'Transport & Logistique',
    'RESSOURCES_HUMAINES': 'Ressources Humaines & Staffing',
    'LOGISTIQUE': 'Logistique Générale',
    'COMMUNICATION_DIGITAL': 'Communication & Branding',
    'ANIMATION': 'Animation & Artistique',
    'AMENAGEMENT_ESPACE': 'Aménagement & Scénographie',
    'STRUCTURE': 'Structures & Scènes',
    'AUTRE': 'Autre / Divers'
};

const CATEGORY_COLORS: Record<string, string> = {
    'LOGISTIQUE': 'bg-blue-50 text-blue-700 border-blue-200',
    'AUDIO_VISUELLE': 'bg-purple-50 text-purple-700 border-purple-200',
    'HEBERGEMENT': 'bg-orange-50 text-orange-700 border-orange-200',
    'RESTAURATION': 'bg-green-50 text-green-700 border-green-200',
    'TRANSPORT': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'RESSOURCES_HUMAINES': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'AMENAGEMENT_ESPACE': 'bg-pink-50 text-pink-700 border-pink-200',
    'STRUCTURE': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'AUTRE': 'bg-gray-50 text-gray-700 border-gray-200',
};

// Mapping pour l'affichage des unités
const UNIT_LABELS: Record<string, string> = {
    "U": "U",
    "J": "Jour",
    "H": "Heure",
    "m2": "m²",
    "ml": "ml",
    "Ens": "Ens",
    "Pck": "Pack",
    "FORFAIT": "Forfait",
    "PAX": "Pax",
    "PAX/JOUR": "Pax/J"
};

// Sub-categories mapping
const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
    'AUDIO_VISUELLE': ['Sonorisation', 'Éclairage', 'Vidéo / LED', 'Structure Scénique', 'Traduction Simultanée', 'Régie & Câblage', 'Distribution Électrique'],
    'RESSOURCES_HUMAINES': ['EQUIPE PROJET', 'CONCEPTION', 'TECHNIQUE', 'HÔTESSES & ACCUEIL', 'SÉCURITÉ', 'MANUTENTION', 'ARTISTIQUE'],
    'LOGISTIQUE': ['Mobilier', 'Tentes & Chapiteaux', 'Sanitaires', 'Climatisation', 'Groupe Électrogène', 'Barriérage', 'Moquette & Sol'],
    'AMENAGEMENT_ESPACE': ['Scénographie', 'Décoration', 'Signalétique', 'Stand', 'PLV', 'Moquette'],
    'COMMUNICATION_DIGITAL': ['Branding', 'Signalétique', 'Contenu Visuel', 'Web & App', 'Badging', 'Photo & Vidéo'],
    'HEBERGEMENT': ['Hébergement Staff', 'Hébergement VIP', 'Hébergement Artistes'],
    'RESTAURATION': ['Pause Café', 'Déjeuner', 'Dîner', 'Cocktail', 'Gala', 'Buffet', 'Catering Staff'],
    'TRANSPORT': ['Transfert VIP', 'Minibus', 'Autocar', 'Logistique Camion', 'Billet d\'avion'],
    'ANIMATION': ['Groupe Musical', 'DJ', 'Spectacle', 'Animation Digital', 'Team Building', 'Conférencier'],
    'STRUCTURE': ['Scène', 'Truss', 'Podium', 'Gradin', 'Tours'],
    'AUTRE': ['Divers', 'Imprévus', 'Frais de gestion']
};

// Configuration des champs dynamiques
const CATEGORY_CONFIG: Record<string, { label: string; key: string; type: 'text' | 'number' | 'select' | 'date' | 'textarea'; options?: string[]; placeholder?: string; hint?: string }[]> = {
    AUDIO_VISUELLE: [
        { label: "Marque / Référence", key: "brand", type: "text", placeholder: "Ex: Shure Axient, L-Acoustics K2...", hint: "Précisez la marque ou le modèle technique" },
        { label: "Spécifications / Puissance", key: "specs", type: "text", placeholder: "Ex: 20000 Lumens, 4K, 32A...", hint: "Détails techniques pertinents (W, px, A)" },
        { label: "Jours d'exploitation", key: "days", type: "number", placeholder: "1", hint: "Nombre de jours d'utilisation effective" },
    ],
    HEBERGEMENT: [
        { label: "Type Chambre", key: "roomType", type: "select", options: ["Single", "Double", "Twin", "Suite Junior", "Suite Executive", "Appartement"], placeholder: "Sélectionner..." },
        { label: "Formule", key: "board", type: "select", options: ["B&B (Ptit Dej)", "Demi-Pension", "Pension Complète", "All Inclusive"], placeholder: "Sélectionner..." },
        { label: "Check-in", key: "checkin", type: "date", placeholder: "Date d'arrivée" },
        { label: "Check-out", key: "checkout", type: "date", placeholder: "Date de départ" },
    ],
    RESTAURATION: [
        { label: "Type de Service", key: "serviceStyle", type: "select", options: ["Buffet", "À l'assiette", "Cocktail Dînatoire", "Lunch Box"], placeholder: "Style de service" },
        { label: "Standing", key: "standing", type: "select", options: ["Standard", "Premium", "VIP", "Luxe"], placeholder: "Niveau de prestation" },
        { label: "Régime Spécial", key: "diet", type: "text", placeholder: "Ex: Sans Gluten, Végétarien", hint: "Allergies ou régimes spécifiques à prévoir" },
    ],
    TRANSPORT: [
        { label: "Type Véhicule", key: "vehicle", type: "select", options: ["Berline Luxe", "Van (7pl)", "Minibus (20pl)", "Autocar (50pl)", "Camion 20m3"], placeholder: "Type de véhicule" },
        { label: "Trajet", key: "route", type: "text", placeholder: "Départ > Arrivée", hint: "Itinéraire ou zone de mise à disposition" },
        { label: "Plage Horaire", key: "hours", type: "text", placeholder: "Ex: 08h00 - 20h00", hint: "Heures de mise à disposition" },
    ],
    RESSOURCES_HUMAINES: [
        { label: "Tenue Exigée", key: "outfit", type: "text", placeholder: "Ex: Costume sombre, T-shirt Event...", hint: "Code vestimentaire requis pour le staff" },
        { label: "Horaires / Shift", key: "hours", type: "text", placeholder: "Ex: 09h00 - 18h00", hint: "Amplitude horaire de travail" },
        { label: "Langues", key: "languages", type: "text", placeholder: "Ex: FR/EN/AR", hint: "Compétences linguistiques requises" },
    ],
    LOGISTIQUE: [
        { label: "Dimensions", key: "dims", type: "text", placeholder: "Ex: 10m x 20m", hint: "Surface ou taille exacte" },
        { label: "Matière / Finition", key: "finish", type: "text", placeholder: "Ex: Coton gratté, Bois, PVC", hint: "Aspect visuel ou matériau" },
        { label: "Couleur", key: "color", type: "text", placeholder: "Ex: Blanc, Noir, Bleu Nuit" },
    ],
    COMMUNICATION_DIGITAL: [
        { label: "Format", key: "format", type: "text", placeholder: "Ex: A4, 16/9, 1080x1920px", hint: "Dimensions physiques ou résolution digitale" },
        { label: "Support", key: "medium", type: "text", placeholder: "Ex: Forex 3mm, Bâche, LED", hint: "Support d'impression ou de diffusion" },
    ],
    AMENAGEMENT_ESPACE: [
        { label: "Zone", key: "zone", type: "text", placeholder: "Ex: Espace Lounge, Accueil", hint: "Zone d'implantation sur plan" },
        { label: "Style", key: "style", type: "text", placeholder: "Ex: Bohème, Industriel, Corporate" },
    ],
    ANIMATION: [
        { label: "Durée / Passages", key: "duration", type: "text", placeholder: "Ex: 3 sets de 45min", hint: "Temps de prestation scénique" },
        { label: "Besoins Techniques", key: "riders", type: "text", placeholder: "Ex: Besoin 2 micros, Retour son", hint: "Rider technique simplifié" },
    ]
};

// --- GRAPHQL ---

const GET_DATA = gql`
  query GetData($invoiceId: ID!) {
    getInvoiceItems(invoiceId: $invoiceId) {
      id
      category
      subCategory
      designation
      description
      quantity
      unitPrice
      totalPrice
      unit
    }
    getPrestationCatalog
  }
`;

const SEARCH_PRESTATION = gql`
  query SearchPrestation($category: String, $subCategory: String, $search: String) {
    searchPrestation(category: $category, subCategory: $subCategory, search: $search) {
      id
      designation
      unitPrice
      description
      unit
      category
      subCategory
    }
  }
`;

const ADD_ITEM = gql`
  mutation AddInvoiceItem($input: AddInvoiceItemInput!) {
    addInvoiceItem(input: $input) {
      id
      designation
      totalPrice
    }
  }
`;

const DELETE_ITEM = gql`
  mutation DeleteInvoiceItem($id: ID!) {
    deleteInvoiceItem(id: $id)
  }
`;

const IMPORT_EXCEL = gql`
  mutation ImportExcel($projectId: ID!, $invoiceId: ID!, $fileUrl: String!) {
    importPrestationsFromExcel(projectId: $projectId, invoiceId: $invoiceId, fileUrl: $fileUrl) {
      id
    }
  }
`;

// --- COMPONENT ---

export function PrestationManager({ projectId, invoiceId, onTotalChange }: { projectId: string, invoiceId: string, onTotalChange?: (total: number) => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Form State
    const [category, setCategory] = useState<string>("");
    const [subCategory, setSubCategory] = useState("");
    const [designation, setDesignation] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [unit, setUnit] = useState("U");
    const [openCombobox, setOpenCombobox] = useState(false);

    // Dynamic Fields State
    const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});

    useEffect(() => {
        setSubCategory("");
        setDynamicFields({});
    }, [category]);

    const { data, loading, refetch } = useQuery(GET_DATA, {
        variables: { invoiceId },
        fetchPolicy: 'cache-and-network',
        onCompleted: (d) => {
            const total = d?.getInvoiceItems?.reduce((acc: number, item: any) => acc + item.totalPrice, 0) || 0;
            if (onTotalChange) onTotalChange(total);
        }
    });

    const { data: searchData } = useQuery(SEARCH_PRESTATION, {
        variables: {
            category: (category && category !== "ALL") ? category : null,
            subCategory: (subCategory && subCategory !== "ALL") ? subCategory : null,
            search: designation
        },
        skip: !designation || designation.length < 2
    });

    const [addItem, { loading: adding }] = useMutation(ADD_ITEM, {
        onCompleted: () => {
            toast.success("Prestation ajoutée");
            resetForm();
            setIsSheetOpen(false);
            refetch();
        },
        onError: (err) => toast.error(err.message)
    });

    const [deleteItem] = useMutation(DELETE_ITEM, {
        onCompleted: () => { toast.success("Supprimé"); refetch(); }
    });

    const [importExcel, { loading: importing }] = useMutation(IMPORT_EXCEL, {
        onCompleted: (d) => { toast.success(`${d.importPrestationsFromExcel.length} importés`); refetch(); },
        onError: (e) => toast.error(e.message)
    });

    // Helpers
    const resetForm = () => {
        setDesignation("");
        setQuantity(1);
        setUnitPrice(0);
        setUnit("U");
        setDynamicFields({});
    };

    const handleAdd = () => {
        if (!designation) return toast.error("Désignation requise");
        if (!category) return toast.error("Catégorie requise");

        const descObject = { ...dynamicFields };
        const description = Object.keys(descObject).length > 0 ? JSON.stringify(descObject) : "";

        addItem({
            variables: {
                input: {
                    invoiceId,
                    projectId,
                    category,
                    subCategory: subCategory || 'Divers',
                    name: designation,
                    description,
                    quantity: Number(quantity),
                    unitPrice: Number(unitPrice)
                }
            }
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);

        try {
            toast.loading("Traitement...");
            const uploadUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
                ? 'https://backoffice.urbagroupe.ma/api/upload'
                : 'http://localhost:5002/api/upload';

            const res = await fetch(`${uploadUrl}/${projectId}`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Upload failed");
            const { fileUrl } = await res.json();

            importExcel({ variables: { projectId, invoiceId, fileUrl } });
            toast.dismiss();
        } catch (err: any) {
            toast.dismiss();
            toast.error(err.message);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const renderDetails = (jsonDesc: string) => {
        try {
            const fields = JSON.parse(jsonDesc);
            if (Object.keys(fields).length === 0) return null;
            return (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {Object.entries(fields).map(([key, val]) => {
                        const catKey = Object.keys(CATEGORY_CONFIG).find(k => CATEGORY_CONFIG[k].some(f => f.key === key)) || '';
                        const fieldConfig = CATEGORY_CONFIG[catKey]?.find(f => f.key === key);
                        const label = fieldConfig?.label || key;

                        return (
                            <span key={key} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted border border-border text-muted-foreground/80">
                                <span className="mr-1 opacity-70">{label}:</span>
                                <span className="text-foreground">{String(val)}</span>
                            </span>
                        );
                    })}
                </div>
            );
        } catch (e) {
            return <div className="text-xs text-muted-foreground mt-1">{jsonDesc}</div>;
        }
    };

    const uniqueCategories = useMemo(() => {
        const dbCats = data?.getPrestationCatalog || [];
        const staticCats = Object.keys(CATEGORY_LABELS);
        const allCats = Array.from(new Set([...dbCats, ...staticCats]));
        const filtered = allCats.filter((c: string) => c !== 'AUTRE');
        filtered.sort((a, b) => {
            const labelA = CATEGORY_LABELS[a] || a;
            const labelB = CATEGORY_LABELS[b] || b;
            return labelA.localeCompare(labelB);
        });
        return [...filtered, 'AUTRE'];
    }, [data?.getPrestationCatalog]);

    // --- LOGIC: DYNAMIC UNITS ---
    // Cette logique assure que si une unité (ex: "PAX/JOUR") vient de la DB et n'est pas dans la liste par défaut, elle est ajoutée.
    const unitOptions = useMemo(() => {
        const defaultUnits = ["U", "J", "H", "m2", "ml", "Ens", "FORFAIT", "PAX", "PAX/JOUR"];
        if (unit && !defaultUnits.includes(unit)) {
            return [...defaultUnits, unit];
        }
        return defaultUnits;
    }, [unit]);

    const groupedItems = useMemo(() => {
        if (!data?.getInvoiceItems) return {};
        return data.getInvoiceItems.reduce((acc: any, item: any) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});
    }, [data?.getInvoiceItems]);

    const grandTotal = data?.getInvoiceItems?.reduce((acc: number, i: any) => acc + i.totalPrice, 0) || 0;

    const currentConfig = CATEGORY_CONFIG[category] || [];
    const availableSubCats = CATEGORY_SUBCATEGORIES[category] || [];

    return (
        <div className="space-y-6">
            {/* HEADER & SUMMARY */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <IconCalculator size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Estimatif</p>
                        <h2 className="text-2xl font-bold text-foreground">
                            {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(grandTotal)}
                        </h2>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} className="h-9">
                        {importing ? <IconLoader className="animate-spin w-4 h-4 mr-2" /> : <IconFileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />}
                        Import Excel
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileUpload} />

                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button size="sm" className="shadow-md h-9">
                                <IconPlus className="w-4 h-4 mr-2" /> Ajouter Ligne
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-[540px] w-full p-0 flex flex-col bg-background/95 backdrop-blur-sm">
                            <SheetHeader className="px-6 py-4 border-b bg-muted/30">
                                <SheetTitle>Ajouter une prestation</SheetTitle>
                                <SheetDescription>Configurez les détails techniques de l'article.</SheetDescription>
                            </SheetHeader>

                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-6">
                                    {/* 1. CLASSIFICATION */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <IconPackage className="w-3 h-3" /> Classification
                                        </h4>
                                        <div className="grid gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
                                            <div className="grid gap-2">
                                                <Label className="text-xs font-medium">Catégorie Principale</Label>
                                                <Select value={category} onValueChange={setCategory}>
                                                    <SelectTrigger className="bg-background font-medium h-9">
                                                        <SelectValue placeholder="Toutes les catégories (Recherche globale)" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                        <SelectItem value="ALL">
                                                            <span className="font-semibold text-primary">Toutes les catégories</span>
                                                        </SelectItem>
                                                        {uniqueCategories.map((cat: string) => (
                                                            <SelectItem key={cat} value={cat}>
                                                                {CATEGORY_LABELS[cat] || cat}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label className="text-xs font-medium flex items-center justify-between">
                                                    Sous-Catégorie
                                                    {(!category || category === "ALL") && <span className="text-[10px] text-muted-foreground">(Sélectionnez une catégorie)</span>}
                                                </Label>
                                                <Select value={subCategory} onValueChange={setSubCategory} disabled={!category || category === "ALL"}>
                                                    <SelectTrigger className="bg-background h-9"><SelectValue placeholder="Filtrer par sous-catégorie..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ALL">Toutes</SelectItem>
                                                        {availableSubCats.map((sub: string) => (
                                                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                                        ))}
                                                        <SelectItem value="Autre">Autre</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. DESIGNATION */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <IconInfoCircle className="w-3 h-3" /> Détails Article
                                        </h4>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-medium">Désignation</Label>
                                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" role="combobox" className="justify-between w-full font-normal bg-background text-left h-10 border-input hover:bg-accent/50 hover:text-accent-foreground">
                                                        {designation || <span className="text-muted-foreground">Rechercher ou saisir un nom...</span>}
                                                        <IconSearch className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-0 w-[400px]" align="start" side="bottom">
                                                    <Command shouldFilter={false} className="rounded-lg border shadow-md">
                                                        <CommandInput placeholder="Chercher un article..." onValueChange={setDesignation} className="h-9" />
                                                        <CommandList>
                                                            <CommandEmpty className="py-3 px-4 text-sm text-center text-muted-foreground">
                                                                Appuyez sur "Ajouter" pour créer <span className="font-bold text-primary">{designation}</span>
                                                            </CommandEmpty>
                                                            <CommandGroup heading="Catalogue">
                                                                {searchData?.searchPrestation?.map((item: any) => (
                                                                    <CommandItem key={item.id} onSelect={() => {
                                                                        setDesignation(item.designation);
                                                                        setUnitPrice(item.unitPrice || 0);

                                                                        // ✅ FIX: Unit Auto-Set
                                                                        setUnit(item.unit || "U");

                                                                        if ((!category || category === "ALL") && item.category) {
                                                                            setCategory(item.category);
                                                                            if (item.subCategory) setSubCategory(item.subCategory);
                                                                        }
                                                                        try {
                                                                            if (item.description && item.description.startsWith('{')) {
                                                                                setDynamicFields(JSON.parse(item.description));
                                                                            }
                                                                        } catch (e) { }
                                                                        setOpenCombobox(false);
                                                                    }} className="cursor-pointer">
                                                                        <div className="flex flex-col w-full gap-1">
                                                                            <span className="font-medium">{item.designation}</span>
                                                                            <div className="flex items-center text-[10px] text-muted-foreground/80">
                                                                                <span className={cn("uppercase font-semibold", CATEGORY_COLORS[item.category] ? "text-primary" : "")}>
                                                                                    {CATEGORY_LABELS[item.category] || item.category}
                                                                                </span>
                                                                                <IconChevronRight className="w-3 h-3 mx-1 opacity-50" />
                                                                                <span>{item.subCategory || 'Standard'}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center mt-1 border-t border-dashed pt-1">
                                                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{item.unit || 'U'}</span>
                                                                                <span className="text-[10px] font-mono font-bold text-foreground">{item.unitPrice} MAD</span>
                                                                            </div>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>

                                    {/* 3. CHAMPS DYNAMIQUES */}
                                    {currentConfig.length > 0 ? (
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <IconSettings className="w-3 h-3" /> Spécifications Techniques
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
                                                {currentConfig.map((field) => (
                                                    <div key={field.key} className={cn("space-y-1.5", field.type === 'textarea' ? "col-span-2" : "col-span-1")}>
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs text-muted-foreground font-medium">{field.label}</Label>
                                                            {field.hint && (
                                                                <TooltipProvider>
                                                                    <Tooltip delayDuration={300}>
                                                                        <TooltipTrigger>
                                                                            <IconAlertCircle className="w-3 h-3 text-muted-foreground/50 hover:text-primary cursor-help" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="text-xs bg-popover text-popover-foreground border shadow-sm">
                                                                            <p>{field.hint}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                        {field.type === 'select' ? (
                                                            <Select
                                                                value={dynamicFields[field.key] || ""}
                                                                onValueChange={(v) => setDynamicFields(prev => ({ ...prev, [field.key]: v }))}
                                                            >
                                                                <SelectTrigger className="h-9 text-sm bg-background"><SelectValue placeholder={field.placeholder || "-"} /></SelectTrigger>
                                                                <SelectContent>
                                                                    {field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : field.type === 'date' ? (
                                                            <Input
                                                                type="date"
                                                                className="h-9 text-sm bg-background"
                                                                value={dynamicFields[field.key] || ""}
                                                                onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                            />
                                                        ) : field.type === 'textarea' ? (
                                                            <Textarea
                                                                className="min-h-[80px] text-sm bg-background resize-none focus-visible:ring-1"
                                                                placeholder={field.placeholder}
                                                                value={dynamicFields[field.key] || ""}
                                                                onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <Input
                                                                type={field.type}
                                                                placeholder={field.placeholder}
                                                                className="h-9 text-sm bg-background focus-visible:ring-1"
                                                                value={dynamicFields[field.key] || ""}
                                                                onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <IconSettings className="w-3 h-3" /> Description Libre
                                            </h4>
                                            <Textarea
                                                className="min-h-[100px] bg-background border-dashed"
                                                placeholder="Ajoutez des détails, dimensions, contraintes..."
                                                value={dynamicFields['desc'] || ""}
                                                onChange={(e) => setDynamicFields(prev => ({ ...prev, 'desc': e.target.value }))}
                                            />
                                        </div>
                                    )}

                                    {/* 4. QUANTIFICATION */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <IconCalculator className="w-3 h-3" /> Quantification
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium">Quantité</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        className="h-10 text-base font-semibold bg-background pr-12"
                                                        value={quantity}
                                                        onChange={e => setQuantity(Number(e.target.value))}
                                                    />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-1">
                                                        {/* ✅ FIX: Using the Dynamic unitOptions Loop */}
                                                        <Select value={unit} onValueChange={setUnit}>
                                                            <SelectTrigger className="h-8 w-[90px] border-0 bg-transparent focus:ring-0 text-xs text-muted-foreground hover:text-foreground">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent align="end">
                                                                {unitOptions.map((u) => (
                                                                    <SelectItem key={u} value={u}>
                                                                        {UNIT_LABELS[u] || u}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium">Prix Unitaire (MAD)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    className="h-10 text-base font-semibold bg-background"
                                                    value={unitPrice}
                                                    onChange={e => setUnitPrice(Number(e.target.value))}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10 flex justify-between items-center shadow-sm">
                                            <span className="font-medium text-sm text-primary/80">Total Ligne HT</span>
                                            <span className="text-2xl font-bold text-primary tracking-tight">
                                                {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(quantity * unitPrice)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            <SheetFooter className="p-4 border-t bg-muted/30">
                                <Button onClick={handleAdd} disabled={adding} className="w-full h-11 text-base shadow-md font-semibold">
                                    {adding ? (
                                        <><IconLoader className="mr-2 animate-spin w-5 h-5" /> Traitement...</>
                                    ) : (
                                        <><IconPlus className="mr-2 w-5 h-5" /> Ajouter au devis</>
                                    )}
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* LISTING GROUPÉ PAR CATÉGORIE */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <IconPackage className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm text-muted-foreground animate-pulse">Chargement des prestations...</p>
                </div>
            ) : Object.keys(groupedItems).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => setIsSheetOpen(true)}>
                    <div className="p-4 rounded-full bg-background border shadow-sm mb-4">
                        <IconPackage className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Aucune prestation</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-6">Le devis est vide. Commencez par ajouter des lignes manuellement ou importez un fichier Excel.</p>
                    <Button variant="outline" className="gap-2">
                        <IconPlus className="w-4 h-4" /> Ajouter une première ligne
                    </Button>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {Object.entries(groupedItems).map(([catKey, items]: [string, any]) => (
                        <Card key={catKey} className="overflow-hidden shadow-sm border bg-card/50">
                            <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between group-hover:bg-muted/40 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className={cn("rounded-sm px-2.5 py-0.5 uppercase text-[10px] tracking-wider font-bold shadow-sm border-0", CATEGORY_COLORS[catKey] || CATEGORY_COLORS['AUTRE'])}>
                                        {CATEGORY_LABELS[catKey] || catKey}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                                        {items.length} article{items.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <span className="text-sm font-bold font-mono bg-background px-2 py-1 rounded border shadow-sm">
                                    {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(items.reduce((s: number, i: any) => s + i.totalPrice, 0))}
                                </span>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/5">
                                            <TableHead className="pl-4 w-[45%] font-semibold">Désignation & Détails</TableHead>
                                            <TableHead className="text-center w-[15%] font-semibold">Quantité</TableHead>
                                            <TableHead className="text-right w-[15%] font-semibold">P.U (HT)</TableHead>
                                            <TableHead className="text-right w-[20%] pr-6 font-semibold">Total (HT)</TableHead>
                                            <TableHead className="w-[5%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item: any) => (
                                            <TableRow key={item.id} className="group border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                <TableCell className="pl-4 py-3 align-top">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                                                            {item.designation}
                                                            {item.subCategory && item.subCategory !== 'Divers' && (
                                                                <Badge variant="secondary" className="text-[9px] h-4 px-1 rounded-sm font-normal text-muted-foreground/70">
                                                                    {item.subCategory}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {item.description && renderDetails(item.description)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center py-3 align-top">
                                                    <div className="inline-flex flex-col items-center justify-center bg-muted/30 px-2 py-1 rounded border border-border/50">
                                                        <span className="font-mono text-sm font-medium">{item.quantity}</span>
                                                        <span className="text-[9px] text-muted-foreground uppercase">{item.unit || 'U'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-3 align-top">
                                                    <span className="font-mono text-sm text-muted-foreground">
                                                        {item.unitPrice.toLocaleString('fr-FR')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right py-3 pr-6 align-top">
                                                    <span className="font-mono text-sm font-bold text-foreground">
                                                        {(item.quantity * item.unitPrice).toLocaleString('fr-FR')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right py-3 pr-4 align-top">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                                        onClick={() => { if (confirm("Voulez-vous vraiment supprimer cet article ?")) deleteItem({ variables: { id: item.id } }); }}
                                                    >
                                                        <IconTrash className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}