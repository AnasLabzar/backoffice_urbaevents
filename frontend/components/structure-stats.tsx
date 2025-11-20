"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { IconUsers, IconBriefcase, IconBrush, IconUserStar, IconTrendingUp, IconTrendingDown, IconTarget, IconBolt } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface StructureStatsProps {
    activeProjects: number;
    totalPMs: number;
    totalCreatives: number;
    totalAssistants: number;
    className?: string;
}

export function StructureStats({
    activeProjects = 0,
    totalPMs = 0,
    totalCreatives = 0,
    totalAssistants = 0,
    className
}: StructureStatsProps) {

    // Metrics specifically for "Structure/Team"
    const totalResources = totalPMs + totalCreatives + totalAssistants;
    const utilizationRate = totalResources > 0 ? Math.round((activeProjects / totalResources) * 100) : 0;

    // Percentages for the visual bar
    const safeTotal = totalResources > 0 ? totalResources : 1;
    const pctPM = Math.round((totalPMs / safeTotal) * 100);
    const pctCreative = Math.round((totalCreatives / safeTotal) * 100);
    const pctAssist = Math.round((totalAssistants / safeTotal) * 100);

    return (
        <Card className={cn("flex flex-col shadow-sm border-border/60 h-full justify-between", className)}>
            <div>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold text-foreground">
                                Resource Overview
                            </CardTitle>
                            <CardDescription>Active team allocation</CardDescription>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                <IconUsers className="h-3 w-3" /> {totalResources}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-1">Active Members</span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Distribution Bar */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm font-medium">
                            <span className="text-muted-foreground">Team Composition</span>
                        </div>
                        <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-secondary/50">
                            <div style={{ width: `${pctPM}%` }} className="bg-indigo-500" />
                            <div style={{ width: `${pctCreative}%` }} className="bg-purple-500" />
                            <div style={{ width: `${pctAssist}%` }} className="bg-pink-400" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-indigo-500" /><span>PMs</span></div>
                            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-purple-500" /><span>Creative</span></div>
                            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-pink-400" /><span>Support</span></div>
                        </div>
                    </div>

                    <Separator />

                    {/* Grid Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <DetailedStat label="Projects Active" value={activeProjects} icon={<IconBriefcase className="h-4 w-4 text-blue-600" />} bg="bg-blue-100/50" borderColor="border-blue-200" />
                        <DetailedStat label="Managers" value={totalPMs} icon={<IconUserStar className="h-4 w-4 text-indigo-600" />} bg="bg-indigo-100/50" borderColor="border-indigo-200" />
                        <DetailedStat label="Creatives" value={totalCreatives} icon={<IconBrush className="h-4 w-4 text-purple-600" />} bg="bg-purple-100/50" borderColor="border-purple-200" />
                        <DetailedStat label="Assistants" value={totalAssistants} icon={<IconUsers className="h-4 w-4 text-pink-600" />} bg="bg-pink-100/50" borderColor="border-pink-200" />
                    </div>
                </CardContent>
            </div>

            <CardFooter className="pt-2 pb-6 bg-muted/20 border-t mt-auto">
                <div className="grid grid-cols-2 w-full gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-full shadow-sm border">
                            <IconTarget className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Utilization</p>
                            <p className="text-lg font-bold text-foreground">{utilizationRate}%</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-full shadow-sm border">
                            <IconBolt className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Capacity</p>
                            <p className="text-lg font-bold text-foreground">Good</p>
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}

function DetailedStat({ label, value, icon, bg, borderColor }: any) {
    return (
        <div className={cn("relative flex flex-col gap-1 p-3 rounded-lg border border-dashed hover:bg-accent/5 transition-colors", borderColor)}>
            <div className="flex items-center justify-between mb-1">
                <div className={cn("p-1.5 rounded-md", bg)}>
                    {icon}
                </div>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">{label}</p>
        </div>
    )
}