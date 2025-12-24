"use client";

import React from "react";
import {
    IconLayoutGrid, IconPlus, IconMaximize,
    IconUsers, IconArmchair, IconX, IconAlertTriangle, IconInfoCircle, IconCheck
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Types
export interface Space {
    id: string;
    name: string;
    surface: number; // m2
    capacity: number; // pax
    type: string;
}

interface SpacesManagerProps {
    spaces: Space[];
    onChange: (spaces: Space[]) => void;
}

export function SpacesManager({ spaces = [], onChange }: SpacesManagerProps) {

    // --- CALCULS INTELLIGENTS (KPIs) ---
    const totalSurface = spaces.reduce((acc, curr) => acc + (Number(curr.surface) || 0), 0);
    const totalCapacity = spaces.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0);

    // Densité globale (m² par personne)
    const globalDensity = totalCapacity > 0 ? (totalSurface / totalCapacity).toFixed(1) : "0";

    // Helper: Calculer le statut d'une zone spécifique (Densité)
    const getZoneStatus = (surface: number, capacity: number) => {
        if (!surface || !capacity) return { color: "bg-slate-100 text-slate-500 border-slate-200", label: "À définir", icon: IconInfoCircle };

        const density = capacity / surface; // Pax par m2

        // Normes événementielles (Approximatif)
        // < 1.5 pax/m2 = Confort
        // 1.5 - 2.5 pax/m2 = Dense (Cocktail standard)
        // > 3 pax/m2 = Danger / Trop serré

        if (density > 3) return { color: "bg-red-50 text-red-600 border-red-200", label: "Saturé (Danger)", icon: IconAlertTriangle };
        if (density > 1.5) return { color: "bg-amber-50 text-amber-600 border-amber-200", label: "Dense", icon: IconUsers };
        return { color: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Confortable", icon: IconCheck };
    };

    // --- ACTIONS ---
    const addSpace = () => {
        const newSpace: Space = {
            id: `temp-${Date.now()}`,
            name: `Zone ${spaces.length + 1}`,
            surface: 0,
            capacity: 0,
            type: "RECEPTION"
        };
        onChange([...spaces, newSpace]);
    };

    const removeSpace = (index: number) => {
        const newSpaces = [...spaces];
        newSpaces.splice(index, 1);
        onChange(newSpaces);
    };

    const updateSpace = (index: number, field: keyof Space, value: any) => {
        const newSpaces = [...spaces];
        newSpaces[index] = { ...newSpaces[index], [field]: value };
        onChange(newSpaces);
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">

            {/* HEADER & GLOBAL KPI */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b pb-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold uppercase flex items-center gap-2 text-foreground">
                        <IconLayoutGrid className="w-5 h-5 text-primary" /> Zonage & Densité
                    </h3>
                    <p className="text-xs text-muted-foreground">Découpage technique et analyse de sécurité.</p>
                </div>

                {/* KPI Display */}
                <div className="flex gap-3">
                    <div className="hidden md:flex flex-col items-end mr-2 justify-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Moyenne</span>
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border",
                            Number(globalDensity) < 1 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                        )}>
                            {globalDensity} m²/pers
                        </span>
                    </div>
                    <div className="h-8 w-px bg-border hidden md:block mx-1"></div>
                    <div className="px-3 py-1.5 bg-background rounded-lg border shadow-sm flex flex-col items-center min-w-[80px]">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Total m²</span>
                        <span className="text-base font-mono font-bold text-foreground">{totalSurface}</span>
                    </div>
                    <div className="px-3 py-1.5 bg-background rounded-lg border shadow-sm flex flex-col items-center min-w-[80px]">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Total Pax</span>
                        <span className="text-base font-mono font-bold text-foreground">{totalCapacity}</span>
                    </div>
                </div>
            </div>

            {/* --- GUIDE FOR FIRST STEP (EMPTY STATE) --- */}
            {/* C'est ici que l'expérience utilisateur commence */}
            {spaces.length === 0 && (
                <Alert className="bg-primary/5 border-primary/20 border-dashed mb-4">
                    <IconInfoCircle className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-bold text-sm">Aucune zone définie</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-xs mt-1 flex flex-col gap-3">
                        <p>Pour générer un devis technique précis, commencez par découper votre événement en zones (ex: Zone Traiteur, Scène, Accueil...).</p>
                        <Button size="sm" onClick={addSpace} className="w-fit gap-2 shadow-md">
                            <IconPlus className="w-4 h-4" /> Créer la Zone 1
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* GRID LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {spaces.map((space, index) => {
                    const status = getZoneStatus(space.surface, space.capacity);
                    const StatusIcon = status.icon;

                    return (
                        <Card key={index} className="group relative overflow-hidden border border-border hover:border-primary/50 transition-all bg-card hover:shadow-md">

                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

                            {/* Remove Button with Tooltip */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => removeSpace(index)}>
                                                <IconX className="w-3 h-3" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Supprimer cette zone</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <CardContent className="p-4 space-y-4">
                                {/* Zone Header */}
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 mt-1">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Input
                                            value={space.name}
                                            onChange={(e) => updateSpace(index, 'name', e.target.value)}
                                            className="font-bold border-transparent hover:border-input focus:border-input bg-transparent px-2 h-8 -ml-2 text-sm transition-all placeholder:text-muted-foreground/50"
                                            placeholder="Nommez la zone..."
                                        />
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={cn("text-[10px] h-5 gap-1 font-medium border", status.color)}>
                                                <StatusIcon className="w-3 h-3" /> {status.label}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-border/50 w-full" />

                                {/* Inputs Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                                            <IconMaximize className="w-3 h-3" /> Surface (m²)
                                        </Label>
                                        <div className="relative group/input">
                                            <Input
                                                type="number"
                                                className="h-9 bg-muted/30 font-mono text-sm pr-8 transition-colors group-hover/input:bg-background"
                                                value={space.surface || ''}
                                                placeholder="0"
                                                onChange={(e) => updateSpace(index, 'surface', parseFloat(e.target.value))}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">m²</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                                            <IconUsers className="w-3 h-3" /> Capacité
                                        </Label>
                                        <div className="relative group/input">
                                            <Input
                                                type="number"
                                                className="h-9 bg-muted/30 font-mono text-sm pr-8 transition-colors group-hover/input:bg-background"
                                                value={space.capacity || ''}
                                                placeholder="0"
                                                onChange={(e) => updateSpace(index, 'capacity', parseInt(e.target.value))}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">pax</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Type Selection */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                                        <IconArmchair className="w-3 h-3" /> Configuration
                                    </Label>
                                    <Select value={space.type} onValueChange={(v) => updateSpace(index, 'type', v)}>
                                        <SelectTrigger className="h-8 text-xs bg-muted/30 border-input/50">
                                            <SelectValue placeholder="Choisir..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="RECEPTION">🍸 Cocktail / Debout</SelectItem>
                                            <SelectItem value="CONFERENCE">🎤 Conférence / Theatre</SelectItem>
                                            <SelectItem value="DINNER">🍽️ Dîner Assis (Banquet)</SelectItem>
                                            <SelectItem value="EXHIBITION">🖼️ Exposition / Stands</SelectItem>
                                            <SelectItem value="LOUNGE">🛋️ Lounge / Chill</SelectItem>
                                            <SelectItem value="SCENE">🎭 Scène & Technique</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>

                            {/* Warning Footer if dangerous */}
                            {Number(space.capacity) / Number(space.surface) > 3 && (
                                <div className="bg-red-50/50 px-4 py-2 flex items-center gap-2 border-t border-red-100 animate-pulse">
                                    <IconAlertTriangle className="w-3 h-3 text-red-600" />
                                    <span className="text-[10px] text-red-600 font-bold">Alerte : Densité critique !</span>
                                </div>
                            )}

                            {/* Color Strip Indicator */}
                            <div className={cn("h-1 w-full absolute bottom-0 transition-colors",
                                space.type === 'RECEPTION' ? "bg-amber-400" :
                                    space.type === 'CONFERENCE' ? "bg-blue-400" :
                                        space.type === 'SCENE' ? "bg-purple-500" : "bg-slate-300"
                            )} />
                        </Card>
                    )
                })}

                {/* PERMANENT ADD BUTTON (Keep visible for flow) */}
                {spaces.length > 0 && (
                    <button
                        onClick={addSpace}
                        className="flex flex-col items-center justify-center gap-2 h-full min-h-[220px] rounded-xl border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all group opacity-60 hover:opacity-100"
                    >
                        <div className="h-10 w-10 rounded-full bg-background border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform text-primary">
                            <IconPlus className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">Ajouter une Zone</span>
                    </button>
                )}
            </div>
        </div>
    );
}