"use client";

import { useState } from "react";
import { gql, useQuery, useMutation } from "@apollo/client";
import {
    IconUpload, IconUsers, IconChecklist, IconPlus,
    IconFile, IconX, IconBriefcase, IconDeviceDesktopAnalytics,
    IconUser, IconLayoutKanban, IconLoader
} from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelectPopover } from "@/components/ui/multi-select-popover";

// --- 1. GRAPHQL DEFINITIONS ---

const GET_DATA_QUERY = gql`
  query GetProductionData($projectId: ID!) {
    infographistes: users(role: "CREATIVE") { id name }
    team3D: users(role: "3D_ARTIST") { id name }
    coordinators: users(role: "COORDINATOR") { id name }
    pmJuniors: users(role: "PROJECT_MANAGER") { id name } 
    
    # Removed project brief fetching as it's now on a separate page

    tasksByProject(projectId: $projectId) {
      id
      description
      status
      department
      assignedTo { id name }
    }
  }
`;

const MUTATIONS = {
    ASSIGN_TEAM: gql`mutation CpAssignTeam($input: CPAssignTeamInput!) { cp_assignTeam(input: $input) { id } }`,
    UPLOAD_ASSET: gql`mutation CpUploadAsset($projectId: ID!, $fileUrl: String!, $originalFileName: String!) { cp_uploadAsset(projectId: $projectId, fileUrl: $fileUrl, originalFileName: $originalFileName) { id } }`,
    CREATE_TASK: gql`mutation PmCreateTask($input: PMCreateTaskInput!) { pm_createTask(input: $input) { id } }`
};

// --- 2. TYPES ---

interface ProductionManagerProps {
    projectId: string;
    initialTeam?: {
        infographisteIds: string[];
        team3DIds: string[];
        coordinatorIds: string[];
        pmJuniorIds: string[];
    };
    onSave?: () => void;
}

// Updated TabType: Removed "brief"
type TabType = "team" | "assets" | "tasks";

// --- 3. MAIN COMPONENT ---

export function ProductionManager({ projectId, initialTeam, onSave }: ProductionManagerProps) {
    // Default tab is now "team"
    const [activeTab, setActiveTab] = useState<TabType>("team");

    // Form States
    const [teamData, setTeamData] = useState({
        infographisteIds: initialTeam?.infographisteIds || [],
        team3DIds: initialTeam?.team3DIds || [],
        coordinatorIds: initialTeam?.coordinatorIds || [],
        pmJuniorIds: initialTeam?.pmJuniorIds || [],
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [taskForm, setTaskForm] = useState({ desc: "", assignee: "", dept: "" });

    // Apollo
    const { data, loading, refetch } = useQuery(GET_DATA_QUERY, {
        variables: { projectId },
        fetchPolicy: "network-only"
    });

    // Mutations
    const [assignTeam, { loading: loadingAssign }] = useMutation(MUTATIONS.ASSIGN_TEAM, {
        onCompleted: () => { toast.success("Équipe mise à jour"); if (onSave) onSave(); },
        onError: (e) => toast.error(e.message)
    });

    const [uploadAsset, { loading: loadingUpload }] = useMutation(MUTATIONS.UPLOAD_ASSET, {
        onCompleted: () => { toast.success("Fichier ajouté"); setSelectedFile(null); },
        onError: (e) => toast.error(e.message)
    });

    const [createTask, { loading: loadingTask }] = useMutation(MUTATIONS.CREATE_TASK, {
        onCompleted: () => { toast.success("Tâche créée"); setTaskForm({ desc: "", assignee: "", dept: "" }); refetch(); },
        onError: (e) => toast.error(e.message)
    });

    // Computed
    const allUsers = [
        ...(data?.infographistes?.map((u: any) => ({ ...u, dept: 'CREATIVE' })) || []),
        ...(data?.team3D?.map((u: any) => ({ ...u, dept: '3D_ARTIST' })) || []),
        ...(data?.coordinators?.map((u: any) => ({ ...u, dept: 'COORDINATOR' })) || []),
        ...(data?.pmJuniors?.map((u: any) => ({ ...u, dept: 'PM_JUNIOR' })) || [])
    ];

    const activeTeamMembers = allUsers.filter(u =>
        teamData.infographisteIds.includes(u.id) ||
        teamData.team3DIds.includes(u.id) ||
        teamData.coordinatorIds.includes(u.id) ||
        teamData.pmJuniorIds.includes(u.id)
    );

    // Handlers
    const handleTeamChange = (key: keyof typeof teamData, id: string, checked: boolean) => {
        setTeamData(prev => ({
            ...prev,
            [key]: checked ? [...prev[key], id] : prev[key].filter(x => x !== id)
        }));
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            toast.loading("Upload en cours...");
            // Remplace par ton URL prod
            const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
                ? 'https://backoffice.urbagroupe.ma'
                : 'http://localhost:5002';

            const res = await fetch(`${baseUrl}/api/upload/${projectId}`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Erreur réseau upload");
            const json = await res.json();

            toast.dismiss();
            await uploadAsset({ variables: { projectId, fileUrl: json.fileUrl, originalFileName: selectedFile.name } });
        } catch (err: any) {
            toast.dismiss();
            toast.error(err.message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/50 overflow-hidden">
            {/* Header */}
            <div className="flex-none pb-4 border-b space-y-4 px-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
                            <IconBriefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-foreground">Production Manager</h2>
                            <p className="text-sm text-muted-foreground">Espace de travail collaboratif</p>
                        </div>
                    </div>
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-2 px-3 py-1 bg-green-500/10 text-green-600 border-green-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live Sync
                        </Badge>
                    </div>
                </div>

                <TabNavigation
                    active={activeTab}
                    onChange={setActiveTab}
                    counts={{ tasks: data?.tasksByProject?.length || 0 }}
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-1 py-6">

                {/* --- TAB 1: TEAM --- */}
                {activeTab === "team" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TeamCard
                                title="Infographistes"
                                icon={<IconDeviceDesktopAnalytics />}
                                options={data?.infographistes}
                                selected={teamData.infographisteIds}
                                onChange={(id, c) => handleTeamChange('infographisteIds', id, c)}
                            />
                            <TeamCard
                                title="Équipe 3D"
                                icon={<IconLayoutKanban />}
                                options={data?.team3D}
                                selected={teamData.team3DIds}
                                onChange={(id, c) => handleTeamChange('team3DIds', id, c)}
                            />
                            <TeamCard
                                title="Coordinateurs"
                                icon={<IconUser />}
                                options={data?.coordinators}
                                selected={teamData.coordinatorIds}
                                onChange={(id, c) => handleTeamChange('coordinatorIds', id, c)}
                            />
                            <TeamCard
                                title="PM Juniors"
                                icon={<IconUser />}
                                options={data?.pmJuniors}
                                selected={teamData.pmJuniorIds}
                                onChange={(id, c) => handleTeamChange('pmJuniorIds', id, c)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-sm sticky bottom-0">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {activeTeamMembers.slice(0, 4).map((u, i) => (
                                        <div key={i} className="h-8 w-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary">
                                            {u.name.charAt(0)}
                                        </div>
                                    ))}
                                    {activeTeamMembers.length > 4 && (
                                        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold">
                                            +{activeTeamMembers.length - 4}
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm text-muted-foreground ml-2">membres assignés</span>
                            </div>
                            <Button onClick={() => assignTeam({ variables: { input: { projectId, ...teamData } } })} disabled={loadingAssign}>
                                {loadingAssign && <IconLoader className="mr-2 h-4 w-4 animate-spin" />}
                                Sauvegarder
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: ASSETS --- */}
                {activeTab === "assets" && (
                    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <FileDropzone file={selectedFile} onFileSelect={setSelectedFile} />
                        <div className="flex justify-end">
                            <Button size="lg" onClick={handleFileUpload} disabled={!selectedFile || loadingUpload}>
                                {loadingUpload && <IconLoader className="mr-2 h-4 w-4 animate-spin" />}
                                {loadingUpload ? "Envoi..." : "Uploader"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- TAB 3: TASKS --- */}
                {activeTab === "tasks" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Task Creation */}
                        <div className="p-1.5 bg-background border rounded-xl shadow-sm flex flex-col sm:flex-row gap-2 sticky top-0 z-10">
                            <Input
                                placeholder="Nouvelle tâche..."
                                className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
                                value={taskForm.desc}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, desc: e.target.value }))}
                            />
                            <Separator orientation="vertical" className="hidden sm:block h-8 my-auto" />
                            <div className="flex gap-2">
                                <Select
                                    value={taskForm.assignee}
                                    onValueChange={(val) => {
                                        const u = activeTeamMembers.find(x => x.id === val);
                                        setTaskForm(prev => ({ ...prev, assignee: val, dept: u?.dept || "" }));
                                    }}
                                >
                                    <SelectTrigger className="w-full sm:w-[180px] border-0 shadow-none bg-muted/50 rounded-lg h-10">
                                        <SelectValue placeholder="Assigner à..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeTeamMembers.map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="icon"
                                    className="rounded-lg h-10 w-10 shrink-0"
                                    disabled={loadingTask || !taskForm.desc}
                                    onClick={() => createTask({ variables: { input: { projectId, description: taskForm.desc, assignedToId: taskForm.assignee, department: taskForm.dept } } })}
                                >
                                    <IconPlus className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-3 pb-10">
                            {data?.tasksByProject?.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                                    <IconChecklist className="w-12 h-12 mb-3 opacity-20" />
                                    <p>Aucune tâche.</p>
                                </div>
                            )}
                            {data?.tasksByProject?.map((task: any) => (
                                <TaskItem key={task.id} task={task} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- 4. HELPER COMPONENTS ---

function TabNavigation({ active, onChange, counts }: { active: TabType, onChange: (t: TabType) => void, counts: any }) {
    const tabs = [
        // Removed "Brief" tab
        { id: "team", label: "Équipe", icon: <IconUsers className="w-4 h-4" /> },
        { id: "assets", label: "Fichiers", icon: <IconUpload className="w-4 h-4" /> },
        { id: "tasks", label: "Tâches", icon: <IconChecklist className="w-4 h-4" />, count: counts.tasks },
    ];

    return (
        <div className="flex p-1 bg-muted/40 rounded-lg border w-fit">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id as TabType)}
                    className={cn(
                        "flex items-center justify-center gap-2 px-4 h-9 rounded-md text-xs font-medium transition-all duration-200",
                        active === tab.id
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.count ? (
                        <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                            {tab.count}
                        </span>
                    ) : null}
                </button>
            ))}
        </div>
    );
}

function TeamCard({ title, icon, options, selected, onChange }: any) {
    return (
        <div className="p-4 rounded-xl border bg-card/50 hover:bg-card transition-colors shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                <div className="p-1.5 bg-background rounded-md border shadow-sm">{icon}</div>
                <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
            </div>
            <MultiSelectPopover
                title="Sélectionner..."
                options={options || []}
                selectedIds={selected}
                onChange={onChange}
            />
        </div>
    );
}

function FileDropzone({ file, onFileSelect }: { file: File | null, onFileSelect: (f: File | null) => void }) {
    return (
        <div className={cn(
            "group relative flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl transition-all overflow-hidden",
            file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        )}>
            <Input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
            />
            <div className="z-10 flex flex-col items-center text-center p-6">
                <div className={cn("p-4 rounded-full shadow-sm mb-4 transition-colors", file ? "bg-background text-primary" : "bg-background text-muted-foreground")}>
                    {file ? <IconFile className="w-8 h-8" /> : <IconUpload className="w-8 h-8" />}
                </div>
                {file ? (
                    <>
                        <p className="text-sm font-semibold text-foreground max-w-[200px] truncate">{file.name}</p>
                        <Button variant="ghost" size="sm" className="mt-4 text-red-500 hover:text-red-600 hover:bg-red-50 z-30 relative" onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}>
                            <IconX className="w-4 h-4 mr-2" /> Retirer
                        </Button>
                    </>
                ) : (
                    <p className="text-sm font-medium text-foreground">Glisser un fichier ici</p>
                )}
            </div>
        </div>
    );
}

function TaskItem({ task }: { task: any }) {
    const isDone = task.status === 'DONE';
    return (
        <div className="group flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm hover:shadow-md transition-all gap-4">
            <div className="flex items-start gap-4 overflow-hidden">
                <div className={cn("w-1.5 self-stretch rounded-full shrink-0 my-1", isDone ? "bg-green-500" : task.status === 'IN_PROGRESS' ? "bg-blue-500" : "bg-slate-300")} />
                <div className="min-w-0">
                    <p className={cn("font-medium text-sm truncate", isDone && "text-muted-foreground line-through")}>{task.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] font-normal h-5 px-1.5 gap-1.5 rounded-md">
                            {task.assignedTo?.name}
                        </Badge>
                    </div>
                </div>
            </div>
            <Badge variant={isDone ? "default" : "outline"}>{isDone ? "Fait" : "En cours"}</Badge>
        </div>
    );
}