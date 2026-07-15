"use client";
import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconAlertTriangle, IconClock, IconUser, IconUsers, IconInfoCircle } from "@tabler/icons-react";
import { parseDate, calculateRemainingDays, NewProjectStatusPill } from "./utils";
import { ProjectLogsSheet } from "./sheets/logs-sheet";
import { ProjectTasksSheet } from "./sheets/tasks-sheet";
import { cn } from "@/lib/utils";

export function ProjectCard({ project }: { project: any }) {
    const { text: remainingText, color: remainingColor } = calculateRemainingDays(project.submissionDeadline);
    const deadline = parseDate(project.submissionDeadline);
    const projectManager = project.projectManagers?.[0]?.name || "N/A";
    const isOverdue = remainingText === "Dépassé";

    const allTeamMembers = [...(project.team?.infographistes || []), ...(project.team?.team3D || []), ...(project.team?.coordinators || [])];
    const uniqueNames = [...new Set(allTeamMembers.map((member: any) => member.name))];
    const maxNamesToShow = 3;
    let displayTeam = uniqueNames.length > 0 ? uniqueNames.slice(0, maxNamesToShow).join(', ') + (uniqueNames.length > maxNamesToShow ? "..." : "") : "N/A";

    return (
        <Card className={cn(
            "flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group backdrop-blur-xl h-full",
            isOverdue ? 'bg-red-950/10 border-red-500/30 hover:border-red-500/50' : 'bg-card/40 border-border/40 hover:border-primary/40'
        )}>
            {/* Hover Glow Effect */}
            <div className={cn(
                "absolute -inset-0.5 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                isOverdue ? "from-red-500/10" : "from-primary/10"
            )} />
            
            <div className="relative z-10 flex flex-col h-full">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-grow min-w-0 pr-2">
                            <CardTitle className="text-base font-bold tracking-tight line-clamp-2 leading-tight mb-1.5" title={project.object}>
                                {project.object}
                            </CardTitle>
                            <CardDescription className="text-xs line-clamp-1 opacity-80">
                                {project.title}
                            </CardDescription>
                        </div>
                        {/* Responsive Logo Container */}
                        <div className="flex-shrink-0 bg-background/60 backdrop-blur-md rounded-lg p-1.5 border border-border/50 shadow-sm mt-1">
                            <img src="/logo/logo-white-urba-events.png" alt="Logo" className="h-5 sm:h-6 w-auto max-w-[60px] sm:max-w-[80px] object-contain" />
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="flex-grow">
                    <div className="flex flex-col gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Status</span>
                                <div><NewProjectStatusPill status={project.preparationStatus} /></div>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Chef de Projet</span>
                                <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30 border border-transparent group-hover:border-border/50 transition-colors">
                                    <IconUser className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-xs text-foreground truncate" title={projectManager}>{projectManager}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Équipe</span>
                                <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30 border border-transparent group-hover:border-border/50 transition-colors">
                                    <IconUsers className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-xs text-foreground truncate" title={displayTeam}>{displayTeam}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Actions</span>
                                <div className="flex items-center gap-2">
                                    <ProjectTasksSheet project={project} />
                                    <ProjectLogsSheet project={project} />
                                    <Button asChild variant="outline" size="icon" className="h-8 w-8 bg-background/50 hover:bg-primary hover:text-primary-foreground border-border/50 transition-colors" title="Voir Détails">
                                        <Link href={`/dashboard/projects/${project.id}`}><IconInfoCircle className="h-4 w-4" /></Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                
                <CardFooter className={cn(
                    "p-3 mt-4 flex items-center gap-3 border-t backdrop-blur-md", 
                    isOverdue ? 'bg-red-500/5 border-red-500/20' : 'bg-muted/30 border-border/30'
                )}>
                    <div className={cn("p-1.5 rounded-md", isOverdue ? "bg-red-500/20" : "bg-background shadow-sm border border-border/50")}>
                        {isOverdue ? <IconAlertTriangle className="h-4 w-4 text-red-500" /> : <IconClock className={cn("h-4 w-4", remainingColor)} />}
                    </div>
                    <div className="flex flex-col">
                        <span className={cn("font-extrabold text-xs tracking-tight", isOverdue ? 'text-red-500' : remainingColor)}>
                            {remainingText}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                            Dépôt: {deadline ? deadline.toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "N/A"}
                        </span>
                    </div>
                </CardFooter>
            </div>
        </Card>
    );
}