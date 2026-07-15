"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { IconCurrencyDirham, IconTrendingUp, IconCalculator } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMutation } from '@apollo/client';
import { UPDATE_PROJECT_MUTATION } from '@/lib/graphql/projects';
import { toast } from 'sonner';

export interface ProjectProfitabilityCardProps {
    projectId: string;
    initialBudgetClient?: number;
    coutTechnique: number;
}

interface ProfitabilityForm {
    budgetClient: number;
}

export function ProjectProfitabilityCard({ projectId, initialBudgetClient = 0, coutTechnique }: ProjectProfitabilityCardProps) {
    const { register, watch, formState: { errors } } = useForm<ProfitabilityForm>({
        defaultValues: {
            budgetClient: initialBudgetClient
        }
    });

    const [updateProject, { loading: saving }] = useMutation(UPDATE_PROJECT_MUTATION);

    const budgetClient = watch('budgetClient') || 0;
    
    const handleSave = async () => {
        try {
            await updateProject({
                variables: {
                    id: projectId,
                    input: {
                        budgetClient
                    }
                }
            });
            toast.success("Budget client enregistré avec succès");
        } catch (error) {
            console.error("Error saving budget", error);
            toast.error("Erreur lors de la sauvegarde du budget");
        }
    };

    const margeNetteAmount = budgetClient - coutTechnique;
    const margePercentage = budgetClient > 0 ? (margeNetteAmount / budgetClient) * 100 : 0;

    return (
        <Card className="border-2 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-4 border-b bg-muted/10">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg text-primary">
                        <IconCalculator className="w-5 h-5" />
                    </div>
                    Rentabilité & Marge (URBA EVENTS)
                </CardTitle>
                <CardDescription>Calculez la rentabilité réelle du projet selon le budget et les coûts techniques (WBS).</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 relative z-10">
                
                {/* 1. Input: Budget Client */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget Client (HT)</Label>
                    <div className="flex gap-2 relative">
                        <div className="relative flex-1">
                            <IconCurrencyDirham className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input 
                                type="number"
                                step="0.01"
                                className="pl-10 h-12 text-lg font-mono font-bold bg-muted/20"
                                {...register('budgetClient', { valueAsNumber: true, min: 0 })}
                            />
                        </div>
                        <Button 
                            className="h-12 px-6 bg-primary/10 hover:bg-primary/20 text-primary border-0" 
                            variant="outline"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "..." : "Enregistrer"}
                        </Button>
                    </div>
                    {errors.budgetClient && <p className="text-red-500 text-xs">Veuillez entrer un montant valide.</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* 2. Coût Technique (Read Only) */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Coût Technique (Achats/WBS)</Label>
                        <p className="text-xl font-mono font-bold text-foreground">
                            {coutTechnique.toLocaleString("fr-FR")} <span className="text-xs text-muted-foreground">DH HT</span>
                        </p>
                    </div>

                    {/* 3. Marge Nette */}
                    <div className={cn(
                        "p-4 rounded-xl border flex flex-col justify-between transition-colors",
                        margePercentage >= 20 ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" :
                        margePercentage > 0 ? "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400" :
                        "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
                    )}>
                        <Label className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-2 flex items-center gap-1">
                            <IconTrendingUp className="w-3 h-3" /> Marge Nette
                        </Label>
                        <div>
                            <p className="text-xl font-mono font-bold">
                                {margeNetteAmount.toLocaleString("fr-FR")} <span className="text-xs opacity-70">DH</span>
                            </p>
                            <p className="text-sm font-bold mt-1">
                                {margePercentage.toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
