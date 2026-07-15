"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { IconUsers, IconBriefcase, IconBrush, IconUserStar, IconTarget, IconBolt } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

interface StructureStatsProps {
    activeProjects: number;
    totalPMs: number;
    totalCreatives: number;
    totalcoordinators: number;
    className?: string;
}

export function StructureStats({
    activeProjects = 0,
    totalPMs = 0,
    totalCreatives = 0,
    totalcoordinators = 0,
    className
}: StructureStatsProps) {

    // Metrics specifically for "Structure/Team"
    const totalResources = totalPMs + totalCreatives + totalcoordinators;
    const utilizationRate = totalResources > 0 ? Math.round((activeProjects / totalResources) * 100) : 0;

    // Percentages for the visual bar
    const safeTotal = totalResources > 0 ? totalResources : 1;
    const pctPM = Math.round((totalPMs / safeTotal) * 100);
    const pctCreative = Math.round((totalCreatives / safeTotal) * 100);
    const pctAssist = Math.round((totalcoordinators / safeTotal) * 100);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 15, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" as any } }
    };

    return (
        <Card className={cn("flex flex-col shadow-sm border-border/40 h-full justify-between bg-card overflow-hidden", className)}>
            <div className="flex-1">
                <CardHeader className="pb-4 bg-muted/10 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <CardTitle className="text-base font-semibold text-foreground tracking-tight">
                                Resource Overview
                            </CardTitle>
                            <CardDescription className="text-[11px] font-medium text-muted-foreground">Active team allocation</CardDescription>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                                <IconUsers size={14} /> {totalResources}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Active</span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-5">
                    {/* Distribution Bar */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <span>Team Composition</span>
                        </div>
                        {/* Adaptive Progress Bar Colors */}
                        <div className="h-2 w-full flex rounded-full overflow-hidden bg-secondary/50">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pctPM}%` }} transition={{ duration: 1, delay: 0.2 }} className="bg-indigo-500" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pctCreative}%` }} transition={{ duration: 1, delay: 0.3 }} className="bg-purple-500" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pctAssist}%` }} transition={{ duration: 1, delay: 0.4 }} className="bg-pink-500" />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground px-1">
                            <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                <span>PMs</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                <span>Creative</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                                <span>Support</span>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-border/40" />

                    {/* Grid Stats with Adaptive Styling */}
                    <motion.div 
                        variants={containerVariants} 
                        initial="hidden" 
                        animate="visible" 
                        className="grid grid-cols-2 gap-3"
                    >
                        <DetailedStat
                            label="Projects"
                            value={activeProjects}
                            icon={<IconBriefcase size={16} className="text-blue-500" />}
                            bg="bg-blue-500/10"
                            borderColor="border-blue-500/20"
                            variants={itemVariants}
                        />
                        <DetailedStat
                            label="Managers"
                            value={totalPMs}
                            icon={<IconUserStar size={16} className="text-indigo-500" />}
                            bg="bg-indigo-500/10"
                            borderColor="border-indigo-500/20"
                            variants={itemVariants}
                        />
                        <DetailedStat
                            label="Creatives"
                            value={totalCreatives}
                            icon={<IconBrush size={16} className="text-purple-500" />}
                            bg="bg-purple-500/10"
                            borderColor="border-purple-500/20"
                            variants={itemVariants}
                        />
                        <DetailedStat
                            label="Coordinators"
                            value={totalcoordinators}
                            icon={<IconUsers size={16} className="text-pink-500" />}
                            bg="bg-pink-500/10"
                            borderColor="border-pink-500/20"
                            variants={itemVariants}
                        />
                    </motion.div>
                </CardContent>
            </div>

            {/* Footer */}
            <CardFooter className="pt-3 pb-4 bg-muted/10 border-t border-border/40 mt-auto">
                <div className="grid grid-cols-2 w-full gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-background rounded-md shadow-sm border border-border/40">
                            <IconTarget size={16} className="text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Utilization</p>
                            <p className="text-sm font-bold text-foreground">{utilizationRate}%</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-background rounded-md shadow-sm border border-border/40">
                            <IconBolt size={16} className="text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Capacity</p>
                            <p className="text-sm font-bold text-emerald-500">Good</p>
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}

function DetailedStat({ label, value, icon, bg, borderColor, variants }: any) {
    return (
        <motion.div variants={variants} className={cn("relative flex flex-col gap-1 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors cursor-default", borderColor)}>
            <div className="flex items-center justify-between mb-1">
                <div className={cn("p-1.5 rounded-md", bg)}>
                    {icon}
                </div>
            </div>
            <p className="text-lg font-bold text-foreground tracking-tight leading-none mt-1">{value}</p>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{label}</p>
        </motion.div>
    )
}