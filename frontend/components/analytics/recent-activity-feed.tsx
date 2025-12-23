"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconClock } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function RecentActivityFeed({ tasks, detailed }: { tasks: any[], detailed?: boolean }) {
    // FIX: Copy array before sorting to avoid read-only error
    const recentTasks = [...tasks]
        .sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt).getTime();
            return dateB - dateA;
        })
        .slice(0, detailed ? 10 : 5);

    return (
        <Card className="h-full border-border shadow-sm bg-card">
            <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <IconClock className="w-4 h-4 text-primary" />
                    {detailed ? "Historique Complet" : "Dernières Activités"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-0">
                    {recentTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-4">Aucune activité récente</p>
                    ) : (
                        recentTasks.map((task, i) => (
                            <div key={i} className="flex gap-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors px-2 rounded-lg">
                                <div className="flex flex-col items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${task.status === 'DONE' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                    <div className="w-px h-full bg-border/50" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-foreground line-clamp-1">
                                        <span className="font-bold text-primary">{task.assignedTo?.name || 'Système'}</span> a mis à jour une tâche
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Badge variant="secondary" className="text-[10px] px-1 h-5">{task.department}</Badge>
                                        <span>•</span>
                                        <span className="capitalize">{task.status.replace(/_/g, ' ').toLowerCase()}</span>
                                        <span>•</span>
                                        <span>{new Date(task.updatedAt || task.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {!detailed && <Button variant="ghost" className="w-full mt-2 text-xs text-muted-foreground">Voir tout</Button>}
            </CardContent>
        </Card>
    );
}