"use client";

import React, { useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { gql, useQuery, useMutation } from "@apollo/client";
import {
    IconLayoutKanban, IconUsers, IconFiles,
    IconClock, IconCheck, IconAlertTriangle, IconLoader,
    IconBriefcase, IconChecklist, IconCloudUpload,
    IconFile, IconDownload, IconX, IconFlag,
    IconCalendar, IconUserCircle, IconLock, IconInfoCircle,
    IconFileDescription // ✅ Import ajouté pour le bouton Brief
} from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

// Layout
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

// --- GRAPHQL DEFINITIONS ---

const GET_PROJECT_FULL_DETAILS = gql`
  query GetProjectFullDetails($projectId: ID!) {
    project(id: $projectId) {
      id
      title
      projectCode
      object
      status: generalStatus
      stages {
        technical {
          documents {
            id
            fileName
            fileUrl
            originalFileName
            createdAt
            uploadedBy {
              id
              name
            }
          }
        }
      }
      team {
        infographistes { id name }
        team3D { id name }
        coordinators { id name }
        pmJuniors { id name }
      }
    }
    tasksByProject(projectId: $projectId) {
      id
      description
      status
      department
      createdAt
      assignedTo { id name }
      priority 
      dueDate
    }
    allInfographistes: users(role: "CREATIVE") { id name }
    allTeam3D: users(role: "3D_ARTIST") { id name }
    allCoordinators: users(role: "COORDINATOR") { id name } 
  }
`;

const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($input: PMCreateTaskInput!) {
    pm_createTask(input: $input) { 
        id 
        description 
        status 
        priority
        dueDate
    }
  }
`;

const ASSIGN_TEAM_MUTATION = gql`
  mutation CpAssignTeam($input: CPAssignTeamInput!) { 
    cp_assignTeam(input: $input) { id } 
  }
`;

const UPLOAD_ASSET_MUTATION = gql`
  mutation CpUploadAsset($projectId: ID!, $fileUrl: String!, $originalFileName: String!) { 
    cp_uploadAsset(projectId: $projectId, fileUrl: $fileUrl, originalFileName: $originalFileName) { 
        id 
        stages {
            technical {
                documents {
                    id
                }
            }
        }
    } 
  }
`;

// --- HELPER FUNCTIONS (Robust Date Handling) ---

const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return format(date, "d MMM", { locale: fr });
};

const getDueDateStyles = (dateStr: string | null | undefined, status: string) => {
    if (!dateStr || status === 'DONE') {
        return {
            color: "text-muted-foreground",
            bg: "bg-muted/50",
            border: "border-transparent",
            label: "Pas de date"
        };
    }

    let date = new Date(dateStr);

    if (isNaN(date.getTime())) {
        const timestamp = Number(dateStr);
        if (!isNaN(timestamp) && timestamp > 0) {
            if (timestamp < 10000000000) {
                date = new Date(timestamp * 1000);
            } else {
                date = new Date(timestamp);
            }
        }
    }

    if (isNaN(date.getTime())) {
        return {
            color: "text-red-600 dark:text-red-400",
            bg: "bg-red-50 dark:bg-red-900/20",
            border: "border-red-200 dark:border-red-800",
            label: "Date Invalide"
        };
    }

    try {
        if (isToday(date)) return {
            color: "text-orange-700 dark:text-orange-400",
            bg: "bg-orange-50 dark:bg-orange-950/30",
            border: "border-orange-200 dark:border-orange-800",
            label: "Aujourd'hui"
        };

        if (isTomorrow(date)) return {
            color: "text-blue-700 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/30",
            border: "border-blue-200 dark:border-blue-800",
            label: "Demain"
        };

        if (isPast(date)) return {
            color: "text-red-700 dark:text-red-400",
            bg: "bg-red-50 dark:bg-red-950/30",
            border: "border-red-200 dark:border-red-800",
            label: "En retard"
        };

        const daysLeft = differenceInDays(date, new Date());
        if (daysLeft <= 3 && daysLeft > 0) return {
            color: "text-amber-700 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950/30",
            border: "border-amber-200 dark:border-amber-800",
            label: format(date, "d MMM", { locale: fr })
        };

        return {
            color: "text-slate-600 dark:text-slate-400",
            bg: "bg-slate-50 dark:bg-slate-800/50",
            border: "border-slate-200 dark:border-slate-700",
            label: format(date, "d MMM", { locale: fr })
        };
    } catch (e) {
        return { color: "text-muted-foreground", bg: "bg-muted", border: "border-transparent", label: "Err calcul" };
    }
};

// --- MAIN PAGE COMPONENT ---
export default function ProductionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = use(params);
    const router = useRouter();

    const { data, loading, error, refetch } = useQuery(GET_PROJECT_FULL_DETAILS, {
        variables: { projectId },
        fetchPolicy: "network-only"
    });

    const canManageTeam = !!data?.allInfographistes && !!data?.allTeam3D;

    const projectTeamForTasks = useMemo(() => {
        if (!data?.project?.team) return [];
        const team = data.project.team;
        return [
            ...(team.infographistes || []).map((u: any) => ({ ...u, role: 'Infographiste' })),
            ...(team.team3D || []).map((u: any) => ({ ...u, role: '3D Artist' })),
            ...(team.coordinators || []).map((u: any) => ({ ...u, role: 'Coordinateur' })),
            ...(team.pmJuniors || []).map((u: any) => ({ ...u, role: 'PM Junior' }))
        ];
    }, [data]);

    const currentTeamMembers = useMemo(() => {
        if (!data?.project?.team) return [];
        const team = data.project.team;
        return [
            ...(team.infographistes || []),
            ...(team.team3D || []),
            ...(team.coordinators || [])
        ];
    }, [data]);

    const stats = useMemo(() => {
        if (!data?.tasksByProject) return { total: 0, progress: 0 };
        const total = data.tasksByProject.length;
        const completed = data.tasksByProject.filter((t: any) => t.status === 'DONE').length;
        return {
            total,
            progress: total === 0 ? 0 : Math.round((completed / total) * 100)
        };
    }, [data]);

    const projectFiles = useMemo(() => {
        return data?.project?.stages?.technical?.documents || [];
    }, [data]);

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <IconLoader className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Chargement de l'espace production...</p>
        </div>
    );

    if (error) return (
        <div className="h-screen w-full flex flex-col items-center justify-center text-destructive p-6 text-center">
            <div className="bg-destructive/10 p-4 rounded-full mb-4">
                <IconAlertTriangle className="w-12 h-12" />
            </div>
            <p className="text-lg font-bold mb-2">Une erreur est survenue</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">{error.message}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
    );

    const { project, tasksByProject } = data;

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" />
            <SidebarInset className="overflow-x-hidden bg-muted/5 dark:bg-background/95">
                <SiteHeader />
                <div className="min-h-screen flex flex-col">

                    {/* --- HEADER --- */}
                    <div className="bg-background border-b px-4 sm:px-6 py-6 shadow-sm">
                        <div className="max-w-[1920px] mx-auto space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <SidebarTrigger className="md:hidden mr-2" />
                                    <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => router.push('/dashboard/projects')}>Projets</span>
                                    <span className="opacity-50">/</span>
                                    <span className="font-mono font-medium text-foreground/80">{project.projectCode}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* ✅ NOUVEAU BOUTON BRIEF */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs font-medium gap-2 border border-dashed text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/20 hidden sm:flex"
                                        onClick={() => router.push(`/dashboard/projects/${projectId}/brief`)}
                                    >
                                        <IconFileDescription className="w-3.5 h-3.5" />
                                        Voir le Brief
                                    </Button>

                                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", project.status === 'DONE' ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800")}>
                                        {project.status === 'DONE' ? 'TERMINÉ' : 'EN PRODUCTION'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                                <div className="space-y-2">
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                        {project.title}
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <IconBriefcase className="w-4 h-4 opacity-70" />
                                        <span className="line-clamp-1">{project.object}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 bg-card p-3 rounded-xl border shadow-sm">
                                    <div className="flex items-center -space-x-3 hover:space-x-1 transition-all">
                                        {currentTeamMembers.slice(0, 4).map((u: any, i: number) => (
                                            <Avatar key={i} className="border-2 border-background w-9 h-9" title={u.name}>
                                                <AvatarFallback className="bg-primary/10 dark:bg-primary/20 text-primary text-[10px] font-bold">
                                                    {u.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                        {currentTeamMembers.length > 4 && (
                                            <div className="w-9 h-9 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold">
                                                +{currentTeamMembers.length - 4}
                                            </div>
                                        )}
                                    </div>
                                    <Separator orientation="vertical" className="h-8" />
                                    <div className="flex flex-col gap-1 min-w-[140px]">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-muted-foreground">Progression</span>
                                            <span className="text-primary">{stats.progress}%</span>
                                        </div>
                                        <Progress value={stats.progress} className="h-2" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- MAIN CONTENT --- */}
                    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1920px] mx-auto w-full space-y-8">

                        <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 shadow-sm">
                            <IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertTitle className="text-blue-700 dark:text-blue-300 font-semibold">Espace de Production</AlertTitle>
                            <AlertDescription className="text-blue-600/90 dark:text-blue-400/90 mt-1 text-xs">
                                Les documents uploadés apparaissent dans l'onglet "Fichiers". L'équipe technique peut récupérer les assets ici.
                            </AlertDescription>
                        </Alert>

                        <Tabs defaultValue="tasks" className="flex flex-col h-full space-y-6">

                            <div className="flex items-center justify-between sticky top-0 z-10 bg-muted/5 dark:bg-background/95 pb-2 backdrop-blur-sm">
                                <TabsList className="bg-background p-1 border shadow-sm">
                                    <TabsTrigger value="tasks" className="gap-2 px-4"><IconLayoutKanban className="w-4 h-4" /> Tâches</TabsTrigger>
                                    <TabsTrigger value="assets" className="gap-2 px-4"><IconFiles className="w-4 h-4" /> Fichiers <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{projectFiles.length}</Badge></TabsTrigger>
                                    <TabsTrigger value="team" className="gap-2 px-4"><IconUsers className="w-4 h-4" /> Équipe</TabsTrigger>
                                </TabsList>
                                <div className="hidden sm:flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="h-9 gap-2 bg-background" onClick={() => refetch()}>
                                        <IconClock className="w-3.5 h-3.5" /> Actualiser
                                    </Button>
                                </div>
                            </div>

                            <TabsContent value="tasks" className="mt-0 h-full space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-full">
                                    <InlineTaskCreator
                                        projectId={projectId}
                                        availableUsers={projectTeamForTasks}
                                        onTaskCreated={refetch}
                                    />
                                </div>
                                <TaskBoard tasks={tasksByProject} />
                            </TabsContent>

                            <TabsContent value="assets" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <AssetsManager
                                    projectId={projectId}
                                    files={projectFiles}
                                    onUploadSuccess={refetch}
                                />
                            </TabsContent>

                            <TabsContent value="team" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <TeamManager
                                    projectId={projectId}
                                    currentTeam={project.team}
                                    tasks={tasksByProject}
                                    // ✅ Passina l-data wakha tkoun null
                                    allUsers={{
                                        infographistes: data.allInfographistes || [],
                                        team3D: data.allTeam3D || [],
                                        coordinators: data.allCoordinators || []
                                    }}
                                    // ✅ Passina l-flag bach n-wriw view differente
                                    isReadOnly={!canManageTeam}
                                    onUpdate={refetch}
                                />
                            </TabsContent>

                        </Tabs>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

// ------------------------------------------------------------------
// COMPONENT 1: INLINE TASK CREATOR
// ------------------------------------------------------------------
function InlineTaskCreator({ projectId, availableUsers, onTaskCreated }: any) {
    const [desc, setDesc] = useState("");
    const [assignee, setAssignee] = useState("");
    const [dept, setDept] = useState("");
    const [priority, setPriority] = useState("NORMAL");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [isExpanded, setIsExpanded] = useState(false);

    const [createTask, { loading }] = useMutation(CREATE_TASK_MUTATION, {
        onCompleted: () => {
            toast.success("Tâche créée");
            setDesc(""); setAssignee(""); setDept(""); setPriority("NORMAL"); setDate(undefined);
            setIsExpanded(false);
            onTaskCreated();
        },
        onError: (e) => toast.error(e.message)
    });

    const handleSubmit = () => {
        if (!desc.trim() || !assignee) {
            toast.error("Info manquante", { description: "Description et responsable requis." });
            return;
        }
        createTask({
            variables: {
                input: {
                    projectId,
                    description: desc,
                    assignedToId: assignee,
                    department: dept || "PROJECT_MANAGEMENT",
                    priority,
                    dueDate: date ? date.toISOString() : null
                }
            }
        });
    };

    const selectedUser = availableUsers.find((m: any) => m.id === assignee);

    return (
        <Card className={cn("border shadow-sm transition-all overflow-hidden relative group bg-background", isExpanded ? "ring-2 ring-primary/20 border-primary" : "hover:border-primary/50")}>
            <CardContent className="p-0">
                <div className="p-4 flex gap-4 items-center">
                    <div className={cn("w-3 h-3 rounded-full mt-1 shrink-0 transition-colors", desc ? "bg-primary" : "bg-muted-foreground/30")} />
                    <Input
                        placeholder="Créer une nouvelle tâche..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1 font-medium text-base placeholder:text-muted-foreground/50"
                    />
                </div>

                {isExpanded && (
                    <div className="bg-muted/30 dark:bg-muted/10 border-t p-3 flex flex-wrap gap-3 items-center justify-between animate-in slide-in-from-top-1">
                        <div className="flex flex-wrap gap-2">
                            <Select value={assignee} onValueChange={setAssignee}>
                                <SelectTrigger className="h-8 text-xs w-[180px] bg-background border-dashed shadow-sm">
                                    <div className="flex items-center gap-2 truncate">
                                        {selectedUser ? (
                                            <>
                                                <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary text-primary-foreground">{selectedUser.name.substring(0, 2)}</AvatarFallback></Avatar>
                                                <span className="truncate">{selectedUser.name}</span>
                                            </>
                                        ) : <span className="text-muted-foreground">Assigner à...</span>}
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {availableUsers.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id} className="text-xs">{m.name} <span className="text-muted-foreground ml-1">({m.role})</span></SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={dept} onValueChange={setDept}>
                                <SelectTrigger className="h-8 text-xs w-[140px] bg-background border-dashed shadow-sm"><SelectValue placeholder="Département" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CREATIVE" className="text-xs">🎨 Création</SelectItem>
                                    <SelectItem value="TECHNICAL_OFFICE" className="text-xs">🧊 3D / Bureau Tech</SelectItem>
                                    <SelectItem value="PROJECT_MANAGEMENT" className="text-xs">👔 Gestion</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className={cn("h-8 text-xs w-[100px] bg-background border-dashed shadow-sm", priority === 'HIGH' && "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW" className="text-xs">Basse</SelectItem>
                                    <SelectItem value="NORMAL" className="text-xs">Normale</SelectItem>
                                    <SelectItem value="HIGH" className="text-xs font-semibold text-red-600">Urgente</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button variant="outline" size="sm" className={cn("h-8 border-dashed text-xs shadow-sm bg-background", !date && "text-muted-foreground")}>
                                <Input
                                    type="date"
                                    value={date ? format(date, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : undefined)}
                                    className="background-transparent border-0 p-0 text-xs h-6 focus-visible:ring-0 dark:text-foreground"
                                />
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsExpanded(false)}>Annuler</Button>
                            <Button onClick={handleSubmit} disabled={loading} size="sm" className="h-8 text-xs">{loading ? "..." : "Créer"}</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ------------------------------------------------------------------
// COMPONENT 2: ASSETS MANAGER
// ------------------------------------------------------------------
function AssetsManager({ projectId, files, onUploadSuccess }: any) {
    const [file, setFile] = useState<File | null>(null);
    const [uploadAsset, { loading }] = useMutation(UPLOAD_ASSET_MUTATION, {
        onCompleted: () => { toast.success("Fichier uploadé"); setFile(null); onUploadSuccess(); },
        onError: (e) => toast.error(e.message)
    });

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            toast.loading("Upload en cours...");
            const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
                ? 'https://backoffice.urbagroupe.ma'
                : 'http://localhost:5002';
            const res = await fetch(`${baseUrl}/api/upload/${projectId}`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Erreur serveur upload");
            const json = await res.json();
            toast.dismiss();
            uploadAsset({ variables: { projectId, fileUrl: json.fileUrl, originalFileName: file.name } });
        } catch (err: any) {
            toast.dismiss(); toast.error(err.message);
        }
    };

    const getFileUrl = (path: string) => {
        const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? 'https://backoffice.urbagroupe.ma' : 'http://localhost:5002';
        return path.startsWith('http') ? path : `${baseUrl}/${path.startsWith('/') ? path.slice(1) : path}`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-dashed border-2 bg-muted/10 dark:bg-muted/5 flex flex-col items-center justify-center p-8 text-center space-y-4 hover:bg-muted/20 transition-colors">
                <div className="p-3 bg-background rounded-full shadow-sm"><IconCloudUpload className="w-6 h-6 text-primary" /></div>
                <div><h3 className="font-semibold">Zone de Dépôt</h3><p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 50MB)</p></div>
                <div className="w-full max-w-xs relative space-y-2">
                    {!file ? (
                        <div className="relative group cursor-pointer w-full">
                            <Input type="file" className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                            <Button variant="outline" className="w-full text-xs bg-background">Sélectionner un fichier</Button>
                        </div>
                    ) : (
                        <div className="bg-background border rounded-md p-2 flex items-center gap-2 shadow-sm animate-in fade-in zoom-in">
                            <IconFile className="w-4 h-4 text-primary" />
                            <span className="text-xs flex-1 truncate">{file.name}</span>
                            <IconX className="w-4 h-4 cursor-pointer text-muted-foreground hover:text-red-500" onClick={() => setFile(null)} />
                        </div>
                    )}
                    {file && <Button onClick={handleUpload} disabled={loading} size="sm" className="w-full text-xs">{loading ? "Envoi..." : "Uploader"}</Button>}
                </div>
            </Card>
            <Card className="lg:col-span-2 shadow-sm">
                <CardHeader className="py-4 border-b bg-muted/5 dark:bg-muted/10"><CardTitle className="text-sm font-semibold flex items-center gap-2"><IconFiles className="w-4 h-4" /> Assets & Fichiers ({files.length})</CardTitle></CardHeader>
                <ScrollArea className="h-[400px]"><div className="p-2 space-y-2">
                    {files.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors bg-card group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-9 w-9 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex items-center justify-center border border-blue-100 dark:border-blue-800 font-bold text-[10px] uppercase shrink-0">{doc.originalFileName?.split('.').pop() || 'DOC'}</div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate text-foreground">{doc.originalFileName}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                        <span>{formatDate(doc.createdAt)}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><IconUserCircle className="w-3 h-3" /> {doc.uploadedBy?.name || 'Inconnu'}</span>
                                    </div>
                                </div>
                            </div>
                            <a href={getFileUrl(doc.fileUrl)} target="_blank"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary"><IconDownload className="w-4 h-4" /></Button></a>
                        </div>
                    ))}
                    {files.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40 text-xs italic gap-2">
                            <IconFiles className="w-10 h-10 opacity-20" />
                            <span>Aucun asset pour le moment</span>
                        </div>
                    )}
                </div></ScrollArea>
            </Card>
        </div>
    );
}

// ------------------------------------------------------------------
// COMPONENT 3: TEAM MANAGER
// ------------------------------------------------------------------
function TeamManager({ projectId, currentTeam, allUsers, tasks, onUpdate, isReadOnly }: any) {
    const [teamData, setTeamData] = useState({
        infographisteIds: currentTeam?.infographistes?.map((u: any) => u.id) || [],
        team3DIds: currentTeam?.team3D?.map((u: any) => u.id) || [],
        coordinatorIds: currentTeam?.coordinators?.map((u: any) => u.id) || [],
        pmJuniorIds: currentTeam?.pmJuniors?.map((u: any) => u.id) || [],
    });

    const lockedUserIds = useMemo(() => {
        const ids = new Set<string>();
        tasks?.forEach((task: any) => task.assignedTo?.id && ids.add(task.assignedTo.id));
        return ids;
    }, [tasks]);

    const [assignTeam, { loading }] = useMutation(ASSIGN_TEAM_MUTATION, {
        onCompleted: () => { toast.success("Équipe mise à jour"); onUpdate(); },
        onError: (e) => toast.error(e.message)
    });

    const handleTeamChange = (key: string, id: string, checked: boolean) => {
        if (!checked && lockedUserIds.has(id)) {
            toast.error("Action impossible", { description: "Cet utilisateur a des tâches actives.", icon: <IconLock className="w-5 h-5 text-red-500" /> });
            return;
        }
        setTeamData((prev: any) => ({ ...prev, [key]: checked ? [...prev[key], id] : prev[key].filter((x: string) => x !== id) }));
    };

    // ✅ MODE LECTURE SEULE (Pour les users li ma 3ndhomch droit)
    if (isReadOnly) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-1 border-b pb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <IconUsers className="w-5 h-5 text-primary" /> Équipe du Projet
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Vous visualisez l'équipe actuelle. Seuls les administrateurs peuvent modifier l'assignation.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ReadOnlyTeamColumn title="Création" users={currentTeam?.infographistes} />
                    <ReadOnlyTeamColumn title="3D / Archi" users={currentTeam?.team3D} />
                    <ReadOnlyTeamColumn title="Coordination" users={currentTeam?.coordinators} />
                </div>
            </div>
        );
    }
}

function TeamCard({ title, role, users, selected, locks, onChange }: any) {
    return (
        <Card className="h-[450px] flex flex-col shadow-sm">
            <CardHeader className="py-3 bg-muted/20 dark:bg-muted/10 border-b shrink-0"><CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-wider">{title}</CardTitle></CardHeader>
            <ScrollArea className="flex-1 p-2"><div className="space-y-1">
                {users?.map((u: any) => {
                    const isSel = selected.includes(u.id);
                    const isLock = isSel && locks.has(u.id);
                    return (
                        <div key={u.id} onClick={() => onChange(role, u.id, !isSel)} className={cn("flex items-center gap-3 p-2 rounded-md border cursor-pointer text-sm transition-all select-none relative", isSel ? "bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/50" : "hover:bg-muted border-transparent", isLock && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 cursor-not-allowed hover:bg-amber-100")}>
                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", isSel ? "bg-primary border-primary text-white" : "bg-background", isLock && "bg-amber-400 border-amber-400 text-white")}>
                                {isLock ? <IconLock className="w-2.5 h-2.5" /> : isSel && <IconCheck className="w-3 h-3" />}
                            </div>
                            <Avatar className="w-7 h-7 border"><AvatarFallback className="text-[9px]">{u.name.substring(0, 2)}</AvatarFallback></Avatar>
                            <div className="flex flex-col min-w-0">
                                <span className={cn("truncate font-medium", isSel && "text-primary")}>{u.name}</span>
                                {isLock && <span className="text-[9px] text-amber-600 dark:text-amber-500">Actif sur tâches</span>}
                            </div>
                        </div>
                    );
                })}
            </div></ScrollArea>
        </Card>
    );
}

// ------------------------------------------------------------------
// COMPONENT 4: KANBAN BOARD
// ------------------------------------------------------------------
function TaskBoard({ tasks }: { tasks: any[] }) {
    const columns = {
        TODO: { title: "À Faire", color: "bg-slate-500", items: tasks.filter(t => t.status === 'TODO') },
        IN_PROGRESS: { title: "En Cours", color: "bg-blue-500", items: tasks.filter(t => t.status === 'IN_PROGRESS') },
        DONE: { title: "Terminé", color: "bg-green-500", items: tasks.filter(t => t.status === 'DONE') },
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
            {Object.entries(columns).map(([key, col]) => (
                <div key={key} className="flex flex-col h-full rounded-xl bg-muted/30 dark:bg-muted/10 border shadow-sm">
                    <div className="p-3 border-b bg-background/50 flex items-center justify-between sticky top-0 backdrop-blur-sm z-10 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${col.color}`} />
                            <span className="text-sm font-bold text-foreground">{col.title}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{col.items.length}</Badge>
                    </div>
                    <ScrollArea className="flex-1 p-3 bg-muted/10 dark:bg-muted/5">
                        <div className="space-y-3 pb-4">
                            {col.items.map((task: any) => <TaskCard key={task.id} task={task} />)}
                            {col.items.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 text-xs italic gap-2">
                                    <IconChecklist className="w-8 h-8 opacity-20" />
                                    <span>Aucune tâche</span>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            ))}
        </div>
    );
}

// ------------------------------------------------------------------
// COMPONENT 5: READ ONLY TEAM COLUMN (Zid hadi f l-kher)
// ------------------------------------------------------------------
function ReadOnlyTeamColumn({ title, users }: any) {
    return (
        <Card className="h-full shadow-sm bg-muted/10 border-dashed">
            <CardHeader className="py-3 border-b">
                <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                {users && users.length > 0 ? (
                    <div className="space-y-2">
                        {users.map((u: any) => (
                            <div key={u.id} className="flex items-center gap-3 p-2 rounded-md bg-background border">
                                <Avatar className="w-8 h-8 border">
                                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                        {u.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{u.name}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground italic py-4 text-center">
                        Aucun membre assigné
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function TaskCard({ task }: { task: any }) {
    // 1. Config Priority Colors (Border à gauche)
    const priorityConfig = {
        HIGH: { color: "bg-red-500", shadow: "shadow-red-500/20" },
        NORMAL: { color: "bg-blue-500", shadow: "shadow-blue-500/20" },
        LOW: { color: "bg-slate-400", shadow: "shadow-slate-500/20" },
    };
    // @ts-ignore
    const pStyle = priorityConfig[task.priority] || priorityConfig.NORMAL;

    // 2. Date Logic (Avec gestion sécurisée)
    const dateStyles = getDueDateStyles(task.dueDate, task.status);

    // 3. Department Label Formatting
    const getDeptLabel = (dept: string) => {
        const map: any = {
            'TECHNICAL_OFFICE': 'Bureau Tech',
            'CREATIVE': 'Création',
            'PROJECT_MANAGEMENT': 'Gestion',
            '3D_ARTIST': '3D'
        };
        return map[dept] || dept;
    };

    return (
        <div className="group relative bg-card hover:bg-card/80 transition-all duration-200 rounded-xl border shadow-sm hover:shadow-md overflow-hidden flex flex-col gap-3 p-4">

            {/* --- Priority Indicator Strip (Left Side) --- */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", pStyle.color)} />

            {/* --- HEADER: Dept & Priority Icon --- */}
            <div className="flex justify-between items-start">
                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground/80 tracking-wider h-5 px-1.5 bg-muted/20 dark:bg-muted/10 border-muted">
                    {getDeptLabel(task.department)}
                </Badge>

                {task.priority === 'HIGH' && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full animate-pulse">
                        <IconFlag className="w-3 h-3 fill-current" />
                        <span>URGENT</span>
                    </div>
                )}
            </div>

            {/* --- BODY: Description --- */}
            <div className="flex-1">
                <p className="text-sm font-medium text-foreground leading-relaxed line-clamp-3 group-hover:text-primary transition-colors">
                    {task.description}
                </p>
            </div>

            {/* --- FOOTER: Date & Avatar --- */}
            <div className="flex items-center justify-between pt-2 border-t mt-1">

                {/* Due Date Display */}
                {task.dueDate ? (
                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors",
                        dateStyles.bg, dateStyles.color, dateStyles.border
                    )}>
                        <IconCalendar className="w-3.5 h-3.5" />
                        <span>{dateStyles.label}</span>
                    </div>
                ) : (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <IconClock className="w-3 h-3" /> <span>Sans date</span>
                    </div>
                )}

                {/* Avatar */}
                {task.assignedTo ? (
                    <div className="flex items-center gap-2 pl-2">
                        <Avatar className="w-7 h-7 border-2 border-background shadow-sm ring-1 ring-muted">
                            <AvatarFallback className={cn("text-[9px] font-bold",
                                task.department === 'CREATIVE' ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" :
                                    task.department === 'TECHNICAL_OFFICE' ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            )}>
                                {task.assignedTo.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                ) : (
                    <div className="w-7 h-7 rounded-full bg-muted border border-dashed flex items-center justify-center">
                        <IconUserCircle className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                )}
            </div>
        </div>
    );
}