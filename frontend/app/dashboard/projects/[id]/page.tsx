// Filename: app/dashboard/projects/[id]/page.tsx
"use client";

import * as React from "react";
import { gql, useQuery } from "@apollo/client";
import { useParams, notFound, useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
    IconActivity,
    IconChecklist,
    IconClock,
    IconLoader,
    IconCircleCheck,
    IconUpload,
    IconUsers,
    IconAlertTriangle,
    IconArrowLeft,
    IconMessageCircle,
    IconFileDescription,
    IconCurrencyDirham,
    IconCalendarStats,
    IconBuildingSkyscraper,
    IconTarget,
    IconBulb,
    IconMapPin,
    IconExclamationCircle,
    IconHistory,
    IconMicrophone,
    IconUser
} from "@tabler/icons-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { AIAssistantButton } from "@/components/projects/ai-assistant-button";
import { Retroplanning } from "@/components/production/retroplanning";
import { ProjectProfitabilityCard } from "@/components/projects/ProjectProfitabilityCard";

// --- 1. QUERIES ---

// ✅ Project Query (Standard)
const GET_PROJECT_BY_ID = gql`
  query GetProjectById($id: ID!) {
    project(id: $id) {
      id
      title
      object
      projectCode
      projectType
      referenceAO
      status: generalStatus
      preparationStatus
      submissionDeadline
      marketEstimate
      estimatedBudget
      budgetTarget
      budgetClient
      cautionAmount
      
      projectManagers { id name email }
      team {
        infographistes { id name }
        team3D { id name }
        coordinators { id name }
        pmJuniors { id name }
      }
      proposalAvis {
        status
        reason
        givenBy { name }
        givenAt
      }
      aiSummary { risks }
      stages {
        administrative {
          documents { fileName originalFileName fileUrl }
        }
      }
    }
  }
`;

// ✅ Brief Query (Separate & Correct Type)
const GET_BRIEF_BY_PROJECT_ID = gql`
  query GetBriefByProjectId($projectId: ID!) {
    getProjectBrief(projectId: $projectId) {
        id
        clientNature
        eventFormat
        toneStyle
        location
        locationType
        visitorsCount
        estimatedBudget
        startDate
        endDate
        targetAudience
        mainObjective
        eventGoal
        history
        constraints
    }
  }
`;

const GET_TASKS_BY_PROJECT_QUERY = gql`
  query GetTasksByProject($projectId: ID!) {
    tasksByProject(projectId: $projectId) {
      id
      description
      status
      department
      createdAt
      assignedTo { id name }
      v1Uploads { id fileUrl originalFileName }
      finalUpload { id fileUrl originalFileName }
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

// --- 2. HELPERS ---

const getFileUrl = (filePath: string) => {
    if (!filePath) return "#";
    const baseUrl = typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:5002"
        : "https://backoffice.urbagroupe.ma";
    return `${baseUrl}/${filePath.startsWith("/") ? filePath.slice(1) : filePath}`;
};

function parseDate(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    let date;
    if (/^\d+$/.test(dateString)) date = new Date(parseInt(dateString, 10));
    else date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date;
}

function formatDate(date: Date | null, formatStr: string = "PPP p") {
    if (!date) return "N/A";
    try { return format(date, formatStr, { locale: fr }); }
    catch (error) { return "Date Invalide"; }
}

const parseArray = (data: any) => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string' && data.includes(',')) return data.split(',').map(s => s.trim());
    if (data && typeof data === 'string') return [data];
    return [];
};

// --- 3. SUB-COMPONENTS ---

// --- A. BRIEF SUMMARY CARD (FULL DATA DISPLAY) ---
function BriefSummaryCard({ brief }: { brief: any }) {
    if (!brief) return null;

    const objectives = parseArray(brief.eventGoal);
    const targets = parseArray(brief.targetAudience);

    return (
        <Card className="border shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-4 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                    <IconFileDescription className="w-5 h-5" /> Brief & Cadrage Stratégique
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">

                    {/* Column 1: Core Strategy */}
                    <div className="p-6 space-y-6 border-b md:border-b-0 md:border-r border-border/50">
                        
                        {/* Main Goal */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <IconTarget className="w-3.5 h-3.5" /> Objectif Principal
                            </h4>
                            <p className="text-sm font-medium leading-relaxed text-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                                {brief.mainObjective || "Non défini"}
                            </p>
                        </div>

                        {/* Tone & Style */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <IconMicrophone className="w-3.5 h-3.5" /> Ton & Concept
                            </h4>
                            <p className="text-sm text-foreground/80">{brief.toneStyle || "Non spécifié"}</p>
                        </div>

                        {/* Client Nature */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <IconUser className="w-3.5 h-3.5" /> Nature Client
                            </h4>
                            <Badge variant="outline">{brief.clientNature || "Non spécifié"}</Badge>
                        </div>
                    </div>

                    {/* Column 2: Targets & Specifics */}
                    <div className="p-6 space-y-6">

                        {/* Targets */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <IconUsers className="w-3.5 h-3.5" /> Public Cible
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {targets.length > 0 ? targets.map((t: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="font-normal bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-100 dark:border-blue-800">
                                        {t}
                                    </Badge>
                                )) : <span className="text-sm text-muted-foreground italic">Non défini</span>}
                            </div>
                        </div>

                        {/* Specific Objectives */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <IconBulb className="w-3.5 h-3.5" /> Objectifs Spécifiques
                            </h4>
                            {objectives.length > 0 ? (
                                <ul className="space-y-2">
                                    {objectives.map((obj: string, i: number) => (
                                        <li key={i} className="text-sm flex items-start gap-2 bg-muted/10 p-2 rounded border border-transparent hover:border-border/50 transition-colors">
                                            <span className="text-primary mt-0.5">•</span> {obj}
                                        </li>
                                    ))}
                                </ul>
                            ) : <span className="text-sm text-muted-foreground italic">Aucun objectif secondaire</span>}
                        </div>

                        {/* History */}
                        {brief.history && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <IconHistory className="w-3.5 h-3.5" /> Historique
                                </h4>
                                <p className="text-xs text-muted-foreground italic">{brief.history}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Logistics Bar */}
                <div className="bg-muted/30 border-y border-border/50 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Format</span>
                        <span className="font-medium">{brief.eventFormat || "N/A"}</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Type Lieu</span>
                        <span className="font-medium">{brief.locationType || "N/A"}</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Ville/Lieu</span>
                        <div className="flex items-center gap-1 font-medium truncate" title={brief.location}>
                            <IconMapPin className="w-3 h-3 text-muted-foreground" /> {brief.location || "N/A"}
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Nombre Pax</span>
                        <span className="font-mono font-bold">{brief.visitorsCount || "-"}</span>
                    </div>
                </div>

                {/* Constraints Footer */}
                {brief.constraints && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-4">
                        <h4 className="text-xs font-bold uppercase text-amber-700 dark:text-amber-500 flex items-center gap-2 mb-1">
                            <IconExclamationCircle className="w-4 h-4" /> Contraintes & Risques
                        </h4>
                        <p className="text-sm text-amber-900 dark:text-amber-200/90 leading-relaxed font-medium">
                            {brief.constraints}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ... (Other components like ProjectTimeline, FinancialCard, TeamMemberPill remain same) ...
// For brevity, re-including essential ones used in main page

function FinancialCard({ project }: { project: any }) {
    return (
        <Card className="overflow-hidden border-l-4 border-l-primary/60 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-muted/20 pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <IconCurrencyDirham className="w-4 h-4 text-primary" /> Informations Financières
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Estimation Marché</p>
                    <p className="text-lg font-mono font-bold text-foreground">
                        {project.marketEstimate?.toLocaleString("fr-FR") || "0"} <span className="text-xs text-muted-foreground">DH</span>
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Budget Estimé</p>
                    <p className="text-lg font-mono font-bold text-foreground">
                        {project.estimatedBudget?.toLocaleString("fr-FR") || "-"} <span className="text-xs text-muted-foreground">DH</span>
                    </p>
                </div>
                {project.cautionAmount > 0 && (
                    <div className="col-span-2 pt-3 border-t border-dashed">
                        <div className="flex justify-between items-center">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Caution Déposée</p>
                            <p className="text-sm font-mono font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                                {project.cautionAmount?.toLocaleString("fr-FR")} DH
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ProjectTimeline({ tasks = [], logs = [] }: { tasks: any[]; logs: any[] }) {
    const timelineItems = [
        ...tasks.map(t => ({ type: "task", date: parseDate(t.createdAt), data: t })),
        ...logs.map(l => ({ type: "log", date: parseDate(l.createdAt), data: l }))
    ].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

    if (timelineItems.length === 0) return <p className="text-muted-foreground text-center py-10 text-sm">Aucune activité.</p>;

    return (
        <div className="flex flex-col space-y-4">
            {timelineItems.map((item, index) => {
                const isLast = index === timelineItems.length - 1;
                const Icon = item.type === "task" ? IconChecklist : IconActivity;
                const title = item.type === "task" ? item.data.description : item.data.details;
                const user = item.type === "task" ? item.data.assignedTo?.name : item.data.user?.name;

                return (
                    <div key={`${item.type}-${item.data.id}`} className="relative flex gap-4">
                        <div className="flex flex-col items-center">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border shadow-sm">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </span>
                            {!isLast && <div className="h-full w-px flex-1 bg-border/50 my-1.5" />}
                        </div>
                        <div className={cn("pb-6 flex-grow min-w-0", !isLast && "border-b border-border/40")}>
                            <div className="flex items-center justify-between mb-1">
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", item.type === "task" ? "text-blue-500" : "text-muted-foreground")}>
                                    {item.type === "task" ? "TÂCHE" : "LOG"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(item.date!, { addSuffix: true, locale: fr })}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-foreground line-clamp-2">{title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {item.type === "task" ? `Assigné à : ${user || "N/A"}` : `Par : ${user || "Système"}`}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TeamMemberPill({ member, role }: { member: any, role: string }) {
    return (
        <div className="flex items-center gap-2 bg-card hover:bg-muted/50 px-3 py-2 rounded-lg border border-border/60 transition-all shadow-sm">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 shrink-0">
                {member.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold leading-none truncate">{member.name}</span>
                <span className="text-[10px] text-muted-foreground leading-none mt-1 truncate">{role}</span>
            </div>
        </div>
    );
}

function NewProjectStatusPill({ status }: { status: string }) {
    const map: any = {
        DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-800" },
        TO_PREPARE: { label: "À Préparer", color: "bg-blue-100 text-blue-800" },
        IN_PRODUCTION: { label: "En Production", color: "bg-green-100 text-green-800" },
        DONE: { label: "Terminé", color: "bg-gray-800 text-gray-100" },
        FEASIBILITY_PENDING: { label: "Faisabilité", color: "bg-purple-100 text-purple-800" },
    };
    const info = map[status] || { label: status, color: "bg-gray-100 text-gray-800" };
    return <Badge className={cn("text-xs font-semibold border-0 px-2.5 py-0.5", info.color)}>{info.label}</Badge>;
}

// --- 4. MAIN PAGE COMPONENT ---
export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: projectData, loading: loadingProject, error: errorProject } = useQuery(GET_PROJECT_BY_ID, {
        variables: { id },
        skip: !id,
    });

    // ✅ FIXED: Variable must be ID! to match backend schema expectation
    const { data: briefData, loading: loadingBrief } = useQuery(GET_BRIEF_BY_PROJECT_ID, {
        variables: { projectId: id }, // ID passed as variable
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
    const brief = briefData?.getProjectBrief;
    const tasks = taskData?.tasksByProject || [];
    const logs = logData?.logs || [];

    if (loadingProject) return <Skeleton className="h-96 w-full m-8 rounded-xl" />;
    if (errorProject) return <div className="p-8 text-center text-red-500">Erreur: {errorProject.message}</div>;
    if (!project) return notFound();

    return (
        <SidebarProvider style={{ "--sidebar-width": "18rem" } as React.CSSProperties}>
            <AppSidebar variant="inset" />
            <SidebarInset className="bg-muted/5 dark:bg-background">
                <SiteHeader />
                <main className="flex-1 flex flex-col space-y-8 p-4 md:p-8 max-w-[1920px] mx-auto w-full animate-in fade-in duration-500">

                    {/* --- HEADER --- */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground -ml-2">
                                <IconArrowLeft className="h-4 w-4 mr-1" /> Retour
                            </Button>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{project.projectCode || "NO-CODE"}</span>
                            <NewProjectStatusPill status={project.preparationStatus} />
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.object}</h1>
                                <p className="text-muted-foreground max-w-3xl leading-relaxed text-sm border-l-2 border-primary/40 pl-3">
                                    {project.title}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <AIAssistantButton 
                                    projectId={project.id} 
                                    documents={project.stages?.administrative?.documents || []} 
                                />
                                <Button variant="outline" className="shadow-sm" onClick={() => router.push(`/dashboard/projects/${id}/brief`)}>
                                    <IconFileDescription className="w-4 h-4 mr-2" /> Éditer Brief
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* --- TABS --- */}
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="mb-8 w-full justify-start bg-muted/50 border-b border-border/50 h-auto p-0 rounded-none">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 font-semibold">
                                Vue d'ensemble
                            </TabsTrigger>
                            <TabsTrigger value="planification" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 font-semibold">
                                Planification (Rétroplanning)
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="overview" className="mt-0">
                            {/* 2 COLUMNS GRID */}
                            <div className="grid xl:grid-cols-3 gap-8 items-start">

                                {/* LEFT COLUMN (Brief, Details & Team) */}
                                <div className="lg:col-span-2 space-y-8">

                                    {/* ✅ 1. BRIEF SUMMARY CARD (Display Logic) */}
                                    {/* Shows skeleton while loading brief, then shows card if brief exists, else shows empty state */}
                                    {loadingBrief ? (
                                        <Skeleton className="h-64 w-full rounded-xl" />
                                    ) : brief ? (
                                        <BriefSummaryCard brief={brief} />
                                    ) : (
                                        <Card className="border-dashed border-2 bg-muted/5">
                                            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                                                <IconFileDescription className="w-10 h-10 text-muted-foreground/30 mb-2" />
                                                <p className="text-sm text-muted-foreground">Aucun brief détaillé n'a encore été saisi pour ce projet.</p>
                                                <Button variant="link" onClick={() => router.push(`/dashboard/projects/${id}/brief`)}>Remplir le brief maintenant</Button>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 2. PROJECT INFO & RISKS */}
                                    <Card className="border shadow-sm bg-card">
                                        <CardHeader className="pb-4 border-b bg-muted/10">
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                                    <IconBuildingSkyscraper className="w-4 h-4 text-primary" /> Informations Générales
                                                </CardTitle>
                                                <Badge variant="outline" className="font-mono text-xs">{project.projectType}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 grid sm:grid-cols-2 gap-6 text-sm">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Référence AO</span>
                                                <p className="font-medium font-mono">{project.referenceAO || "Non spécifié"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Risques Identifiés (IA)</span>
                                                {project.aiSummary?.risks?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {project.aiSummary.risks.map((risk: string, i: number) => (
                                                            <Badge key={i} variant="destructive" className="text-[10px] px-2 py-0.5 shadow-sm">{risk}</Badge>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-muted-foreground italic text-xs">Aucun risque signalé</p>}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* 3. TEAM CARD */}
                                    <Card className="border shadow-sm">
                                        <CardHeader className="pb-4 border-b bg-muted/10">
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <IconUsers className="w-4 h-4 text-primary" /> Équipe Projet
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="flex flex-wrap gap-3">
                                                {project.projectManagers?.map((pm: any) => (
                                                    <TeamMemberPill key={pm.id} member={pm} role="Chef de Projet" />
                                                ))}
                                                {project.team?.infographistes?.map((user: any) => (
                                                    <TeamMemberPill key={user.id} member={user} role="Infographiste" />
                                                ))}
                                                {project.team?.team3D?.map((user: any) => (
                                                    <TeamMemberPill key={user.id} member={user} role="Artiste 3D" />
                                                ))}
                                                {project.team?.coordinators?.map((user: any) => (
                                                    <TeamMemberPill key={user.id} member={user} role="Coordinateur" />
                                                ))}
                                                {project.team?.pmJuniors?.map((user: any) => (
                                                    <TeamMemberPill key={user.id} member={user} role="PM Junior" />
                                                ))}
                                                {(!project.projectManagers?.length && !project.team?.infographistes?.length && !project.team?.team3D?.length) && (
                                                    <span className="text-sm text-muted-foreground italic bg-muted/30 px-3 py-2 rounded-md">Aucune équipe assignée pour le moment.</span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* 4. TIMELINE */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <IconActivity className="w-5 h-5 text-primary" /> Journal d'activité
                                        </h3>
                                        <Card className="border shadow-sm">
                                            <CardContent className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                                                {(loadingTasks || loadingLogs) ? (
                                                    <div className="space-y-4">
                                                        <Skeleton className="h-12 w-full" />
                                                        <Skeleton className="h-12 w-full" />
                                                        <Skeleton className="h-12 w-full" />
                                                    </div>
                                                ) : (
                                                    <ProjectTimeline tasks={tasks} logs={logs} />
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>

                                </div>

                                {/* RIGHT COLUMN (Stats, Dates, Avis) */}
                                <div className="space-y-6">

                                    {/* Financials / Profitability */}
                                    <ProjectProfitabilityCard 
                                        projectId={project.id}
                                        initialBudgetClient={project.budgetClient || project.estimatedBudget || project.budgetTarget || 0} 
                                        coutTechnique={0} // Mocked for now until WBS is wired
                                    />

                                    {/* Dates Card */}
                                    <Card className="border shadow-sm">
                                        <CardHeader className="bg-muted/10 pb-3 border-b border-border/50">
                                            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                                <IconCalendarStats className="w-4 h-4 text-primary" /> Dates Clés
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 grid gap-4">
                                            <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                                                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Date Limite de Dépôt</p>
                                                <div className="flex items-center gap-2 text-foreground font-medium">
                                                    <IconClock className="h-4 w-4 text-orange-500" />
                                                    {formatDate(parseDate(project.submissionDeadline), "PPP à p")}
                                                </div>
                                            </div>
                                            {/* BRIEF DATES (displayed only if brief exists) */}
                                            {brief?.startDate && (
                                                <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Début Événement</p>
                                                    <div className="flex items-center gap-2 text-foreground font-medium">
                                                        <IconCalendarStats className="h-4 w-4 text-blue-500" />
                                                        {formatDate(parseDate(brief.startDate), "PPP")}
                                                    </div>
                                                </div>
                                            )}
                                            {brief?.endDate && (
                                                <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Fin Événement</p>
                                                    <div className="flex items-center gap-2 text-foreground font-medium">
                                                        <IconCalendarStats className="h-4 w-4 text-blue-500" />
                                                        {formatDate(parseDate(brief.endDate), "PPP")}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Avis de Préparation */}
                                    {project.proposalAvis && (
                                        <Card className={cn("border shadow-sm transition-colors", project.proposalAvis.status === 'ACCEPTED' ? 'border-green-500/30 bg-green-50/20 dark:bg-green-900/10' : 'border-red-500/30 bg-red-50/20 dark:bg-red-900/10')}>
                                            <CardHeader className="pb-3 border-b border-border/10">
                                                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                                    <IconMessageCircle className="w-4 h-4" /> Avis CP
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    {project.proposalAvis.status === 'ACCEPTED' ? (
                                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800">Accepté</Badge>
                                                    ) : (
                                                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800">Refusé</Badge>
                                                    )}
                                                    <span className="text-xs text-muted-foreground">par {project.proposalAvis.givenBy?.name}</span>
                                                </div>
                                                {project.proposalAvis.reason && (
                                                    <div className="text-sm italic text-muted-foreground bg-background/60 p-3 rounded-md border border-border/20 shadow-sm">
                                                        "{project.proposalAvis.reason}"
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-muted-foreground text-right border-t border-border/10 pt-2">
                                                    Donné le {formatDate(parseDate(project.proposalAvis.givenAt))}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}

                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="planification" className="mt-0">
                            <Retroplanning projectId={id} currentPhase={project.currentPhase} />
                        </TabsContent>
                    </Tabs>

                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}