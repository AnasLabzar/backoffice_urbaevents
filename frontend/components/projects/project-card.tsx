"use client";
import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconAlertTriangle, IconClock, IconUser, IconUsers, IconInfoCircle } from "@tabler/icons-react";
import { parseDate, calculateRemainingDays, NewProjectStatusPill } from "./utils";
import { ProjectLogsSheet } from "./sheets/logs-sheet";
import { ProjectTasksSheet } from "./sheets/tasks-sheet";

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
        <Card className={`flex flex-col justify-between shadow-sm hover:shadow-lg transition-shadow bg-card border-border ${isOverdue ? 'border-red-500/30' : 'bg-muted/70'}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow min-w-0">
                        <CardTitle className="text-base font-bold line-clamp-2" title={project.object}>{project.object}</CardTitle>
                        <CardDescription className="line-clamp-1">{project.title}</CardDescription>
                    </div>
                    <div className="flex-shrink-0"><div className="h-10 w-28 bg-muted rounded-md flex items-center justify-center"><img src="/logo/logo-white-urba-events.png" alt="Logo" className="h-8 w-24 object-contain" /></div></div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span><div className="mt-1"><NewProjectStatusPill status={project.preparationStatus} /></div></div>
                        <div><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chef de Projet</span><div className="flex items-center gap-1.5 mt-1"><IconUser className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm text-foreground truncate" title={projectManager}>{projectManager}</span></div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Équipe</span><div className="flex items-center gap-1.5 mt-1"><IconUsers className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm text-foreground truncate" title={displayTeam}>{displayTeam}</span></div></div>
                        <div><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</span><div className="flex items-center gap-2 mt-1"><ProjectTasksSheet project={project} /><ProjectLogsSheet project={project} /><Button asChild variant="outline" size="icon" className="mt-1" title="Voir Détails"><Link href={`/dashboard/projects/${project.id}`}><IconInfoCircle className="h-4 w-4" /></Link></Button></div></div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className={`p-3 mt-4 flex items-center gap-3 ${isOverdue ? 'bg-red-800/10' : 'bg-muted/70'}`}>
                <div>{isOverdue ? <IconAlertTriangle className="h-5 w-5 text-red-500" /> : <IconClock className={`h-5 w-5 ${remainingColor}`} />}</div>
                <div className="flex flex-col"><span className={`font-bold text-sm ${isOverdue ? 'text-red-500' : remainingColor}`}>{remainingText}</span><span className="text-xs text-muted-foreground">Dépôt: {deadline ? deadline.toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "N/A"}</span></div>
            </CardFooter>
        </Card>
    );
}