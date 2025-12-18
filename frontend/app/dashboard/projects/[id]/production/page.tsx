"use client";

import React, { useState, use } from "react";
import { useRouter } from "next/navigation";
import { gql, useQuery, useMutation } from "@apollo/client";
import {
    IconLayoutKanban, IconUsers, IconFiles,
    IconPlus, IconClock, IconAlertTriangle, IconLoader,
    IconBriefcase, IconChecklist, IconCloudUpload,
    IconFile, IconDownload, IconX, IconFlag,
    IconCalendar, IconAlertCircle, IconArrowRight,
    IconCheck, IconUserCircle
} from "@tabler/icons-react";
import { toast } from "sonner";
import { format, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
      team {
        infographistes { id name }
        team3D { id name }
        coordinators { id name }
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
    allCoordinators: users(role: "ASSISTANT_PM") { id name } 
  }
`;

const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($input: PMCreateTaskInput!) {
    pm_createTask(input: $input) { 
        id 
        description 
        status 
        # ✅ Return new fields to update UI immediately
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
    cp_uploadAsset(projectId: $projectId, fileUrl: $fileUrl, originalFileName: $originalFileName) { id } 
  }
`;

// --- HELPER FUNCTIONS ---
const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return format(date, "d MMM", { locale: fr });
};

const files = project.stages?.technical?.documents || [];

// --- MAIN PAGE COMPONENT ---
export default function ProductionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = use(params);
    const router = useRouter();

    const { data, loading, error, refetch } = useQuery(GET_PROJECT_FULL_DETAILS, {
        variables: { projectId },
        fetchPolicy: "network-only"
    });

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

    const currentTeamMembers = [
        ...(project.team?.infographistes || []).map((u: any) => ({ ...u, role: 'Infographiste' })),
        ...(project.team?.team3D || []).map((u: any) => ({ ...u, role: '3D Artist' })),
        ...(project.team?.coordinators || []).map((u: any) => ({ ...u, role: 'Coordinateur' }))
    ];

    const allAvailableUsers = [
        ...(data.allInfographistes || []).map((u: any) => ({ ...u, role: 'Infographiste' })),
        ...(data.allTeam3D || []).map((u: any) => ({ ...u, role: '3D Artist' })),
        ...(data.allCoordinators || []).map((u: any) => ({ ...u, role: 'Coordinateur' }))
    ];

    const totalTasks = tasksByProject.length;
    const completedTasks = tasksByProject.filter((t: any) => t.status === 'DONE').length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" />
            <SidebarInset className="overflow-x-hidden">
                <SiteHeader />
                <div className="min-h-screen bg-muted/5 flex flex-col">

                    {/* --- HEADER SECTION --- */}
                    <div className="bg-background border-b px-4 sm:px-6 py-5 sticky top-0 z-20 shadow-sm transition-all">
                        <div className="max-w-[1800px] mx-auto space-y-4">
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <SidebarTrigger className="md:hidden mr-2 -ml-2" />
                                <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => router.push('/dashboard/projects')}>Projets</span>
                                <span className="opacity-50">/</span>
                                <span className="font-medium text-foreground truncate max-w-[100px] sm:max-w-none">{project.projectCode}</span>
                                <span className="opacity-50 hidden sm:inline">/</span>
                                <span className="text-primary font-semibold flex items-center gap-1 hidden sm:flex">
                                    <IconLayoutKanban className="w-3 h-3" /> Production
                                </span>
                            </div>

                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground line-clamp-1">
                                            {project.title}
                                        </h1>
                                        <Badge variant="outline" className="font-mono text-[10px] sm:text-xs border-primary/20 text-primary bg-primary/5 shrink-0">
                                            {project.projectCode}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                                        <IconBriefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70 shrink-0" />
                                        <span className="line-clamp-1">{project.object}</span>
                                    </div>
                                </div>

                                {/* Right Side: Team & Progress */}
                                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 lg:pt-0 border-t lg:border-t-0 mt-2 lg:mt-0">
                                    <div className="flex items-center -space-x-2">
                                        {currentTeamMembers.slice(0, 5).map((u: any, i: number) => (
                                            <Avatar key={i} className="border-2 border-background w-7 h-7 sm:w-8 sm:h-8 cursor-help hover:z-10 transition-transform hover:scale-105" title={`${u.name} - ${u.role}`}>
                                                <AvatarFallback className="bg-primary/10 text-primary text-[9px] sm:text-[10px] font-bold">
                                                    {u.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                        {currentTeamMembers.length > 5 && (
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] sm:text-[10px] font-bold z-0">
                                                +{currentTeamMembers.length - 5}
                                            </div>
                                        )}
                                        {currentTeamMembers.length === 0 && (
                                            <span className="text-xs text-muted-foreground italic">Aucune équipe</span>
                                        )}
                                    </div>

                                    <Separator orientation="vertical" className="h-8 hidden sm:block" />

                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="text-right shrink-0 hidden sm:block">
                                            <span className="text-xs text-muted-foreground block mb-1">Avancement</span>
                                            <span className="text-xs font-bold">{progress}%</span>
                                        </div>
                                        <div className="flex-1 sm:w-32">
                                            <div className="flex justify-between sm:hidden text-xs mb-1">
                                                <span className="text-muted-foreground">Progression</span>
                                                <span className="font-bold">{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-2" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- MAIN CONTENT AREA --- */}
                    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1800px] mx-auto w-full">
                        <Tabs defaultValue="tasks" className="flex flex-col h-full space-y-6">

                            <div className="w-full overflow-x-auto pb-1 -mb-1 hide-scrollbar">
                                <TabsList className="bg-background border h-10 p-1 shadow-sm w-full sm:w-auto justify-start inline-flex">
                                    <TabsTrigger value="tasks" className="gap-2 px-4 flex-1 sm:flex-none"><IconLayoutKanban className="w-4 h-4" /> <span className="hidden xs:inline">Tâches</span></TabsTrigger>
                                    <TabsTrigger value="assets" className="gap-2 px-4 flex-1 sm:flex-none"><IconFiles className="w-4 h-4" /> <span className="hidden xs:inline">Fichiers</span></TabsTrigger>
                                    <TabsTrigger value="team" className="gap-2 px-4 flex-1 sm:flex-none"><IconUsers className="w-4 h-4" /> <span className="hidden xs:inline">Équipe</span></TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="tasks" className="mt-0 h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="max-w-4xl mx-auto w-full">
                                    <InlineTaskCreator
                                        projectId={projectId}
                                        availableUsers={allAvailableUsers}
                                        onTaskCreated={refetch}
                                    />
                                </div>
                                <TaskBoard tasks={tasksByProject} onUpdate={refetch} />
                            </TabsContent>

                            <TabsContent value="assets" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <AssetsManager
                                    projectId={projectId}
                                    files={project.uploads || []} // 👈 On passe les fichiers ici
                                    onUploadSuccess={refetch}     // 👈 On passe la fonction pour recharger
                                />
                            </TabsContent>

                            <TabsContent value="team" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <TeamManager
                                    projectId={projectId}
                                    currentTeam={project.team}
                                    allUsers={{
                                        infographistes: data.allInfographistes,
                                        team3D: data.allTeam3D,
                                        coordinators: data.allCoordinators
                                    }}
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
// COMPONENT 1: INLINE TASK CREATOR (Fixed for Backend)
// ------------------------------------------------------------------
function InlineTaskCreator({ projectId, availableUsers, onTaskCreated }: any) {
    const [desc, setDesc] = useState("");
    const [assignee, setAssignee] = useState("");
    const [dept, setDept] = useState("");
    const [priority, setPriority] = useState("NORMAL"); // Default normal
    const [date, setDate] = useState<Date | undefined>(undefined);

    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const [createTask, { loading }] = useMutation(CREATE_TASK_MUTATION, {
        onCompleted: () => {
            toast.success("Tâche créée avec succès");
            setDesc("");
            setAssignee("");
            setDept("");
            setPriority("NORMAL");
            setDate(undefined);
            setError(null);
            setIsExpanded(false);
            onTaskCreated();
        },
        onError: (e) => {
            setError(e.message);
            toast.error("Erreur lors de la création");
        }
    });

    const handleSubmit = () => {
        if (!desc.trim()) {
            setError("La description de la tâche est requise.");
            return;
        }
        if (!assignee) {
            setError("Veuillez assigner cette tâche à un membre.");
            return;
        }
        setError(null);

        // ✅ FIXED: Now sending Priority and DueDate correctly
        createTask({
            variables: {
                input: {
                    projectId,
                    description: desc,
                    assignedToId: assignee,
                    department: dept || "PROJECT_MANAGEMENT",
                    priority: priority,
                    dueDate: date ? date.toISOString() : null
                }
            }
        });
    };

    const selectedUser = availableUsers.find((m: any) => m.id === assignee);

    // Helper for visual feedback
    const getPriorityColor = (p: string) => {
        if (p === 'HIGH') return "text-red-600 bg-red-50 border-red-200";
        if (p === 'MEDIUM') return "text-orange-600 bg-orange-50 border-orange-200";
        return "text-muted-foreground border-dashed";
    };

    return (
        <Card className={cn(
            "border shadow-sm transition-all duration-300 overflow-hidden group relative z-10",
            isExpanded ? "ring-2 ring-primary/20 border-primary/50 shadow-md" : "hover:border-primary/30"
        )}>
            {loading && <div className="h-1 w-full bg-primary/20 overflow-hidden absolute top-0 left-0 right-0 z-20"><div className="h-full bg-primary animate-progress-indeterminate" /></div>}

            <CardContent className="p-0">
                <div className="p-3 sm:p-4">
                    <div className="flex gap-3">
                        <div className="mt-2.5 shrink-0">
                            <div className={cn("w-4 h-4 rounded-full border-2 transition-colors", desc ? "border-primary bg-primary/20" : "border-muted-foreground/30")} />
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                            <Input
                                placeholder="Ajouter une nouvelle tâche..."
                                value={desc}
                                onChange={(e) => {
                                    setDesc(e.target.value);
                                    if (error) setError(null);
                                    if (!isExpanded) setIsExpanded(true);
                                }}
                                onFocus={() => setIsExpanded(true)}
                                className="border-0 shadow-none focus-visible:ring-0 px-0 text-sm sm:text-base font-medium placeholder:text-muted-foreground/50 h-auto py-2 bg-transparent"
                            />
                            {error && (
                                <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 p-2 rounded-md animate-in slide-in-from-top-1 fade-in">
                                    <IconAlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div className="bg-muted/30 border-t p-3 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">

                            {/* Assignee */}
                            <Select value={assignee} onValueChange={(val) => { setAssignee(val); if (error) setError(null); }}>
                                <SelectTrigger className={cn("h-9 sm:h-8 text-xs border-dashed bg-background hover:bg-muted/50 transition-colors w-full sm:w-[180px]", !assignee && "text-muted-foreground")}>
                                    <div className="flex items-center gap-2 truncate">
                                        {selectedUser ? (
                                            <>
                                                <Avatar className="h-5 w-5">
                                                    <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{selectedUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="truncate">{selectedUser.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                <IconUserCircle className="w-3.5 h-3.5" />
                                                <span>Assigner</span>
                                            </>
                                        )}
                                    </div>
                                </SelectTrigger>
                                <SelectContent align="start" className="w-[240px]">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Membres disponibles</div>
                                    {availableUsers.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id} className="text-xs cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 border">
                                                    <AvatarFallback className="text-[9px]">{m.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col text-left">
                                                    <span className="font-medium">{m.name}</span>
                                                    <span className="text-[9px] text-muted-foreground">{m.role}</span>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Department */}
                            <Select value={dept} onValueChange={setDept}>
                                <SelectTrigger className={cn("h-9 sm:h-8 text-xs border-dashed bg-background w-full sm:w-[140px]", !dept && "text-muted-foreground")}>
                                    <SelectValue placeholder="Département" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CREATIVE" className="text-xs"><span className="flex items-center gap-2">🎨 Création</span></SelectItem>
                                    <SelectItem value="3D_ARTIST" className="text-xs"><span className="flex items-center gap-2">🧊 3D / Archi</span></SelectItem>
                                    <SelectItem value="PROJECT_MANAGEMENT" className="text-xs"><span className="flex items-center gap-2">👔 Gestion</span></SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {/* Priority */}
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className={cn("h-9 sm:h-8 w-full sm:w-[110px] text-xs", getPriorityColor(priority))}>
                                        <div className="flex items-center gap-2">
                                            <IconFlag className={cn("w-3.5 h-3.5", priority === 'HIGH' && "fill-current")} />
                                            <span>{priority === 'HIGH' ? 'Urgent' : priority === 'MEDIUM' ? 'Moyen' : 'Normal'}</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW" className="text-xs">Normal</SelectItem>
                                        <SelectItem value="MEDIUM" className="text-xs text-orange-600">Moyen</SelectItem>
                                        <SelectItem value="HIGH" className="text-xs text-red-600 font-medium">Urgent 🔥</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Date */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("h-9 sm:h-8 border-dashed text-xs font-normal w-full sm:w-auto", !date && "text-muted-foreground")}>
                                            <IconCalendar className="mr-2 h-3.5 w-3.5" />
                                            {date ? format(date, "d MMM", { locale: fr }) : "Échéance"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0 pt-2 lg:pt-0 border-t lg:border-t-0">
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground flex-1 lg:flex-none" onClick={() => setIsExpanded(false)}>
                                Annuler
                            </Button>
                            <Button onClick={handleSubmit} disabled={loading} size="sm" className="h-8 text-xs font-medium px-4 min-w-[100px] flex-1 lg:flex-none">
                                {loading ? "..." : <><IconArrowRight className="w-3.5 h-3.5 mr-1.5 opacity-70" /> Créer</>}
                            </Button>
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
// Remplace tout le composant AssetsManager par celui-ci :

function AssetsManager({ projectId, files, onUploadSuccess }: any) {
    const [file, setFile] = useState<File | null>(null);

    // Mutation GraphQL
    const [uploadAsset, { loading }] = useMutation(UPLOAD_ASSET_MUTATION, {
        onCompleted: () => {
            toast.success("Fichier uploadé avec succès !");
            setFile(null); // Reset l'input
            onUploadSuccess(); // 👈 LE FIX EST ICI : On force le rafraîchissement immédiat
        },
        onError: (e) => toast.error(e.message)
    });

    // Gestion de l'upload vers le serveur de fichiers puis GraphQL
    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);

        try {
            toast.loading("Upload du fichier en cours...");
            // Adapte l'URL selon ton environnement (Local vs Prod)
            const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
                ? 'https://backoffice.urbagroupe.ma'
                : 'http://localhost:5002';

            const res = await fetch(`${baseUrl}/api/upload/${projectId}`, { method: 'POST', body: formData });

            if (!res.ok) throw new Error("Erreur serveur lors de l'upload");

            const json = await res.json();
            toast.dismiss();

            // Appel de la mutation GraphQL
            uploadAsset({
                variables: {
                    projectId,
                    fileUrl: json.fileUrl,
                    originalFileName: file.name
                }
            });
        } catch (err: any) {
            toast.dismiss();
            toast.error(err.message);
        }
    };

    const getFileUrl = (path: string) => {
        const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
            ? 'https://backoffice.urbagroupe.ma'
            : 'http://localhost:5002';
        return path.startsWith('http') ? path : `${baseUrl}/${path.startsWith('/') ? path.slice(1) : path}`;
    };

    const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(2) : "0.00";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[600px]">
            {/* GAUCHE: ZONE D'UPLOAD */}
            <Card className="lg:col-span-1 border-dashed border-2 bg-muted/10 flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-4 hover:bg-muted/20 transition-colors h-[300px] lg:h-auto">
                <div className="p-4 bg-background rounded-full shadow-sm animate-in zoom-in duration-300">
                    <IconCloudUpload className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">Zone de Dépôt</h3>
                    <p className="text-sm text-muted-foreground mt-1 px-4">Formats supportés: PDF, JPG, PNG, ZIP. Max 50MB.</p>
                </div>

                <div className="w-full max-w-xs relative space-y-4">
                    {!file ? (
                        <div className="relative group cursor-pointer w-full">
                            <Input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <Button variant="outline" className="w-full">Sélectionner un fichier</Button>
                        </div>
                    ) : (
                        <div className="bg-background border rounded-lg p-3 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-2 bg-primary/10 rounded shrink-0"><IconFile className="w-5 h-5 text-primary" /></div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium truncate max-w-[150px]">{file.name}</p>
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-0.5">{fileSizeMB} MB</Badge>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => setFile(null)}>
                                <IconX className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {file && (
                        <Button onClick={handleUpload} disabled={loading} className="w-full">
                            {loading ? <IconLoader className="mr-2 h-4 w-4 animate-spin" /> : <IconCloudUpload className="mr-2 h-4 w-4" />}
                            {loading ? "Envoi..." : "Uploader"}
                        </Button>
                    )}
                </div>
            </Card>

            {/* DROITE: LISTE DES FICHIERS */}
            <Card className="lg:col-span-2 flex flex-col h-[400px] lg:h-auto">
                <CardHeader className="border-b bg-muted/5 py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <IconFiles className="w-4 h-4" /> Fichiers du projet <Badge variant="secondary">{files.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                        {files.length > 0 ? (
                            files.map((doc: any) => (
                                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded flex items-center justify-center shrink-0 border border-blue-100">
                                            <span className="text-xs font-bold uppercase">{doc.originalFileName?.split('.').pop() || 'FILE'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{doc.originalFileName}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                                <span>{formatDate(doc.createdAt)}</span>
                                                <span className="hidden sm:inline">•</span>
                                                <span className="flex items-center gap-1">
                                                    <IconUserCircle className="w-3 h-3" />
                                                    {doc.uploadedBy?.name || 'Utilisateur'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <a href={getFileUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer">
                                        <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary transition-colors">
                                            <IconDownload className="w-4 h-4" />
                                        </Button>
                                    </a>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 text-sm italic">
                                <IconFiles className="w-12 h-12 mb-3 opacity-20" />
                                <p>Aucun fichier n'a été uploadé pour le moment.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </Card>
        </div>
    );
}

// ------------------------------------------------------------------
// COMPONENT 3: TEAM MANAGER
// ------------------------------------------------------------------
function TeamManager({ projectId, currentTeam, allUsers, onUpdate }: any) {
    const [teamData, setTeamData] = useState({
        infographisteIds: currentTeam?.infographistes?.map((u: any) => u.id) || [],
        team3DIds: currentTeam?.team3D?.map((u: any) => u.id) || [],
        coordinatorIds: currentTeam?.coordinators?.map((u: any) => u.id) || [],
    });

    const [assignTeam, { loading }] = useMutation(ASSIGN_TEAM_MUTATION, {
        onCompleted: () => { toast.success("Équipe mise à jour !"); onUpdate(); },
        onError: (e) => toast.error(e.message)
    });

    const handleTeamChange = (key: string, id: string, checked: boolean) => {
        setTeamData((prev: any) => ({
            ...prev,
            [key]: checked ? [...prev[key], id] : prev[key].filter((x: string) => x !== id)
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/20 p-4 rounded-lg border gap-4">
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><IconUsers className="w-5 h-5" /> Composition de l'équipe</h3>
                    <p className="text-sm text-muted-foreground">Gérez les accès et les assignations pour ce projet.</p>
                </div>
                <Button onClick={() => assignTeam({ variables: { input: { projectId, ...teamData } } })} disabled={loading} className="w-full sm:w-auto">
                    {loading ? <IconLoader className="animate-spin mr-2" /> : <IconChecklist className="mr-2 w-4 h-4" />}
                    Sauvegarder
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <TeamSelectionCard title="Création & Design" role="infographisteIds" icon={<IconBriefcase className="w-4 h-4" />} allUsers={allUsers.infographistes} selectedIds={teamData.infographisteIds} onChange={handleTeamChange} />
                <TeamSelectionCard title="3D & Architecture" role="team3DIds" icon={<IconLayoutKanban className="w-4 h-4" />} allUsers={allUsers.team3D} selectedIds={teamData.team3DIds} onChange={handleTeamChange} />
                <TeamSelectionCard title="Coordination" role="coordinatorIds" icon={<IconUsers className="w-4 h-4" />} allUsers={allUsers.coordinators} selectedIds={teamData.coordinatorIds} onChange={handleTeamChange} />
            </div>
        </div>
    );
}

function TeamSelectionCard({ title, role, icon, allUsers, selectedIds, onChange }: any) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="py-4 border-b bg-muted/10 shrink-0">
                <CardTitle className="text-sm font-semibold uppercase flex items-center gap-2 text-muted-foreground">{icon} {title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1">
                <ScrollArea className="h-[300px] sm:h-[400px] pr-4">
                    <div className="space-y-2">
                        {allUsers?.map((user: any) => {
                            const isSelected = selectedIds.includes(user.id);
                            return (
                                <div key={user.id} onClick={() => onChange(role, user.id, !isSelected)} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm select-none", isSelected ? "bg-primary/5 border-primary/50 shadow-sm" : "bg-background border-border hover:bg-muted/40")}>
                                    <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0", isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-background")}>{isSelected && <IconCheck className="w-3 h-3 text-white" />}</div>
                                    <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px] font-bold">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <span className={cn("text-sm font-medium leading-none truncate", isSelected && "text-primary")}>{user.name}</span>
                                        {isSelected && <span className="text-[10px] text-primary/70 mt-1">Assigné</span>}
                                    </div>
                                </div>
                            )
                        })}
                        {(!allUsers || allUsers.length === 0) && <p className="text-xs text-muted-foreground italic text-center py-10 opacity-50">Aucun utilisateur disponible.</p>}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

// ------------------------------------------------------------------
// COMPONENT 4: KANBAN BOARD (Updated with Pro Cards)
// ------------------------------------------------------------------
function TaskBoard({ tasks, onUpdate }: { tasks: any[], onUpdate: () => void }) {
    const columns = {
        TODO: tasks.filter(t => t.status !== 'IN_PROGRESS' && t.status !== 'DONE'),
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
        DONE: tasks.filter(t => t.status === 'DONE'),
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-full md:min-h-[500px]">
            <TaskColumn title="À Faire" tasks={columns.TODO} statusColor="bg-slate-500" emptyText="Rien à faire." />
            <TaskColumn title="En Cours" tasks={columns.IN_PROGRESS} statusColor="bg-blue-500" emptyText="Aucune tâche en cours." />
            <TaskColumn title="Terminé" tasks={columns.DONE} statusColor="bg-green-500" emptyText="Rien de terminé." />
        </div>
    );
}

function TaskColumn({ title, tasks, statusColor, emptyText }: any) {
    return (
        <div className="flex flex-col h-[500px] md:h-full rounded-xl bg-muted/40 border border-muted-foreground/10 overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-background/50 backdrop-blur-sm border-b shrink-0">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                    <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                    <Badge variant="outline" className="ml-2 text-[10px] h-5 px-1.5 border-muted-foreground/20 text-muted-foreground">{tasks.length}</Badge>
                </div>
            </div>
            <ScrollArea className="flex-1 p-3">
                <div className="flex flex-col gap-3 pb-4">
                    {tasks.map((task: any) => <TaskCard key={task.id} task={task} />)}
                    {tasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50 text-sm italic">
                            <IconChecklist className="w-10 h-10 mb-2 opacity-20" />
                            {emptyText}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

// ✅ TASK CARD WITH NEW DETAILS
function TaskCard({ task }: { task: any }) {
    // Helper for overdue logic
    const isOverdue = task.dueDate ? isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'DONE' : false;

    return (
        <Card className={cn(
            "shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 group relative overflow-hidden",
            // Highlight High Priority items with Red Border
            task.priority === 'HIGH' ? "border-l-red-500 bg-red-50/10" : "border-l-transparent hover:border-l-primary"
        )}>
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                    <p className={cn(
                        "text-sm font-medium leading-snug line-clamp-2 transition-colors",
                        task.priority === 'HIGH' ? "text-red-950 dark:text-red-100" : "text-foreground group-hover:text-primary"
                    )}>
                        {task.description}
                    </p>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                        {/* Priority Badge */}
                        {task.priority === 'HIGH' && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[9px] uppercase tracking-wider">Urgent</Badge>
                        )}
                        {task.department && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-5 font-normal tracking-wide">
                                {task.department === 'PROJECT_MANAGEMENT' ? 'GESTION' : task.department}
                            </Badge>
                        )}
                    </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {/* Due Date Logic */}
                        {task.dueDate ? (
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-md border",
                                isOverdue
                                    ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                                    : "bg-muted/50 border-transparent"
                            )}>
                                <IconCalendar className="w-3.5 h-3.5" />
                                <span className="font-medium">{formatDate(task.dueDate)}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 opacity-70">
                                <IconClock className="w-3.5 h-3.5" />
                                <span>{formatDate(task.createdAt)}</span>
                            </div>
                        )}
                    </div>

                    {task.assignedTo && (
                        <div className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1 border border-border/50 max-w-[120px]">
                            <Avatar className="w-5 h-5 border shrink-0">
                                <AvatarFallback className="text-[8px] bg-background text-foreground font-bold">
                                    {task.assignedTo.name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] font-semibold truncate text-foreground/80">
                                {task.assignedTo.name}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}