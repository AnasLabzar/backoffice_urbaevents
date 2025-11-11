// Filename: app/dashboard/projects/page.tsx
// VERSION 16: Ziyada dyal Panier "Tâches" + Button "Info"

"use client";

import * as React from "react";
import { gql, useQuery, useLazyQuery } from "@apollo/client";
import Link from "next/link"; // <-- ZEDNA IMPORT
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
// ZEDNA ICONS JDAD
import {
    IconAlertTriangle,
    IconClock,
    IconSearch,
    IconUser,
    IconUsers,
    IconBuildingSkyscraper,
    IconActivity,
    IconClipboardList,
    IconChecklist,         // <-- JDID
    IconLoader,            // <-- JDID
    IconCircleCheck,       // <-- JDID
    IconUpload,            // <-- JDID
    IconInfoCircle         // <-- JDID
} from "@tabler/icons-react";
import { ColumnFiltersState } from "@tanstack/react-table";
import { CreateProjectDrawer } from "@/components/create-project-drawer";

// IMPORT L-CHART (Bar Chart)
import { BarChart, Bar, Cell, XAxis, YAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

import { differenceInDays, format, formatDistanceToNow } from "date-fns"; // <-- ZEDNA formatDistanceToNow
import { fr } from "date-fns/locale"; // <-- ZEDNA locale

// ZEDNA L-COMPONENTS DYAL L-PANIER
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile"; 

// ZEDNA 'Badge' W 'Button'
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Imports mn l-file l-khor
import {
    DataTable,
    columns,
    parseDate, // <-- GHAN7TAJOH
    calculateRemainingDays,
    ProjectStatusPill,
    type ProjectFeedItem,
} from "@/components/projects-data-table";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

// 1. Define the Query (Inchangé)
const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id
        title
        object
        status: generalStatus
        preparationStatus
        submissionDeadline
        projectManagers { id name }
        stages {
          administrative { documents { id fileName fileUrl } }
          technical { documents { id fileName fileUrl originalFileName } }
        }
        cautionRequestDate
        feasibilityChecks { administrative technical financial }
        caution { status }
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
      latestTask { id description status createdAt }
    }
  }
`;

// 2. L-QUERY DYAL L-LOGS (Inchangé)
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

// 3. ZEDNA L-QUERY DYAL L-TASKS (mn l-file l-khor dyalek)
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


// =======================================================================
// DÉFINITIONS POUR LE GRAPHIQUE (Inchangé)
// =======================================================================
const STATUS_MAP: { [key: string]: { label: string; color: string } } = {
    DRAFT: { label: "Brouillon", color: "hsl(var(--chart-1))" },
    TO_CONFIRM: { label: "À Confirmer", color: "hsl(var(--chart-2))" },
    TO_PREPARE: { label: "À Préparer", color: "hsl(var(--chart-3))" },
    FEASIBILITY_PENDING: { label: "Attente Faisabilité", color: "hsl(var(--chart-4))" },
    CAUTION_PENDING: { label: "Attente Caution", color: "hsl(var(--chart-5))" },
    IN_PRODUCTION: { label: "En Production", color: "hsl(var(--chart-6))" },
    DONE: { label: "Terminé", color: "hsl(var(--chart-7))" },
    CANCELED: { label: "Annulé", color: "hsl(var(--chart-8))" },
    NO: { label: "Refusé", color: "hsl(var(--chart-8))" },
    UNKNOWN: { label: "Inconnu", color: "hsl(var(--muted))" },
};
const chartConfig = Object.entries(STATUS_MAP).reduce((acc, [key, value]) => {
    acc[key] = { label: value.label, color: value.color };
    return acc;
}, {} as ChartConfig);

// =======================================================================
// COMPOSANT CHART (Vertical Column Chart) - (Inchangé)
// =======================================================================
function ProjectsStatusChart({ data }: { data: ProjectFeedItem[] }) {
    const chartData = React.useMemo(() => {
        const counts = data.reduce((acc, item) => {
            const statusKey = item.project.preparationStatus || "UNKNOWN";
            acc[statusKey] = (acc[statusKey] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        return Object.entries(counts).map(([statusKey, count]) => ({
            name: STATUS_MAP[statusKey]?.label || statusKey,
            value: count,
            fill: STATUS_MAP[statusKey]?.color || STATUS_MAP["UNKNOWN"].color,
        }));
    }, [data]);

    return (
        <ChartContainer config={chartConfig} className="h-60 w-full">
            <BarChart data={chartData} margin={{ bottom: 50, right: 10, left: 10 }}>
                <XAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="value" radius={4}>
                    {chartData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
}

// 4. HELPER DYAL L-DATE (Inchangé)
function formatDate(date: Date | null, formatStr: string = "PPP p") {
    if (!date) return "N/A";
    try {
        return format(date, formatStr, { locale: fr });
    } catch (error) {
        return "Date Invalide";
    }
}

// =======================================================================
// 5. COMPOSANT BADGE DE STATUT (Design Jdid) - (Inchangé)
// =======================================================================
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

    return (
        <Badge
            className={cn(
                "text-xs font-semibold border-0",
                statusInfo.className
            )}
        >
            {statusInfo.label}
        </Badge>
    );
}

// 6. ZEDNA COMPONENT JDID L-L-BADGE DYAL L-TASKS
const TASK_STATUS_BADGE_MAP: { [key: string]: { label: string; className: string; icon: React.ElementType } } = {
    TODO: { label: "À Faire", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300", icon: IconClock },
    IN_PROGRESS: { label: "En Cours", className: "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300", icon: IconLoader },
    DONE: { label: "Terminé", className: "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300", icon: IconCircleCheck },
};

function TaskStatusBadge({ status }: { status: string }) {
    const statusInfo = TASK_STATUS_BADGE_MAP[status] || TASK_STATUS_BADGE_MAP["TODO"];
    const Icon = statusInfo.icon;
    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs font-medium border-0",
                statusInfo.className
            )}
        >
            <Icon className={cn("h-3 w-3 mr-1.5", status === 'IN_PROGRESS' && 'animate-spin')} />
            {statusInfo.label}
        </Badge>
    );
}


// =======================================================================
// 7. COMPOSANT LOGS SHEET (BDDELNA L-BUTTON L-ICON)
// =======================================================================
function ProjectLogsSheet({ project }: { project: any }) {
    const isMobile = useIsMobile(); 
    const [isOpen, setIsOpen] = React.useState(false);

    const [getLogs, { data: logData, loading: logLoading }] = useLazyQuery(GET_LOGS_QUERY);

    const handleTriggerClick = () => {
        setIsOpen(true);
        getLogs({ variables: { projectId: project.id } });
    };

    const logs = logData?.logs || [];

    const content = (
        <div className="flex flex-col gap-4 overflow-y-auto p-4 text-sm h-full">
            {logLoading && (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            )}
            {!logLoading && logs.length === 0 && (
                <p className="text-muted-foreground text-center py-10">
                    Aucune activité enregistrée pour ce projet.
                </p>
            )}

            {/* Hada howa l-Timeline */}
            {!logLoading && logs.length > 0 && (
                <ul className="flex flex-col">
                    {logs.map((log: any, index: number) => (
                        <li key={log.id} className="relative flex gap-4">
                            {/* L-Kett w N-Noqta */}
                            <div className="flex flex-col items-center">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                    <IconActivity className="h-4 w-4 text-muted-foreground" />
                                </span>
                                {index < logs.length - 1 && (
                                    <div className="h-full w-px flex-1 bg-border my-1" />
                                )}
                            </div>

                            {/* L-Contenu dyal l-Log */}
                            <div className="pb-6 flex-grow min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                    {log.user?.name || 'Système'}
                                </p>
                                <p className="text-sm text-muted-foreground">{log.details}</p>
                                <p className="text-xs text-muted-foreground/80 mt-1">
                                    {formatDate(parseDate(log.createdAt), "PPP p")}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    // --- HNA L-MODIFICATION ---
    // BDDELNA L-BUTTON L-ICON
    const trigger = (
        <Button
            variant="outline"
            size="icon" // <-- BDDELNA L-SIZE
            className="mt-1" // <-- 7EYYEDNA 'flex-1'
            onClick={handleTriggerClick} 
            title="Voir Logs" // <-- ZEDNA TITLE
        >
            <IconClipboardList className="h-4 w-4" />
        </Button>
    );
    // --- FIN L-MODIFICATION ---

    const footer = (<Button variant="outline">Fermer</Button>);

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerTrigger asChild>{trigger}</DrawerTrigger>
                <DrawerContent className="h-[90vh]">
                    <DrawerHeader className="gap-1">
                        <DrawerTitle>Logs: {project.object}</DrawerTitle>
                    </DrawerHeader>
                    <div className="overflow-y-auto">
                        {content}
                    </div>
                    <DrawerFooter><DrawerClose asChild>{footer}</DrawerClose></DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent className="sm:max-w-lg flex flex-col">
                <SheetHeader className="gap-1">
                    <SheetTitle>Logs: {project.object}</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto flex-1">
                    {content}
                </div>
                <SheetFooter><SheetClose asChild>{footer}</SheetClose></SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// =======================================================================
// 8. COMPOSANT JDID: TASKS SHEET (Panier dyal l-Tâches)
// =======================================================================
function ProjectTasksSheet({ project }: { project: any }) {
    const isMobile = useIsMobile(); 
    const [isOpen, setIsOpen] = React.useState(false);
    
    // KANSTA3MLO QUERY JDID
    const [getTasks, { data: taskData, loading: taskLoading }] = useLazyQuery(GET_TASKS_BY_PROJECT_QUERY);

    const handleTriggerClick = () => {
        setIsOpen(true);
        getTasks({ variables: { projectId: project.id } });
    };
    
    const tasks = taskData?.tasksByProject || [];

    const content = (
        <div className="flex flex-col gap-4 overflow-y-auto p-4 text-sm h-full">
            {taskLoading && (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            )}
            {!taskLoading && tasks.length === 0 && (
                <p className="text-muted-foreground text-center py-10">
                    Aucune tâche assignée pour ce projet.
                </p>
            )}

            {/* Hada howa l-Timeline dyal l-Tâches */}
            {!taskLoading && tasks.length > 0 && (
                <ul className="flex flex-col">
                    {tasks.map((task: any, index: number) => {
                        // Kanakhdo l-info dyal l-badge
                        const statusInfo = TASK_STATUS_BADGE_MAP[task.status] || TASK_STATUS_BADGE_MAP["TODO"];
                        const Icon = statusInfo.icon;

                        // --- HNA L-FIX: ZEDNA L-VARIABLE 'isLast' ---
                        const isLast = index === tasks.length - 1;
                        // ------------------------------------------
                        
                        return (
                            <li key={task.id} className="relative flex gap-4">
                                {/* L-Kett w N-Noqta (b l-lon dyal l-status) */}
                                <div className="flex flex-col items-center">
                                    <span className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full", // KBBerna l-icon chwiya
                                        statusInfo.className.replace(/text-\w+-\d+/, '') 
                                    )}>
                                        <Icon className={cn(
                                            "h-5 w-5", // KBBerna l-icon chwiya
                                            statusInfo.className.match(/text-\w+-\d+/)?.[0],
                                            task.status === 'IN_PROGRESS' && 'animate-spin'
                                        )} />
                                    </span>
                                    {index < tasks.length - 1 && (
                                        <div className="h-full w-px flex-1 bg-border my-1.5" />
                                    )}
                                </div>

                                {/* L-Contenu dyal l-Tâche (HNA L-MODIFICATION) */}
                                <div className={cn("pb-8 flex-grow min-w-0", !isLast && "border-b border-border/70")}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {task.department || 'TÂCHE'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(parseDate(task.createdAt)!, { addSuffix: true, locale: fr })}
                                        </span>
                                    </div>

                                    <p className="text-sm font-medium text-foreground mt-1">{task.description}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Assigné à: {task.assignedTo?.name || 'Non assigné'}
                                    </p>
                                    <div className="mt-2">
                                        <TaskStatusBadge status={task.status} />
                                    </div>

                                    {/* L-UPLOADS */}
                                    <div className="mt-4 space-y-3">
                                        {task.v1Uploads.length > 0 && (
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Versions (V1):</span>
                                                {task.v1Uploads.map((upload: any) => (
                                                    <a key={upload.id} href={`https://backoffice.urbagroupe.ma/${upload.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-2">
                                                        <IconUpload className="h-3 w-3"/>
                                                        {upload.originalFileName} ({formatDate(parseDate(upload.createdAt), "p")})
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                        {task.finalUpload && (
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version Finale:</span>
                                                <a key={task.finalUpload.id} href={`https://backoffice.urbagroupe.ma/${task.finalUpload.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline flex items-center gap-2">
                                                    <IconCircleCheck className="h-3 w-3"/>
                                                    {task.finalUpload.originalFileName} ({formatDate(parseDate(task.finalUpload.createdAt), "p")})
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    );

    // L-Trigger (Button) - BDDELNAH L-ICON
    const trigger = (
        <Button
            variant="outline"
            size="icon" // <-- BDDELNA L-SIZE
            className="mt-1" // <-- 7EYYEDNA 'flex-1'
            onClick={handleTriggerClick} 
            title="Voir Tâches" // <-- ZEDNA TITLE
        >
            <IconChecklist className="h-4 w-4" />
        </Button>
    );

    const footer = (<Button variant="outline">Fermer</Button>);

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerTrigger asChild>{trigger}</DrawerTrigger>
                <DrawerContent className="h-[90vh]">
                    <DrawerHeader className="gap-1">
                        <DrawerTitle>Tâches: {project.object}</DrawerTitle>
                    </DrawerHeader>
                    <div className="overflow-y-auto">
                        {content}
                    </div>
                    <DrawerFooter><DrawerClose asChild>{footer}</DrawerClose></DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent className="sm:max-w-lg flex flex-col">
                <SheetHeader className="gap-1">
                    <SheetTitle>Tâches: {project.object}</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto flex-1">
                    {content}
                </div>
                <SheetFooter><SheetClose asChild>{footer}</SheetClose></SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// =======================================================================
// 9. COMPOSANT CARTE (HNA FIN KAYN L-MODIFICATION)
// =======================================================================
function ProjectCard({ project }: { project: any }) {
    // L-Code l-qdim (Inchangé)
    const { text: remainingText, color: remainingColor } =
        calculateRemainingDays(project.submissionDeadline);
    const deadline = parseDate(project.submissionDeadline);
    const projectManager = project.projectManagers?.[0]?.name || "N/A";
    const isOverdue = remainingText === "Dépassé";

    // L-Code dyal l-équipe (Inchangé)
    const allTeamMembers = [
        ...(project.team?.infographistes || []),
        ...(project.team?.team3D || []),
        ...(project.team?.assistants || [])
    ];
    const uniqueNames = [...new Set(allTeamMembers.map(member => member.name))];
    const maxNamesToShow = 3;
    let displayTeam = "N/A";
    if (uniqueNames.length > 0) {
        const slicedNames = uniqueNames.slice(0, maxNamesToShow);
        if (uniqueNames.length > maxNamesToShow) {
            slicedNames.push("...");
        }
        displayTeam = slicedNames.join(', ');
    }

    return (
        // 7EYYEDNA L-LINK MN HNA
        <Card className={`
                flex flex-col justify-between shadow-sm hover:shadow-lg transition-shadow bg-card border-border
                ${isOverdue
                    ? 'border-red-500/30'
                    : 'bg-muted/70'
                }
            `}>
            {/* L-Header (Inchangé) */}
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow min-w-0">
                        <CardTitle className="text-base font-bold line-clamp-2" title={project.object}>
                            {project.object}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">{project.title}</CardDescription>
                    </div>
                    <div className="flex-shrink-0">
                        <div className="h-10 w-28 bg-muted rounded-md flex items-center justify-center">
                            <img src="/logo/logo-white-urba-events.png" alt="Logo" className="h-8 w-24 object-contain" />
                        </div>
                    </div>
                </div>
            </CardHeader>

            {/* L-Content (HNA TBDL L-CODE DYAL LAYOUT) */}
            <CardContent className="flex-grow">
                <div className="flex flex-col gap-4">
                    {/* Row 1: Status + PM (Inchangé) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Status
                            </span>
                            <div className="mt-1">
                                <NewProjectStatusPill status={project.preparationStatus} />
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Chef de Projet
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <IconUser className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm text-foreground truncate" title={projectManager}>
                                    {projectManager}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Équipe + Actions (Jdida) */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Col 1: Équipe */}
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Équipe Assignée
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <IconUsers className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm text-foreground truncate" title={displayTeam}>
                                    {displayTeam}
                                </span>
                            </div>
                        </div>
                        
                        {/* Col 2: Actions (HNA L-BDIL) */}
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Actions
                            </span>
                            {/* ZEDNA FLEX HNA BACH N-JEM3O L-BUTTONS */}
                            <div className="flex items-center gap-2 mt-1">
                                <ProjectTasksSheet project={project} /> 
                                <ProjectLogsSheet project={project} />  
                                <Button asChild variant="outline" size="icon" className="mt-1" title="Voir Détails">
                                    <Link href={`/dashboard/projects/${project.id}`}>
                                        <IconInfoCircle className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>
            </CardContent>

            {/* Footer (Inchangé) */}
            <CardFooter className={`
                p-3 mt-4 flex items-center gap-3
                ${isOverdue
                    ? 'bg-red-800/10'
                    : 'bg-muted/70'
                }
            `}>
                <div>
                    {isOverdue ? (
                        <IconAlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                        <IconClock className={`h-5 w-5 ${remainingColor}`} /> 
                    )}
                </div>
                <div className="flex flex-col">
                    <span className={`
                        font-bold text-sm 
                        ${isOverdue
                            ? 'text-red-500'
                            : remainingColor 
                        }
                    `}>
                        {remainingText}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Dépôt: {deadline ? deadline.toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "N/A"}
                    </span>
                </div>
            </CardFooter>
        </Card>
        // 7EYYEDNA L-LINK MN HNA
    );
}

// =======================================================================
// COMPOSANT PAGE PRINCIPALE (Inchangé)
// =======================================================================
export default function ProjectsPage() {
    const { data, loading, error } = useQuery(GET_PROJECTS_FEED);

    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const projects: ProjectFeedItem[] = data?.projects_feed || [];

    const searchQuery =
        columnFilters.find((filter) => filter.id === "project.object")?.value as string | undefined || "";

    // --- LOGIQUE DYAL TRI (Inchangé) ---
    const sortedProjects = React.useMemo(() => {
        return [...projects].sort((a, b) => {
            // Kan7sbo wach "Dépassé" l kol we7da
            const { text: textA } = calculateRemainingDays(a.project.submissionDeadline);
            const { text: textB } = calculateRemainingDays(b.project.submissionDeadline);
            const isOverdueA = textA === "Dépassé";
            const isOverdueB = textB === "Dépassé";

            // 1. Ila we7da "Dépassé" w l-okhra la: "Dépassé" dima f l-te7t
            if (isOverdueA && !isOverdueB) return 1;  // A (Dépassé) kayji mora B
            if (!isOverdueA && isOverdueB) return -1; // A (3adi) kayji qbel B

            // 2. Ila bjooj 3adiyin ( ماشي Dépassé)
            if (!isOverdueA && !isOverdueB) {
                // Kan-triyiw b l-date l-qriba (le plus urgent en premier)
                const dateA = parseDate(a.project.submissionDeadline)?.getTime() || 0;
                const dateB = parseDate(b.project.submissionDeadline)?.getTime() || 0;
                return dateA - dateB; // date sghira (qriba) hiya l-wla (Plus urgent)
            }

            // 3. Ila bjooj "Dépassé"
            if (isOverdueA && isOverdueB) {
                // Kan-triyiw b l-date l-qdima (le plus ancien en premier)
                const dateA = parseDate(a.project.submissionDeadline)?.getTime() || 0;
                const dateB = parseDate(b.project.submissionDeadline)?.getTime() || 0;
                return dateA - dateB; // date sghira (qdima) hiya l-wla (bqa bhal bhal)
            }

            return 0;
        });
    }, [projects]);
    // --- FIN LOGIQUE DYAL TRI ---


    // Filtrage (bqa bhal bhal)
    const filteredProjects = searchQuery
        ? sortedProjects.filter(
            (item) =>
                item.project.object
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                item.project.title
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
        )
        : sortedProjects;

    // --- LOGIQUE DYAL L-AFFICHAGE (Inchangé) ---
    const activeProjects = filteredProjects.filter(item => {
        const { text } = calculateRemainingDays(item.project.submissionDeadline);
        return text !== "Dépassé";
    });

    const archivedProjects = filteredProjects.filter(item => {
        const { text } = calculateRemainingDays(item.project.submissionDeadline);
        return text === "Dépassé";
    });
    // --- FIN LOGIQUE DYAL L-AFFICHAGE ---


    return (
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
                <div className="flex-grow flex-col space-y-8 p-4 md:p-8">
                    <div className="flex items-center justify-between space-y-2">
                        <h1 className="text-3xl font-bold">Projets</h1>
                    </div>

                    {/* --- Section 1: Chart (Inchangé) --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Aperçu de l'Activité</CardTitle>
                            <CardDescription>
                                Nombre total de projets par statut
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading && <Skeleton className="h-60 w-full" />}
                            {!loading && <ProjectsStatusChart data={projects} />}
                        </CardContent>
                    </Card>

                    {/* --- Section 2: Filters and Actions (Inchangé) --- */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par dossier ou client..."
                                value={searchQuery}
                                onChange={(event) =>
                                    setColumnFilters([
                                        { id: "project.object", value: event.target.value },
                                    ])
                                }
                                className="pl-9"
                            />
                        </div>
                        <CreateProjectDrawer />
                    </div>

                    {/* --- Section 3: The New Card Grid (Inchangé) --- */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {loading &&
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-60" />
                            ))}
                        {error && (
                            <p className="text-red-500 col-span-4">
                                Erreur de chargement des projets: {error.message}
                            </p>
                        )}
                        {!loading &&
                            !error &&
                            activeProjects.map((item: ProjectFeedItem) => (
                                <ProjectCard key={item.project.id} project={item.project} />
                            ))}
                    </div>

                    {/* --- ZIYADA: Section 3.5: Séparateur w l-Archive (Inchangé) --- */}
                    {!loading && !error && archivedProjects.length > 0 && (
                        <>
                            {/* Séparateur b l-label f l-west */}
                            <div className="relative my-6">
                                <Separator />
                                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-3 text-sm font-medium text-muted-foreground">
                                    Archives (Dépassé)
                                </span>
                            </div>

                            {/* Grid jdida l-l'archive */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {archivedProjects.map((item: ProjectFeedItem) => (
                                    <ProjectCard key={item.project.id} project={item.project} />
                                ))}
                            </div>
                        </>
                    )}
                    {/* --- FIN DYAL L-ZIYADA --- */}


                    <Separator className="my-6" />

                    {/* --- Section 4: Your Existing Data Table (Inchangé) --- */}
                    <h2 className="text-2xl font-semibold">Tous les Dossiers (Table)</h2>
                    {loading && <Skeleton className="h-96 w-full" />}
                    {!loading && !error && (
                        <DataTable
                            columns={columns}
                            data={projects} // Kanbqa n-passiw l-data kamla l-table
                            columnFilters={columnFilters}
                            onColumnFiltersChange={setColumnFilters}
                        />
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}