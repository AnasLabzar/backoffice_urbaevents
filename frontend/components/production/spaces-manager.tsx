"use client";

import React, { useState } from "react";
import {
    IconPlus, IconTrash, IconLayoutGrid, IconList, IconMap,
    IconMaximize, IconRuler, IconUsers, IconX, IconGripVertical,
    IconInfoCircle, IconArrowRight, IconArmchair, IconDeviceTv, IconCoffee,
    IconAlertTriangle, IconDoor, IconBarrierBlock, IconArrowsMove, IconCompass
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// --- TYPES ---
export interface Space {
    id: string;
    name: string;
    surface: number; 
    capacity: number; 
    type: string;
    x: number; 
    y: number; 
    w: number; 
    h: number; 
    // 👇 ADD THESE TWO LINES
    rotation?: number; 
    badge?: string;
    features?: string[]; // Kept for backward compatibility if needed, but 'badge' is the main one now
}

interface SpacesManagerProps {
    spaces: Space[];
    onChange: (spaces: Space[]) => void;
}

// --- CONSTANTS ---
const SPACE_TYPES = [
    { value: "PLENIERE", label: "Plénière / Conférence", color: "bg-blue-600", border: "border-blue-200", icon: IconUsers },
    { value: "SCENE", label: "Scène / Podiums", color: "bg-purple-600", border: "border-purple-200", icon: IconDeviceTv },
    { value: "ATELIER", label: "Atelier / Breakout", color: "bg-emerald-500", border: "border-emerald-200", icon: IconLayoutGrid },
    { value: "STAND", label: "Exposition (Stand)", color: "bg-amber-500", border: "border-amber-200", icon: IconMap },
    { value: "RESTAURATION", label: "Traiteur / Buffet", color: "bg-rose-500", border: "border-rose-200", icon: IconCoffee },
    { value: "VIP", label: "VIP / Loges", color: "bg-indigo-500", border: "border-indigo-200", icon: IconArmchair },
    { value: "ACCUEIL", label: "Accueil / Check-in", color: "bg-cyan-500", border: "border-cyan-200", icon: IconInfoCircle },
    { value: "TECHNIQUE", label: "Régie / Technique", color: "bg-slate-700", border: "border-slate-300", icon: IconRuler },
    { value: "ACCES", label: "Zone de Passage", color: "bg-slate-400", border: "border-slate-200", icon: IconDoor },
    { value: "ZONE_VIDE", label: "Espace Vide / Sécu", color: "bg-red-100/50", border: "border-red-200 dashed", text: "text-red-500", icon: IconBarrierBlock },
    { value: "AUTRE", label: "Autre", color: "bg-slate-400", border: "border-slate-200", icon: IconMap },
];

const SPACE_FEATURES = [
    { value: "EXIT", label: "Sortie", icon: IconArrowRight, color: "bg-green-100 text-green-700 border-green-200" },
    { value: "EMERGENCY", label: "Sortie Secours", icon: IconAlertTriangle, color: "bg-red-100 text-red-700 border-red-200" },
    { value: "ENTRANCE", label: "Entrée Principale", icon: IconDoor, color: "bg-blue-100 text-blue-700 border-blue-200" },
];

const GRID_COLS = 12;
const GRID_ROWS = 12;

export function SpacesManager({ spaces = [], onChange }: SpacesManagerProps) {
    const [view, setView] = useState<"list" | "plan">("plan");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(true);
    const [isMoving, setIsMoving] = useState(false);

    // --- ALGORITHME "TETRIS" ---
    const findFreeSpot = (w: number, h: number) => {
        for (let y = 0; y <= GRID_ROWS - h; y++) {
            for (let x = 0; x <= GRID_COLS - w; x++) {
                const collision = spaces.some(s =>
                    x < s.x + s.w && x + w > s.x &&
                    y < s.y + s.h && y + h > s.y
                );
                if (!collision) return { x, y };
            }
        }
        return { x: 0, y: 0 };
    };

    // --- ACTIONS ---
    const addSpace = () => {
        const defaultW = 3;
        const defaultH = 2;
        const pos = findFreeSpot(defaultW, defaultH);

        const newSpace: Space = {
            id: crypto.randomUUID(),
            name: `Zone ${spaces.length + 1}`,
            surface: 50,
            capacity: 20,
            type: "AUTRE",
            x: pos.x,
            y: pos.y,
            w: defaultW,
            h: defaultH,
            features: []
        };

        onChange([...spaces, newSpace]);
        setSelectedId(newSpace.id);
        setView("plan");
    };

    const updateSpace = (id: string, field: keyof Space, value: any) => {
        let val = value;
        if (typeof value === 'number') {
            if (field === 'x' && val + (spaces.find(s => s.id === id)?.w || 0) > GRID_COLS) val = GRID_COLS - (spaces.find(s => s.id === id)?.w || 0);
            if (field === 'y' && val + (spaces.find(s => s.id === id)?.h || 0) > GRID_ROWS) val = GRID_ROWS - (spaces.find(s => s.id === id)?.h || 0);
            if (val < 0) val = 0;
        }

        const updatedSpaces = spaces.map(s => {
            if (s.id === id) {
                return { ...s, [field]: val };
            }
            return s;
        });
        onChange(updatedSpaces);
    };

    const toggleFeature = (id: string, feature: string) => {
        const space = spaces.find(s => s.id === id);
        if (!space) return;

        const currentFeatures = space.features || [];
        const newFeatures = currentFeatures.includes(feature)
            ? currentFeatures.filter(f => f !== feature)
            : [...currentFeatures, feature];

        updateSpace(id, 'features', newFeatures);
    };

    const removeSpace = (id: string) => {
        onChange(spaces.filter(s => s.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const selectedSpace = spaces.find(s => s.id === selectedId);

    const isColliding = (curr: Space) => {
        return spaces.some(s =>
            s.id !== curr.id &&
            curr.x < s.x + s.w && curr.x + curr.w > s.x &&
            curr.y < s.y + s.h && curr.y + curr.h > s.y
        );
    };

    const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isMoving || !selectedId || !selectedSpace) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const cellW = rect.width / GRID_COLS;
        const cellH = rect.height / GRID_ROWS;
        const clickX = Math.floor((e.clientX - rect.left) / cellW);
        const clickY = Math.floor((e.clientY - rect.top) / cellH);
        updateSpace(selectedId, 'x', clickX);
        updateSpace(selectedId, 'y', clickY);
        setIsMoving(false);
    };

    const totalSurf = spaces.reduce((acc, s) => acc + (Number(s.surface) || 0), 0);
    const totalPax = spaces.reduce((acc, s) => acc + (Number(s.capacity) || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* 1. HEADER */}
            <div className="flex flex-col gap-4 border-b pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><IconMap className="w-6 h-6" /></div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground leading-tight">Plan de Masse</h3>
                            <p className="text-xs text-muted-foreground">Définition des zones et implantation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                            <TabsList className="h-9">
                                <TabsTrigger value="plan" className="h-7 text-xs px-3"><IconLayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Plan</TabsTrigger>
                                <TabsTrigger value="list" className="h-7 text-xs px-3"><IconList className="w-3.5 h-3.5 mr-1.5" /> Liste</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button size="sm" onClick={addSpace} className="h-9 text-xs gap-1.5 shadow-sm"><IconPlus className="w-4 h-4" /> Ajouter Zone</Button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <MetricCard label="Zones" value={spaces.length} />
                    <MetricCard label="Surface Totale" value={totalSurf} unit="m²" />
                    <MetricCard label="Capacité Totale" value={totalPax} unit="pax" />
                </div>
            </div>

            {/* 2. PLAN VIEW */}
            {view === "plan" && (
                <div className="relative flex flex-col gap-6">

                    {/* ORIENTATION LABELS */}
                    <div className="relative w-full aspect-square md:aspect-[16/10] bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed relative overflow-hidden shadow-inner transition-all group">

                        {/* Compass Rose Effect */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background/50 px-2 rounded">Nord</div>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background/50 px-2 rounded">Sud</div>
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest -rotate-90 bg-background/50 px-2 rounded">Ouest</div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest rotate-90 bg-background/50 px-2 rounded">Est</div>

                        {/* GRID CONTAINER */}
                        <div
                            className={cn("absolute inset-6 cursor-default transition-all", isMoving && "cursor-crosshair ring-2 ring-primary/20 bg-primary/5 rounded-lg")}
                            onClick={handleGridClick}
                        >
                            {/* Grid Lines */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.08]"
                                style={{ backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`, backgroundSize: `${100 / GRID_COLS}% ${100 / GRID_ROWS}%` }}>
                            </div>

                            {/* ZONES */}
                            <div className="absolute inset-0 grid gap-1"
                                style={{
                                    gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                                    gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`
                                }}>

                                {spaces.map((space) => {
                                    const isSel = selectedId === space.id;
                                    const isErr = isColliding(space);
                                    const typeInfo = SPACE_TYPES.find(t => t.value === space.type) || SPACE_TYPES[SPACE_TYPES.length - 1];

                                    return (
                                        <div
                                            key={space.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedId(space.id);
                                                setIsMoving(false);
                                            }}
                                            className={cn(
                                                "relative rounded-md flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-200 select-none border shadow-sm group pointer-events-auto hover:z-20",
                                                typeInfo.color,
                                                isSel ? "ring-2 ring-offset-2 ring-primary z-30 scale-[1.02] shadow-xl" : "opacity-90 hover:opacity-100 hover:scale-[1.01] z-10",
                                                isErr && "ring-2 ring-red-500 animate-pulse z-40 opacity-100",
                                                isMoving && isSel && "opacity-50 border-dashed border-2"
                                            )}
                                            style={{
                                                gridColumnStart: (space.x || 0) + 1,
                                                gridColumnEnd: `span ${space.w || 1}`,
                                                gridRowStart: (space.y || 0) + 1,
                                                gridRowEnd: `span ${space.h || 1}`
                                            }}
                                        >
                                            {/* Badges for Features (Exits etc) */}
                                            <div className="absolute -top-1.5 -right-1.5 flex flex-col gap-0.5 z-50">
                                                {space.features?.map(f => {
                                                    const feat = SPACE_FEATURES.find(sf => sf.value === f);
                                                    if (!feat) return null;
                                                    const Icon = feat.icon;
                                                    return (
                                                        <div key={f} className={cn("w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-white/50 text-[8px]", feat.color)}>
                                                            <Icon className="w-2.5 h-2.5" />
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {isSel && <IconGripVertical className="absolute top-1 right-1 w-3 h-3 text-white/70" />}

                                            <div className="text-center w-full overflow-hidden text-white drop-shadow-md p-1">
                                                <span className="font-bold text-[9px] md:text-[10px] leading-tight truncate block">
                                                    {space.name}
                                                </span>
                                                {space.w > 1 && space.h > 1 && (
                                                    <span className="text-white/80 text-[8px] font-mono mt-0.5 block">
                                                        {space.surface}m²
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {spaces.length === 0 && !showGuide && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 pointer-events-none">
                                <IconLayoutGrid className="w-16 h-16 mb-3" />
                                <span className="text-sm font-medium uppercase tracking-widest">Terrain Vide</span>
                            </div>
                        )}
                    </div>

                    {/* 3. EDITOR PANEL */}
                    {selectedSpace ? (
                        <Card className="border-l-4 border-l-primary shadow-lg animate-in slide-in-from-bottom-4 bg-background">
                            <div className="flex justify-between items-center px-4 py-3 bg-muted/30 border-b">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-background", SPACE_TYPES.find(t => t.value === selectedSpace.type)?.color)} />
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Propriétés</span>
                                        <span className="text-sm font-bold text-foreground">{selectedSpace.name}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant={isMoving ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-[10px] gap-1"
                                        onClick={() => setIsMoving(!isMoving)}
                                    >
                                        <IconArrowsMove className="w-3 h-3" /> {isMoving ? "Annuler" : "Déplacer"}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted" onClick={() => setSelectedId(null)}>
                                        <IconX className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-5 space-y-6">
                                {/* Identity */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80">Nom de la zone</Label>
                                        <Input
                                            value={selectedSpace.name}
                                            onChange={(e) => updateSpace(selectedSpace.id, "name", e.target.value)}
                                            className="h-9 bg-muted/10 font-medium border-muted-foreground/20"
                                            placeholder="Ex: Scène Principale"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80">Type d'espace</Label>
                                        <Select value={selectedSpace.type} onValueChange={(v) => updateSpace(selectedSpace.id, "type", v)}>
                                            <SelectTrigger className="h-9 bg-muted/10 border-muted-foreground/20"><SelectValue /></SelectTrigger>
                                            <SelectContent className="max-h-[240px]">
                                                {SPACE_TYPES.map(t => (
                                                    <SelectItem key={t.value} value={t.value}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("w-2 h-2 rounded-full", t.color)} />
                                                            <span className="text-xs font-medium">{t.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Features (Exits, Entrances) */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Caractéristiques & Accès</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {SPACE_FEATURES.map(feat => {
                                            const isActive = (selectedSpace.features || []).includes(feat.value);
                                            const Icon = feat.icon;
                                            return (
                                                <div
                                                    key={feat.value}
                                                    onClick={() => toggleFeature(selectedSpace.id, feat.value)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-medium cursor-pointer transition-all select-none",
                                                        isActive ? feat.color : "bg-background border-muted text-muted-foreground hover:border-primary/30"
                                                    )}
                                                >
                                                    <Icon className="w-3 h-3" />
                                                    {feat.label}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Dimensions */}
                                    <div className="bg-muted/10 rounded-lg p-3 border border-border/50">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-3 block">Capacité & Surface</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Surface (m²)</Label>
                                                <Input type="number" value={selectedSpace.surface} onChange={(e) => updateSpace(selectedSpace.id, "surface", parseFloat(e.target.value))} className="h-8 pl-2 text-xs font-mono bg-background" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Capacité</Label>
                                                <Input type="number" value={selectedSpace.capacity} onChange={(e) => updateSpace(selectedSpace.id, "capacity", parseInt(e.target.value))} className="h-8 pl-2 text-xs font-mono bg-background" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Position GRID Control */}
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100 dark:border-blue-900">
                                        <Label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-3 block">Géométrie (Grille)</Label>
                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-blue-500">X</Label>
                                                <Input type="number" min={0} max={GRID_COLS - 1} value={selectedSpace.x} onChange={(e) => updateSpace(selectedSpace.id, "x", parseInt(e.target.value))} className="h-7 text-xs text-center px-0 bg-background font-mono" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-blue-500">Y</Label>
                                                <Input type="number" min={0} max={GRID_ROWS - 1} value={selectedSpace.y} onChange={(e) => updateSpace(selectedSpace.id, "y", parseInt(e.target.value))} className="h-7 text-xs text-center px-0 bg-background font-mono" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-orange-500">Larg.</Label>
                                                <Input type="number" min={1} max={GRID_COLS} value={selectedSpace.w} onChange={(e) => updateSpace(selectedSpace.id, "w", parseInt(e.target.value))} className="h-7 text-xs text-center px-0 bg-background border-orange-200 font-mono" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-orange-500">Haut.</Label>
                                                <Input type="number" min={1} max={GRID_ROWS} value={selectedSpace.h} onChange={(e) => updateSpace(selectedSpace.id, "h", parseInt(e.target.value))} className="h-7 text-xs text-center px-0 bg-background border-orange-200 font-mono" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2 border-t">
                                    <Button variant="destructive" size="sm" className="h-8 text-xs gap-2" onClick={() => removeSpace(selectedSpace.id)}>
                                        <IconTrash className="w-3.5 h-3.5" /> Supprimer la zone
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div className="text-center text-xs text-muted-foreground py-8 italic bg-muted/5 rounded-xl border border-dashed border-muted-foreground/10 flex flex-col items-center gap-3">
                            <div className="p-3 bg-muted rounded-full"><IconMap className="w-6 h-6 opacity-30" /></div>
                            <span>Sélectionnez une zone sur le plan pour modifier ses propriétés (Taille, Position, Type).</span>
                        </div>
                    )}
                </div>
            )}

            {/* LIST VIEW */}
            {view === "list" && (
                <ScrollArea className="h-[400px] pr-3">
                    <div className="grid grid-cols-1 gap-3">
                        {spaces.map((space) => {
                            const typeInfo = SPACE_TYPES.find(t => t.value === space.type) || SPACE_TYPES[SPACE_TYPES.length - 1];
                            const Icon = typeInfo.icon || IconMap;
                            return (
                                <div key={space.id} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:bg-muted/20 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm", typeInfo.color)}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-foreground">{space.name}</p>
                                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-background border-muted-foreground/30 text-muted-foreground">
                                                    {typeInfo.label}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><IconMaximize className="w-3 h-3" /> {space.surface} m²</span>
                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><IconUsers className="w-3 h-3" /> {space.capacity} pax</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setSelectedId(space.id); setView("plan"); }}>
                                        <IconArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )
                        })}
                        {spaces.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">Aucune zone définie.</div>}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}

// Helper for Metrics
function MetricCard({ label, value, unit }: any) {
    return (
        <div className="bg-card border p-3 rounded-xl flex flex-col items-center justify-center shadow-sm text-center">
            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{label}</span>
            <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold tracking-tight text-foreground">{value}</span>
                {unit && <span className="text-[10px] text-muted-foreground font-medium">{unit}</span>}
            </div>
        </div>
    )
}