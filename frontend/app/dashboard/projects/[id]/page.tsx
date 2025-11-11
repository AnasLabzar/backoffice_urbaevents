// Filename: app/dashboard/projects/[id]/page.tsx
// VERSION 1.0: Page dyal T-tafasil l-Projet (b l-ID)

"use client";

import * as React from "react";
import { gql, useQuery } from "@apollo/client";
import { useParams, notFound, useRouter } from "next/navigation"; // <-- Kanst3mlo hooks dyal Next.js
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    IconActivity,
    IconChecklist,
    IconClock,
    IconLoader,
    IconCircleCheck,
    IconUpload,
    IconUser,
    IconUsers,
    IconAlertTriangle,
    IconArrowLeft,
    IconMessageCircle, // <-- Icon l-l-Avis
} from "@tabler/icons-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale"; // <-- Bach n-formatiw b l-français
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

// --- 1. L-QUERIES DYALNA ---

// Query Jdida: Katjib ghir projet we7ed b l-ID dyalo
const GET_PROJECT_BY_ID = gql`
  query GetProjectById($id: ID!) {
    project(id: $id) {
      id
      title
      object
      status: generalStatus
      preparationStatus
      submissionDeadline
      projectManagers { id name }
      team {
        infographistes { id name }
        team3D { id name }
        assistants { id name }
      }
      proposalAvis {
        status
        reason
        givenBy { name }
        givenAt
      }
    }
  }
`;

// Query Qadima: Dyal l-Tasks
const GET_TASKS_BY_PROJECT_QUERY = gql`
  query GetTasksByProject($projectId: ID!) {
    tasksByProject(projectId: $projectId) {
      id
      description
      status
      department
      createdAt 
      assignedTo {
        id
        name
      }
      v1Uploads {
        id
        fileUrl
        originalFileName
        createdAt 
      }
      finalUpload {
        id
        fileUrl
        originalFileName
        createdAt 
      }
    }
  }
`;

// Query Qadima: Dyal l-Logs
const GET_LOGS_QUERY = gql`
  query GetLogs($projectId: ID!) {
    logs(projectId: $projectId) {
      id
      details
      createdAt
      user {
        name
      }
    }
  }
`;

// --- 2. HELPERS (B7AL L-QDAM) ---

function parseDate(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    let date;
    // Check wach l-dateString raqm (timestamp)
    if (/^\d+$/.test(dateString)) {
        date = new Date(parseInt(dateString, 10));
    } else {
        // Ila ماشي raqm, t3aml m3ah b7al ISO string (e.g., "2025-11-21T...")
        date = new Date(dateString);
    }
    // T2kd l-date s7i7
    if (isNaN(date.getTime())) return null;
    return date;
}

function formatDate(date: Date | null, formatStr: string = "PPP p") {
    if (!date) return "N/A";
    try {
        // Kan zidou locale: fr bach yktb b l-français
        return format(date, formatStr, { locale: fr });
    } catch (error) {
        return "Date Invalide";
    }
}

// Badge dyal l-Status (mn l-file l-qdim)
const STATUS_BADGE_MAP: { [key: string]: { label: string; className: string } } = {
    DRAFT: { label: "Brouillon", className: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200" },
    TO_CONFIRM: { label: "À Confirmer", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300" },
    TO_PREPARE: { label: "À Préparer", className: "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300" },
    FEASIBILITY_PENDING: { label: "Faisabilité", className: "bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300" },
    CAUTION_PENDING: { label: "Caution", className: "bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300" },
    IN_PRODUCTION: { label: "En Production", className: "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300" },
    DONE: { label: "Terminé", className: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-100" },
    CANCELED: { label: "Annulé", className: "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300" },
    NO: { label: "Refusé", className: "bg-red-200 text-red-900 dark:bg-red-700 dark:text-red-100" },
    UNKNOWN: { label: "Inconnu", className: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
};
function NewProjectStatusPill({ status }: { status: string }) {
    const statusInfo = STATUS_BADGE_MAP[status] || STATUS_BADGE_MAP["UNKNOWN"];
    return <Badge className={cn("text-xs font-semibold border-0", statusInfo.className)}>{statusInfo.label}</Badge>;
}

// Badge dyal l-Tasks (mn l-file l-qdim)
const TASK_STATUS_BADGE_MAP: { [key: string]: { label: string; className: string; icon: React.ElementType } } = {
    TODO: { label: "À Faire", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300", icon: IconClock },
    IN_PROGRESS: { label: "En Cours", className: "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300", icon: IconLoader },
    DONE: { label: "Terminé", className: "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300", icon: IconCircleCheck },
};
function TaskStatusBadge({ status }: { status: string }) {
    const statusInfo = TASK_STATUS_BADGE_MAP[status] || TASK_STATUS_BADGE_MAP["TODO"];
    const Icon = statusInfo.icon;
    return (
        <Badge variant="outline" className={cn("text-xs font-medium border-0", statusInfo.className)}>
            <Icon className={cn("h-3 w-3 mr-1.5", status === 'IN_PROGRESS' && 'animate-spin')} />
            {statusInfo.label}
        </Badge>
    );
}

// --- 3. COMPONENT DYAL L-TIMELINE (JDID) ---
function ProjectTimeline({ tasks = [], logs = [] }: { tasks: any[], logs: any[] }) {

    // 1. N-jm3o Tasks w Logs f array we7da
    const taskItems = tasks.map(task => ({
        type: 'task',
        date: parseDate(task.createdAt),
        data: task
    }));

    const logItems = logs.map(log => ({
        type: 'log',
        date: parseDate(log.createdAt),
        data: log
    }));

    // 2. N-triyiwhom b l-waqt (mn l-jdid l-l-qdim)
    const timelineItems = [...taskItems, ...logItems]
        .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

    if (timelineItems.length === 0) {
        return <p className="text-muted-foreground text-center py-10">Aucune activité ou tâche pour ce projet.</p>
    }

    return (
        <div className="flex flex-col">
            {timelineItems.map((item, index) => {
                const isLast = index === timelineItems.length - 1;
                const Icon = item.type === 'task' ? IconChecklist : IconActivity;
                const title = item.type === 'task' ? item.data.description : item.data.details;
                const user = item.type === 'task' ? item.data.assignedTo?.name : item.data.user?.name;

                return (
                    <div key={`${item.type}-${item.data.id}`} className="relative flex gap-4">
                        {/* L-Kett w N-Noqta */}
                        <div className="flex flex-col items-center">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                            </span>
                            {!isLast && (
                                <div className="h-full w-px flex-1 bg-border my-1.5" />
                            )}
                        </div>

                        {/* L-Contenu dyal l-Item */}
                        <div className={cn("pb-8 flex-grow min-w-0", !isLast && "border-b border-border/70")}>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {item.type === 'task' ? 'TÂCHE' : 'LOG'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(item.date!, { addSuffix: true, locale: fr })}
                                </span>
                            </div>

                            <p className="text-sm font-medium text-foreground mt-1">{title}</p>
                            <p className="text-sm text-muted-foreground">
                                {item.type === 'task' ? `Assigné à: ${user || 'N/A'}` : `Par: ${user || 'Système'}`}
                            </p>

                            {/* Affichiw l-Status w l-Uploads ila kant Tâche */}
                            {item.type === 'task' && (
                                <div className="mt-3 space-y-3">
                                    <TaskStatusBadge status={item.data.status} />

                                    {item.data.v1Uploads.length > 0 && (
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Versions (V1):</span>
                                            {item.data.v1Uploads.map((upload: any) => (
                                                <a key={upload.id} href={`http://localhost:5001/${upload.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-2">
                                                    <IconUpload className="h-3 w-3" />
                                                    {upload.originalFileName} ({formatDate(parseDate(upload.createdAt), "p")})
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    {item.data.finalUpload && (
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version Finale:</span>
                                            <a key={item.data.finalUpload.id} href={`http://localhost:5001/${item.data.finalUpload.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline flex items-center gap-2">
                                                <IconCircleCheck className="h-3 w-3" />
                                                {item.data.finalUpload.originalFileName} ({formatDate(parseDate(item.data.finalUpload.createdAt), "p")})
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// --- 4. COMPONENT L-KBER DYAL L-PAGE ---
export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter(); // Bach ndiro button "Retour"
    const id = params.id as string;

    // --- 3 Queries b 3 ---
    const { data: projectData, loading: loadingProject, error: errorProject } = useQuery(GET_PROJECT_BY_ID, {
        variables: { id },
        skip: !id,
    });
    const { data: taskData, loading: loadingTasks } = useQuery(GET_TASKS_BY_PROJECT_QUERY, {
        variables: { projectId: id },
        skip: !id,
    });
    const { data: logData, loading: loadingLogs } = useQuery(GET_LOGS_QUERY, {
        variables: { projectId: id },
        skip: !id,
    });

    const project = projectData?.project;
    const tasks = taskData?.tasksByProject || [];
    const logs = logData?.logs || [];

    // N-jm3o l-équipe kamla
    const allTeamMembers = [
        ...(project?.team?.infographistes || []),
        ...(project?.team?.team3D || []),
        ...(project?.team?.assistants || [])
    ];
    const uniqueNames = [...new Set(allTeamMembers.map(member => member.name))];
    const displayTeam = uniqueNames.length > 0 ? uniqueNames.join(', ') : "N/A";

    // --- Loading Skeletons ---
    if (loadingProject) {
        return (
            <SidebarProvider>
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex-grow flex-col space-y-8 p-4 md:p-8">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-8 w-1/3" />
                        <div className="grid gap-6 md:grid-cols-3">
                            <Skeleton className="md:col-span-2 h-48" />
                            <Skeleton className="md:col-span-1 h-48" />
                        </div>
                        <Skeleton className="h-96 w-full" />
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    // --- Error Handling ---
    if (errorProject) {
        return (
            <SidebarProvider>
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex-grow flex-col text-red-500 p-8">
                        <h2 className="text-xl font-bold mb-4">Erreur de chargement du projet</h2>
                        <p>{errorProject.message}</p>
                        <Button variant="outline" onClick={() => router.back()} className="mt-4">
                            <IconArrowLeft className="h-4 w-4 mr-2" />
                            Retour
                        </Button>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    if (!project) {
        return notFound(); // Kayrje3 404
    }


    return (
        // Kan-wrapper b l-layout dyal l-sidebar
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <main className="flex-grow flex-col space-y-8 p-4 md:p-8">
                    {/* --- HEADER (Titre w Button Rjo3) --- */}
                    <div className="flex items-center justify-between space-y-2">
                        <div>
                            <Button variant="ghost" onClick={() => router.back()} className="text-sm text-muted-foreground">
                                <IconArrowLeft className="h-4 w-4 mr-2" />
                                Retour aux projets
                            </Button>
                            <h1 className="text-3xl font-bold ml-4">{project.object}</h1>
                            <p className="text-muted-foreground ml-4">{project.title}</p>
                        </div>
                    </div>

                    {/* --- TAFASIL L-PROJECT --- */}
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Col 1: Détails */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Détails du Projet</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</h4>
                                        <NewProjectStatusPill status={project.preparationStatus} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chef de Projet</h4>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <IconUser className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium text-sm text-foreground">{project.projectManagers?.[0]?.name || "N/A"}</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Équipe Assignée</h4>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <IconUsers className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium text-sm text-foreground">{displayTeam}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Col 2: Dates w Avis */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dates Clés</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date de Dépôt</h4>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <IconClock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-sm text-foreground">{formatDate(parseDate(project.submissionDeadline), "PPP")}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {project.proposalAvis && (
                                <Card className={cn(project.proposalAvis.status === 'ACCEPTED' ? 'border-green-500/50' : 'border-red-500/50')}>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconMessageCircle className="h-5 w-5" />
                                            Avis de Préparation
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-1.5">
                                            {project.proposalAvis.status === 'ACCEPTED' ?
                                                <IconCircleCheck className="h-4 w-4 text-green-500" /> :
                                                <IconAlertTriangle className="h-4 w-4 text-red-500" />
                                            }
                                            <span className={cn("font-semibold text-sm", project.proposalAvis.status === 'ACCEPTED' ? 'text-green-500' : 'text-red-500')}>
                                                {project.proposalAvis.status === 'ACCEPTED' ? 'Accepté' : 'Refusé'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Par: {project.proposalAvis.givenBy?.name} (le {formatDate(parseDate(project.proposalAvis.givenAt), "PPP")})
                                        </p>
                                        {project.proposalAvis.reason && (
                                            <div className="pt-3 border-t border-border/70">
                                                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raison du refus:</h5>
                                                <p className="text-sm text-foreground italic mt-1">"{project.proposalAvis.reason}"</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* --- SEPARATOR --- */}
                    <div className="relative pt-4">
                        <Separator />
                        <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-3 text-sm font-medium text-muted-foreground">
                            Timeline du Projet
                        </span>
                    </div>

                    {/* --- TIMELINE (Tasks w Logs) --- */}
                    <Card>
                        <CardContent className="p-4 md:p-6">
                            {(loadingTasks || loadingLogs) ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            ) : (
                                <ProjectTimeline tasks={tasks} logs={logs} />
                            )}
                        </CardContent>
                    </Card>

                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}