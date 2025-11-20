"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { IconActivity, IconCheck, IconClock, IconFolder, IconTrendingUp, IconTrendingDown, IconTarget, IconBolt } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface ProjectsStatsProps {
    total?: number;
    inProgress?: number;
    completed?: number;
    pending?: number;
    className?: string;
}

export function ProjectsStats({
    total = 0,
    inProgress = 0,
    completed = 0,
    pending = 0,
    className
}: ProjectsStatsProps) {

    const safeTotal = total > 0 ? total : 1;
    const pctCompleted = Math.round((completed / safeTotal) * 100);
    const pctInProgress = Math.round((inProgress / safeTotal) * 100);
    const pctPending = Math.round((pending / safeTotal) * 100);
    const successRate = pctCompleted; 
    const activeLoad = pctInProgress + pctPending; 

    return (
        // FIX: Added 'h-full flex flex-col justify-between'
        <Card className={cn("flex flex-col shadow-sm border-border/60 h-full justify-between", className)}>
            <div>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold text-foreground">
                                Project Overview
                            </CardTitle>
                            <CardDescription>Real-time performance metrics</CardDescription>
                        </div>
                        <GlobalTrendBadge value="+12.5%" />
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Visual Distribution */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm font-medium">
                            <span className="text-muted-foreground">Status Distribution</span>
                            <span className="text-foreground font-bold">{total} <span className="text-muted-foreground font-normal text-xs">Total</span></span>
                        </div>
                        <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-secondary/50">
                            <div style={{ width: `${pctCompleted}%` }} className="bg-emerald-500" />
                            <div style={{ width: `${pctInProgress}%` }} className="bg-blue-500" />
                            <div style={{ width: `${pctPending}%` }} className="bg-amber-400" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span>Done ({pctCompleted}%)</span></div>
                            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /><span>Active ({pctInProgress}%)</span></div>
                            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-400" /><span>Pending ({pctPending}%)</span></div>
                        </div>
                    </div>
                    
                    <Separator />

                    {/* Detailed Grid Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <DetailedStat label="In Progress" value={inProgress} trend="up" icon={<IconActivity className="h-4 w-4 text-blue-600" />} bg="bg-blue-100/50" borderColor="border-blue-200" />
                        <DetailedStat label="Completed" value={completed} trend="up" icon={<IconCheck className="h-4 w-4 text-emerald-600" />} bg="bg-emerald-100/50" borderColor="border-emerald-200" />
                        <DetailedStat label="Pending" value={pending} trend="down" icon={<IconClock className="h-4 w-4 text-amber-600" />} bg="bg-amber-100/50" borderColor="border-amber-200" />
                        <DetailedStat label="Total Volume" value={total} trend="neutral" icon={<IconFolder className="h-4 w-4 text-primary" />} bg="bg-primary/10" borderColor="border-primary/20" />
                    </div>
                </CardContent>
            </div>

            {/* Footer: Efficiency KPIs */}
            <CardFooter className="pt-2 pb-6 bg-muted/20 border-t mt-auto">
                <div className="grid grid-cols-2 w-full gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-full shadow-sm border">
                            <IconTarget className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Success Rate</p>
                            <p className="text-lg font-bold text-foreground">{successRate}%</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-full shadow-sm border">
                            <IconBolt className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Active Load</p>
                            <p className="text-lg font-bold text-foreground">{activeLoad}%</p>
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}

// ... (Keep helper functions DetailedStat and GlobalTrendBadge as they were) ...
function DetailedStat({ label, value, trend, icon, bg, borderColor }: any) {
    return (
        <div className={cn("relative flex flex-col gap-1 p-3 rounded-lg border border-dashed hover:bg-accent/5 transition-colors", borderColor)}>
            <div className="flex items-center justify-between mb-1">
                <div className={cn("p-1.5 rounded-md", bg)}>
                    {icon}
                </div>
                {trend === 'up' && <IconTrendingUp className="h-3 w-3 text-emerald-500" />}
                {trend === 'down' && <IconTrendingDown className="h-3 w-3 text-rose-500" />}
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">{label}</p>
        </div>
    )
}

function GlobalTrendBadge({ value }: { value: string }) {
    return (
        <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <IconTrendingUp className="h-3 w-3" /> {value}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">vs last month</span>
        </div>
    )
}