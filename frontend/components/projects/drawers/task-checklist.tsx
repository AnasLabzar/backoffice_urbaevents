"use client";

import * as React from "react";
import { useMutation, useLazyQuery, useQuery } from "@apollo/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseDate } from "../utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerTrigger } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/ui/file-upload";
import { IconChecklist, IconClock, IconLoader, IconCircleCheck, IconUpload, IconUser, IconFileDownload, IconListCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { GET_TASKS_BY_PROJECT_QUERY, ME_QUERY, PM_UPDATE_TASK_STATUS_MUTATION, TEAM_UPLOAD_TASK_V1_MUTATION, TEAM_UPLOAD_TASK_FINAL_MUTATION, GET_PROJECTS_FEED } from "@/lib/graphql/projects";

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
            <Icon className={cn("h-3 w-3 mr-1.5", status === 'IN_PROGRESS' && 'animate-spin')} />{statusInfo.label}
        </Badge>
    );
}

export function TaskChecklistPanel({ project }: { project: any }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = React.useState(false);

    // 1. Récupération du rôle et ID
    const { data: meData } = useQuery(ME_QUERY);
    const currentUserId = meData?.me?.id;
    const userRole = meData?.me?.role?.name;

    // State Uploads
    const [fileV1, setFileV1] = React.useState<File | null>(null);
    const [fileFinal, setFileFinal] = React.useState<File | null>(null);

    // Queries & Mutations
    const [getTasks, { data: taskData, loading: taskLoading }] = useLazyQuery(GET_TASKS_BY_PROJECT_QUERY);

    const [updateTaskStatus, { loading: loadingTaskUpdate }] = useMutation(PM_UPDATE_TASK_STATUS_MUTATION, {
        onCompleted: () => toast.success("Status mis à jour!"),
        onError: (error) => toast.error(`Erreur: ${error.message}`),
        refetchQueries: [{ query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: project.id } }, { query: GET_PROJECTS_FEED }],
    });
    const [uploadV1, { loading: loadingV1 }] = useMutation(TEAM_UPLOAD_TASK_V1_MUTATION, {
        onCompleted: () => { toast.success("V1 uploadée!"); setFileV1(null); },
        onError: (error) => toast.error(`Erreur: ${error.message}`),
        refetchQueries: [{ query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: project.id } }],
    });
    const [uploadFinal, { loading: loadingFinal }] = useMutation(TEAM_UPLOAD_TASK_FINAL_MUTATION, {
        onCompleted: () => { toast.success("Finale uploadée!"); setFileFinal(null); },
        onError: (error) => toast.error(`Erreur: ${error.message}`),
        refetchQueries: [{ query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: project.id } }],
    });

    const handleTriggerClick = () => {
        setIsOpen(true);
        getTasks({ variables: { projectId: project.id } });
    };

    const handleFileUploadAndMutate = async (file: File | null, mutation: Function, docType: string, taskId: string) => {
        if (!file) { toast.error(`Aucun fichier sélectionné.`); return false; }
        try {
            const formDataRest = new FormData();
            formDataRest.append('file', file);
            toast.loading(`Upload en cours...`);
            const response = await fetch(`http://localhost:5002/api/upload/${project.id}`, { method: 'POST', body: formDataRest });
            if (!response.ok) throw new Error('Upload failed.');
            const result = await response.json();
            toast.dismiss();
            await mutation({ variables: { taskId: taskId, originalFileName: file.name, fileUrl: result.fileUrl } });
            return true;
        } catch (error: any) {
            toast.dismiss();
            toast.error(`Erreur: ${error.message}`);
            return false;
        }
    };

    // 2. Filtrage : Admin voit tout, Membre voit ses tâches
    const tasksToDisplay = taskData?.tasksByProject.filter((task: any) => {
        if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER') return true;
        return task.assignedTo?.id === currentUserId;
    });

    const content = (
        <div className="flex flex-col h-full"> {/* FIX: Flex column full height */}
            {taskLoading && <div className="space-y-4 p-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}

            {!taskLoading && tasksToDisplay && tasksToDisplay.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <IconChecklist className="h-10 w-10 mb-2 opacity-20" />
                    <p>Aucune tâche trouvée.</p>
                </div>
            )}

            {!taskLoading && tasksToDisplay && tasksToDisplay.length > 0 && (
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {tasksToDisplay.map((task: any) => {
                            // 3. Logique de Permission (Qui peut éditer ?)
                            // Seul l'assigné peut modifier (upload/status)
                            const isAssignee = currentUserId === task.assignedTo?.id;
                            const canEdit = isAssignee;

                            return (
                                <AccordionItem value={task.id} key={task.id} className="border rounded-lg px-4 bg-card shadow-sm">
                                    <AccordionTrigger className="hover:no-underline py-4">
                                        <div className="flex items-center justify-between w-full gap-4 pr-2">
                                            <div className="flex flex-col items-start text-left gap-1">
                                                <span className="font-semibold text-sm line-clamp-1">{task.description}</span>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <IconUser className="h-3 w-3" />
                                                        <span>{task.assignedTo?.name || 'Non assigné'}</span>
                                                    </div>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(parseDate(task.createdAt)!, { addSuffix: true, locale: fr })}</span>
                                                </div>
                                            </div>
                                            <TaskStatusBadge status={task.status} />
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="pt-2 pb-6">
                                        {canEdit ? (
                                            /* --- MODE ÉDITION (Assigné) --- */
                                            <div className="flex flex-col gap-5">
                                                <div className="p-3 bg-muted/30 rounded-md border border-border/50">
                                                    <Label className="mb-2 block">Changer le statut</Label>
                                                    <Select
                                                        value={task.status}
                                                        onValueChange={(val) => updateTaskStatus({ variables: { taskId: task.id, status: val } })}
                                                        disabled={loadingTaskUpdate}
                                                    >
                                                        <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="TODO">À Faire</SelectItem>
                                                            <SelectItem value="IN_PROGRESS">En Cours</SelectItem>
                                                            <SelectItem value="DONE">Terminé</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Version Intermédiaire (V1)</Label>
                                                        <FileUpload label="Uploader V1" onFileSelect={setFileV1} />
                                                        <Button size="sm" variant="secondary" className="w-full mt-2" disabled={loadingV1 || !fileV1} onClick={() => handleFileUploadAndMutate(fileV1, uploadV1, 'TASK_V1', task.id)}>
                                                            {loadingV1 ? "Envoi..." : "Envoyer V1"}
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Version Finale</Label>
                                                        <FileUpload label="Uploader Finale" onFileSelect={setFileFinal} />
                                                        <Button size="sm" className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white" disabled={loadingFinal || !fileFinal} onClick={() => handleFileUploadAndMutate(fileFinal, uploadFinal, 'TASK_FINAL', task.id)}>
                                                            {loadingFinal ? "Envoi..." : "Envoyer Finale"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* --- MODE LECTURE SEULE (Admin/Superviseur) --- */
                                            <div className="flex flex-col gap-4">
                                                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-800 text-sm">
                                                    <p className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                                                        <IconUser className="h-4 w-4" />
                                                        Assigné à {task.assignedTo?.name}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 text-xs">
                                                        Mode supervision. Seul l'assigné peut uploader.
                                                    </p>
                                                </div>
                                                <Separator />
                                                <div>
                                                    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Livrables</h5>
                                                    {task.v1Uploads.length === 0 && !task.finalUpload && (
                                                        <p className="text-sm text-muted-foreground italic">Aucun fichier.</p>
                                                    )}
                                                    <div className="space-y-2">
                                                        {task.v1Uploads.map((upload: any) => (
                                                            <a key={upload.id} href={`http://localhost:5002/${upload.fileUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors group">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <IconUpload className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                                    <span className="text-sm truncate">{upload.originalFileName}</span>
                                                                    <Badge variant="secondary" className="text-[10px] h-5">V1</Badge>
                                                                </div>
                                                                <IconFileDownload className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                                                            </a>
                                                        ))}
                                                        {task.finalUpload && (
                                                            <a href={`http://localhost:5002/${task.finalUpload.fileUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 rounded border border-green-200 bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100/50 transition-colors group">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <IconCircleCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                                    <span className="text-sm truncate font-medium">{task.finalUpload.originalFileName}</span>
                                                                    <Badge className="text-[10px] h-5 bg-green-600 hover:bg-green-700">Final</Badge>
                                                                </div>
                                                                <IconFileDownload className="h-4 w-4 text-green-700 dark:text-green-400" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </div>
            )}
        </div>
    );

    const trigger = (<Button variant="outline" size="sm" className="w-full" onClick={handleTriggerClick}><IconListCheck className="mr-2 h-4 w-4" /> Voir Checklist</Button>);
    const footer = (<Button variant="outline" className="w-full sm:w-auto">Fermer</Button>);

    if (isMobile) {
        return <Drawer open={isOpen} onOpenChange={setIsOpen}><DrawerTrigger asChild>{trigger}</DrawerTrigger><DrawerContent className="h-[90vh]"><DrawerHeader className="gap-1"><DrawerTitle>Tâches: {project.object}</DrawerTitle></DrawerHeader>{content}<DrawerFooter><DrawerClose asChild>{footer}</DrawerClose></DrawerFooter></DrawerContent></Drawer>;
    }
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            {/* FIX: Structure Flex pour SheetContent */}
            <SheetContent className="sm:max-w-xl w-full flex flex-col p-0 gap-0">
                <SheetHeader className="p-6 pb-2 border-b">
                    <SheetTitle>Tâches: {project.object}</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-hidden">
                    {content}
                </div>

                <SheetFooter className="p-4 border-t mt-auto">
                    <SheetClose asChild>{footer}</SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}