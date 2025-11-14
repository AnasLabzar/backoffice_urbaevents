"use client";

import * as React from "react";
import { gql, useLazyQuery } from "@apollo/client";
import {
    IconUser, IconListCheck, IconUsers, IconLoader,
    IconClock, IconActivity, IconEye,
    IconCalendarEvent, IconClockHour3, IconCheck
} from "@tabler/icons-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
    SheetTrigger
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, formatDistance, formatDistanceToNow, differenceInDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Project, Task } from "@/lib/types"; // Import mn l-file l-jdid
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "./ui/drawer";

// --- QUERIES (mn l-file l-qdim) ---
const GET_TASKS_BY_PROJECT_QUERY = gql`
  query GetTasksByProject($projectId: ID!) {
    tasksByProject(projectId: $projectId) {
      id
      description
      status
      createdAt
      updatedAt
      assignedTo {
        id
        name
      }
    }
  }
`;

const GET_LOGS_QUERY = gql`
  query GetLogs($projectId: ID!) {
    logs(projectId: $projectId) {
      id
      details
      createdAt
      user { name }
    }
  }
`;

// --- HELPERS (mn l-file l-qdim) ---
function TaskStatusPill({ status }: { status: Task["status"] }) {
    const config = {
        TODO: { label: "À Faire", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
        IN_PROGRESS: { label: "En Cours", className: "bg-blue-100 text-blue-800 border-blue-200" },
        DONE: { label: "Terminé", className: "bg-green-100 text-green-800 border-green-200" },
    };
    const configStatus = config[status] || config.TODO;
    return (
        <Badge variant="outline" className={cn("capitalize border", configStatus.className)}>
            {configStatus.label}
        </Badge>
    );
}

function ProjectStatusPill({ status }: { status: string }) {
    const safeStatus = status || "UNKNOWN";
    let dotColor = "bg-gray-500";
    if (status === 'IN_PRODUCTION') dotColor = "bg-purple-500";

    return (
        <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
            <span className="text-sm text-muted-foreground capitalize">
                {safeStatus.toLowerCase().replace('_', ' ')}
            </span>
        </div>
    );
}

function parseDate(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    let date;
    if (/^\d+$/.test(dateString)) {
        date = new Date(parseInt(dateString, 10));
    } else {
        date = new Date(dateString);
    }
    if (isNaN(date.getTime())) return null;
    return date;
}
function formatDate(date: Date | null, formatStr: string = "PPP") {
    if (!date) return "N/A";
    try {
        return format(date, formatStr, { locale: fr });
    } catch (error) {
        return "Date Invalide";
    }
}

// --- "PANIER" COMPONENT ---
function ProjectPreviewPanel({ project }: { project: Project }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = React.useState(false);
    const [getLogs, { data: logData, loading: logLoading }] = useLazyQuery(GET_LOGS_QUERY);

    const handleTriggerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(true);
        if (!logData) {
            getLogs({ variables: { projectId: project.id } });
        }
    };

    const submissionDate = parseDate(project.submissionDeadline);
    const cautionDate = submissionDate ? subDays(submissionDate, 7) : null;

    const content = (
        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
            <div className="flex flex-col gap-3 rounded-lg border p-4">
                <h4 className="font-semibold">Détails du Projet</h4>
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{project.title}</span>
                    <span className="text-muted-foreground">Projet:</span>
                    <span className="font-medium">{project.object}</span>
                    <span className="text-muted-foreground">Status:</span>
                    <span><ProjectStatusPill status={project.preparationStatus} /></span>
                    <span className="text-muted-foreground">Chef de Projet:</span>
                    <span className="font-medium">
                        {project.projectManagers[0]?.name || "N/A"}
                    </span>
                </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border p-4">
                <h4 className="font-semibold flex items-center gap-2"><IconClock className="h-4 w-4" />Dates Clés</h4>
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Demande Caution (Calc.):</span>
                    <span className="font-medium">{formatDate(cautionDate, "PPP")}</span>
                    <span className="text-muted-foreground">Date de Dépôt:</span>
                    <span className="font-medium text-red-500">{formatDate(submissionDate, "PPP p")}</span>
                </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border p-4">
                <h4 className="font-semibold flex items-center gap-2"><IconUsers className="h-4 w-4" />Équipe Assignée</h4>
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Infographistes:</span>
                    <div className="flex flex-col">
                        {project.team.infographistes.length > 0 ? (
                            project.team.infographistes.map((u) => <span key={u.id} className="font-medium">{u.name}</span>)
                        ) : <span className="font-medium text-muted-foreground">N/A</span>}
                    </div>
                    <span className="text-muted-foreground">Équipe 3D:</span>
                    <div className="flex flex-col">
                        {project.team.team3D.length > 0 ? (
                            project.team.team3D.map((u) => <span key={u.id} className="font-medium">{u.name}</span>)
                        ) : <span className="font-medium text-muted-foreground">N/A</span>}
                    </div>
                    <span className="text-muted-foreground">Assistants:</span>
                    <div className="flex flex-col">
                        {project.team.assistants.length > 0 ? (
                            project.team.assistants.map((u) => <span key={u.id} className="font-medium">{u.name}</span>)
                        ) : <span className="font-medium text-muted-foreground">N/A</span>}
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border p-4">
                <h4 className="font-semibold flex items-center gap-2"><IconActivity className="h-4 w-4" />Traçabilité (Logs)</h4>
                <div className="max-h-48 overflow-y-auto">
                    {logLoading && <Skeleton className="h-8 w-full" />}
                    {logData && logData.logs.length === 0 && <p className="text-muted-foreground">Aucune activité.</p>}
                    <ul className="list-none space-y-2">
                        {logData?.logs.map((log: any) => (
                            <li key={log.id} className="text-xs">
                                <span className="font-medium">{log.user?.name || "Utilisateur"}</span>
                                <span className="text-muted-foreground">: {log.details}</span>
                                <br />
                                <span className="text-muted-foreground/70">{formatDate(parseDate(log.createdAt), "P p")}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );

    const trigger = (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleTriggerClick}>
            <IconEye className="h-4 w-4" />
        </Button>
    );
    const footer = (<Button variant="outline">Done</Button>);

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerTrigger asChild>{trigger}</DrawerTrigger>
                <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader className="gap-1">
                        <DrawerTitle>{project.object}</DrawerTitle>
                        <DrawerDescription>Aperçu du dossier (Read-Only).</DrawerDescription>
                    </DrawerHeader>
                    <div className="overflow-y-auto">{content}</div>
                    <DrawerFooter><DrawerClose asChild>{footer}</DrawerClose></DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent className="sm:max-w-xl flex flex-col">
                <SheetHeader className="gap-1">
                    <SheetTitle>{project.object}</SheetTitle>
                    <SheetDescription>Aperçu du dossier (Read-Only).</SheetDescription>
                </SheetHeader>
                <div className="flex-grow overflow-y-auto -mr-6 pr-6">{content}</div>
                <SheetFooter><SheetClose asChild>{footer}</SheetClose></SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// --- COMPONENT DYAL TÂCHES (BDDELNAH) ---
function UserTasks({ tasks }: { tasks: Task[] }) { // St3mlna Type Task

    if (!tasks || tasks.length === 0) {
        return <p className="p-4 text-sm text-center text-muted-foreground bg-background/30">Aucune tâche assignée pour ce projet.</p>;
    }

    return (
        <div className="space-y-3 px-6 py-4 bg-background/30">
            {tasks.map((task) => {
                // HNA L-LOGIC DYAL L-WEQT
                const startDate = parseDate(task.createdAt);
                const endDate = task.status === 'DONE' ? parseDate(task.updatedAt) : null;
                let duration = "N/A";

                if (startDate && endDate) {
                    duration = formatDistance(endDate, startDate, { locale: fr });
                } else if (startDate) {
                    duration = `En cours (depuis ${formatDistanceToNow(startDate, { locale: fr, addSuffix: true })})`;
                }

                return (
                    <div key={task.id} className="p-3 border rounded-lg bg-background shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">{task.description}</span>
                            <TaskStatusPill status={task.status} />
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <IconCalendarEvent className="h-3 w-3" />
                                <span>Créée: {formatDate(startDate)}</span>
                            </div>
                            {endDate && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <IconCheck className="h-3 w-3" />
                                    <span>Terminée: {formatDate(endDate)}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <IconClockHour3 className="h-3 w-3" />
                            <span>Durée: {duration}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// --- COMPONENT DYAL L-ROW L-KBIR (BDDELNAH BZZEF) ---
function ProjectTeamRow({ project }: { project: Project }) {

    // HNA L-FIX L-KBIR: 3iytna l-useLazyQuery hna (f l-Parent)
    const [getTasks, { data: tasksData, loading: tasksLoading }] = useLazyQuery(GET_TASKS_BY_PROJECT_QUERY, {
        fetchPolicy: "network-only" // HADI MOHIMMA: bach y-forci refresh o ma y-jbedch mn l-cache
    });
    const [isTasksLoaded, setIsTasksLoaded] = React.useState(false);

    const allMembers = [
        ...project.team.infographistes,
        ...project.team.team3D,
        ...project.team.assistants,
    ];
    const isEmpty = allMembers.length === 0;

    // L-Function l-jdida: Mli n-clickiw 3la l-projet
    const handleProjectToggle = (isOpen: boolean) => {
        // Ila l-user 7ell l-accordion o l-data mazal ma jat, jibha
        if (isOpen && !isTasksLoaded) {
            getTasks({ variables: { projectId: project.id } });
            setIsTasksLoaded(true);
        }
    };

    // N-7sbo l-progress
    const calculateProgress = () => {
        if (!isTasksLoaded || !tasksData) return 0; // Mazal ma t-chargaw
        const tasks = tasksData.tasksByProject;
        if (tasks.length === 0) return 0; // Ma kayn 7tta task

        const doneTasks = tasks.filter((t: any) => t.status === 'DONE').length;
        return Math.round((doneTasks / tasks.length) * 100);
    };

    const progressPercent = calculateProgress();

    return (
        <AccordionItem value={project.id} className="border-b">

            {/* Hada howa l-Row dyal l-Projet (L-Fowqani) */}
            <AccordionTrigger
                className="px-4 py-3 hover:bg-muted/50 hover:no-underline focus:no-underline data-[state=open]:bg-muted/50"
                // Mli t-clicki 3lih, 3iyt l-function jida
                onClick={() => handleProjectToggle(true)} // N-bdaw n-chargiw l-data
            >
                <div className="flex justify-between items-center w-full">
                    {/* L-Info dyal l-Projet */}
                    <div className="flex flex-col text-left gap-1">
                        <span className="font-semibold text-base">{project.object}</span>
                        <span className="text-sm text-muted-foreground font-normal">{project.title}</span>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 pr-2">

                        {/* ZIDNA L-PROGRESS BAR HNA */}
                        <div className="hidden md:flex flex-col items-start w-32">
                            <span className="text-xs text-muted-foreground">Avancement</span>
                            <div className="flex items-center gap-2 w-full">
                                <Progress value={progressPercent} className="h-2 w-full" />
                                <span className="text-sm font-medium">{progressPercent}%</span>
                            </div>
                        </div>

                        {/* Info 1: Chef de Projet */}
                        <div className="hidden sm:flex flex-col items-start">
                            <span className="text-xs text-muted-foreground">Chef de Projet</span>
                            <span className="text-sm font-medium">{project.projectManagers[0]?.name || "N/A"}</span>
                        </div>

                        {/* Info 2: L-Équipe */}
                        <div className="flex items-center gap-2">
                            <IconUsers className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">{allMembers.length}</span>
                        </div>

                        {/* Info 3: L-Outil dyal "Panier" */}
                        <ProjectPreviewPanel project={project} />
                    </div>
                </div>
            </AccordionTrigger>

            {/* Hada howa l-Dropdown dyal l-Équipe */}
            <AccordionContent className="bg-muted/30 p-0">
                {tasksLoading ? (
                    <div className="flex items-center justify-center p-6">
                        <IconLoader className="h-5 w-5 animate-spin" />
                        <span className="ml-2">Chargement des tâches...</span>
                    </div>
                ) : isEmpty ? (
                    <div className="p-6 text-center">
                        <p className="text-muted-foreground mb-3 text-sm">Aucune équipe assignée.</p>
                        <Button size="sm" variant="outline">
                            Assigner une équipe
                        </Button>
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {allMembers.map((member: any) => {
                            // HNA L-FIX L-KBIR: N-filtriw l-tasks qbel ma n-siftohom
                            const userTasks = tasksData?.tasksByProject.filter(
                                (task: any) => task.assignedTo.id === member.id
                            ) || [];

                            return (
                                <AccordionItem value={member.id} key={member.id} className="border-b border-border/50 last:border-b-0">
                                    {/* Hada howa l-Row dyal l-Member */}
                                    <AccordionTrigger className="px-6 py-3 hover:bg-muted/50 hover:no-underline focus:no-underline">
                                        <div className="flex justify-between items-center w-full pr-4">
                                            <div className="flex items-center gap-3">
                                                <IconUser className="h-5 w-5 text-blue-600" />
                                                <span className="font-medium">{member.name}</span>
                                            </div>
                                            <Badge variant="secondary">{userTasks.length} Tâche(s)</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    {/* Hada howa l-Dropdown dyal les Tâches */}
                                    <AccordionContent>
                                        {/* 3tina l-component l-tasks l-lista l-mfeltra */}
                                        <UserTasks tasks={userTasks} />
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                )}
            </AccordionContent>
        </AccordionItem>
    );
}

// --- 6. L-COMPONENT L-RA2ISSI DYAL L-PAGE (StructureAccordion) ---
interface StructureAccordionProps {
    projects: Project[];
}

export function StructureAccordion({ projects }: StructureAccordionProps) {
    return (
        <div className="border rounded-lg">
            {projects.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">
                    Aucun projet ne correspond à vos filtres.
                </p>
            ) : (
                <Accordion type="single" collapsible className="w-full">
                    {projects.map((project) => (
                        <ProjectTeamRow key={project.id} project={project} />
                    ))}
                </Accordion>
            )}
        </div>
    );
}