"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { IconSparkles, IconCheck, IconTrash, IconPlus, IconBrain, IconListCheck, IconPalette } from '@tabler/icons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface AIAnalysisData {
    prestations: {
        designation: string;
        category: string;
        subCategory: string;
        quantity: number;
        unitPrice: number;
        description: string;
        isNew?: boolean;
        matchedPrestationId?: string;
    }[];
}

interface AIAnalysisModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: AIAnalysisData | null;
    onSave: (data: AIAnalysisData) => void;
    generatingTasks?: boolean;
}

export function AIAnalysisModal({ open, onOpenChange, data, onSave, generatingTasks }: AIAnalysisModalProps) {
    const [localData, setLocalData] = useState<AIAnalysisData | null>(data);

    // Mettre à jour l'état local quand les données changent
    React.useEffect(() => {
        if (data) setLocalData(JSON.parse(JSON.stringify(data)));
    }, [data]);

    if (!localData) return null;

    const handleSave = () => {
        if (localData) onSave(localData);
    };

    const removePrestation = (index: number) => {
        const newData = { ...localData };
        newData.prestations.splice(index, 1);
        setLocalData(newData);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
    };

    const knownPrestations = localData.prestations.map((p, originalIdx) => ({ ...p, originalIdx })).filter(p => !p.isNew);
    const unknownPrestations = localData.prestations.map((p, originalIdx) => ({ ...p, originalIdx })).filter(p => p.isNew);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col bg-background/95 backdrop-blur-2xl border-primary/20 shadow-2xl overflow-hidden rounded-3xl">
                
                {/* Header avec Glow */}
                <DialogHeader className="p-6 border-b border-border/50 relative overflow-hidden shrink-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <IconSparkles className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                                Intelligence Artificielle
                            </DialogTitle>
                            <DialogDescription className="font-medium text-muted-foreground mt-1">
                                Résultats de l'extraction des Prestations. Vérifiez les éléments avant de générer les tâches d'équipe.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 px-8 py-6">
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-10 pb-10">
                        
                        {/* 1. Prestations Reconnues */}
                        {knownPrestations.length > 0 && (
                            <motion.div variants={itemVariants} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 font-bold uppercase tracking-widest text-xs gap-2">
                                        <IconCheck size={14} /> Prestations Reconnues ({knownPrestations.length})
                                    </Badge>
                                    <Separator className="flex-1 bg-green-500/10" />
                                </div>
                                <div className="grid gap-3">
                                    <AnimatePresence>
                                        {knownPrestations.map((prest) => (
                                            <motion.div 
                                                key={`known-${prest.originalIdx}`}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, x: -50 }}
                                                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:shadow-md transition-all group"
                                            >
                                                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-3">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Désignation</span>
                                                        <p className="text-sm font-semibold truncate">{prest.designation}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Catégorie</span>
                                                        <Badge variant="secondary" className="text-xs bg-muted/50">{prest.category}</Badge>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Quantité</span>
                                                        <p className="text-sm font-semibold truncate">{prest.quantity}</p>
                                                    </div>
                                                    <div className="col-span-5">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Description</span>
                                                        <p className="text-xs text-muted-foreground truncate">{prest.description}</p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePrestation(prest.originalIdx)}>
                                                    <IconTrash size={16} />
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}

                        {/* 2. Prestations Inconnues (Nouvelles) */}
                        {unknownPrestations.length > 0 && (
                            <motion.div variants={itemVariants} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 font-bold uppercase tracking-widest text-xs gap-2">
                                        <IconSparkles size={14} /> Nouvelles Prestations à valider ({unknownPrestations.length})
                                    </Badge>
                                    <Separator className="flex-1 bg-amber-500/10" />
                                </div>
                                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-amber-600/80 mb-2">
                                    Ces prestations n'ont pas été trouvées dans le catalogue. Si vous validez cette extraction, elles seront automatiquement créées et ajoutées au catalogue de l'agence.
                                </div>
                                <div className="grid gap-3">
                                    <AnimatePresence>
                                        {unknownPrestations.map((prest) => (
                                            <motion.div 
                                                key={`unknown-${prest.originalIdx}`}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, x: -50 }}
                                                className="flex items-center gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-50/50 hover:bg-amber-50 hover:shadow-md transition-all group"
                                            >
                                                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-3">
                                                        <span className="text-[10px] text-amber-600/70 uppercase font-bold tracking-wider mb-1 block">Nouvelle Désignation</span>
                                                        <p className="text-sm font-semibold truncate text-amber-900">{prest.designation}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Catégorie</span>
                                                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">{prest.category}</Badge>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Quantité</span>
                                                        <p className="text-sm font-semibold truncate">{prest.quantity}</p>
                                                    </div>
                                                    <div className="col-span-5">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Description</span>
                                                        <p className="text-xs text-muted-foreground truncate">{prest.description}</p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePrestation(prest.originalIdx)}>
                                                    <IconTrash size={16} />
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}

                    </motion.div>
                </ScrollArea>

                <div className="p-6 border-t border-border/50 bg-muted/20 flex justify-between items-center shrink-0">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                        <IconCheck size={16} className="text-green-500" />
                        Vous pouvez valider cette extraction
                    </span>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-medium">
                            Annuler
                        </Button>
                        <Button onClick={handleSave} disabled={generatingTasks} className="rounded-xl font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-lg shadow-indigo-500/25 border-0">
                            {generatingTasks ? <><IconSparkles className="w-4 h-4 mr-2 animate-spin" /> Génération des Tâches...</> : <><IconBrain className="w-4 h-4 mr-2" /> Valider & Générer Tâches Créatives</>}
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
