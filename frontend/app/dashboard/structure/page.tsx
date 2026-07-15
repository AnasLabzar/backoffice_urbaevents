"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { gql, useQuery } from "@apollo/client";
import { Project } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    IconSearch,
    IconLayoutDashboard,
    IconChevronDown,
    IconChevronUp,
    IconUsers,
    IconListCheck,
    IconClock,
    IconCalendar,
    IconUserCircle,
    IconArrowRight,
    IconLoader
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// --- COMPONENTS ---
import { StructureStats } from "@/components/structure-stats";
import { StructureChart } from "@/components/structure-chart";

// --- GRAPHQL QUERIES ---

// 1. Main Feed
const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id
        projectCode
        title
        object
        status: generalStatus
        preparationStatus
        
        projectManagers { id name }
        team {
          infographistes { id name }
          team3D { id name }
          coordinators { id name }
        }
      }
    }
  }
`;

// 2. Managers
const GET_PROJECT_MANAGERS = gql`
  query GetProjectManagers {
    users(role: "PROJECT_MANAGER") { id name }
  }
`;

// 3. Tasks
const GET_PROJECT_TASKS = gql`
  query GetProjectTasks($projectId: ID!) {
    tasksByProject(projectId: $projectId) {
      id
      description
      status
      priority
      dueDate
      createdAt
      assignedTo { id name }
    }
  }
`;

// --- HELPER DATE SÉCURISÉ ---
const formatTaskDate = (dateStr: any) => {
    if (!dateStr) return null;
    let date = new Date(dateStr);

    if (isNaN(date.getTime())) {
        const timestamp = Number(dateStr);
        if (!isNaN(timestamp) && timestamp > 0) {
            date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
        }
    }

    if (isNaN(date.getTime())) return null;
    return format(date, "d MMM", { locale: fr });
};

// --- COMPOSANT : EXPLORATEUR D'ÉQUIPE & TÂCHES (Inside Row) ---
function TeamTaskExplorer({ projectId, teamMembers }: { projectId: string, teamMembers: any[] }) {
    const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
    const { data, loading, error } = useQuery(GET_PROJECT_TASKS, { variables: { projectId } });

    const memberTasks = React.useMemo(() => {
        if (!data?.tasksByProject || !selectedMemberId) return [];
        return data.tasksByProject.filter((t: any) => t.assignedTo?.id === selectedMemberId);
    }, [data, selectedMemberId]);

    const getPriorityColor = (p: string) => {
        if (p === 'HIGH') return "text-red-500 bg-red-50 border-red-200";
        if (p === 'LOW') return "text-slate-500 bg-slate-50 border-slate-200";
        return "text-blue-500 bg-blue-50 border-blue-200";
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-top-2 duration-300">

            {/* COLONNE GAUCHE : ÉQUIPE */}
            <div className="w-full md:w-1/3 space-y-3 border-b md:border-b-0 md:border-r border-border/40 pb-6 md:pb-0 pr-0 md:pr-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                    <IconUsers className="w-4 h-4 text-primary" />
                    Équipe Assignée
                </div>

                <ScrollArea className="h-[220px] pr-3">
                    <div className="space-y-2">
                        {teamMembers.length > 0 ? (
                            teamMembers.map((member: any) => {
                                const isSelected = selectedMemberId === member.id;
                                return (
                                    <motion.div
                                        whileHover={{ x: 4 }}
                                        key={member.id}
                                        onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all",
                                            isSelected ? "bg-primary/10 border-primary/30 shadow-sm" : "bg-card border-border/40 hover:border-border/80 hover:bg-muted/50"
                                        )}
                                    >
                                        <Avatar className={cn("w-9 h-9 border", isSelected ? "border-primary/50 shadow-inner" : "border-border/50")}>
                                            <AvatarFallback className={cn("text-xs font-bold", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className={cn("text-sm font-semibold truncate", isSelected ? "text-primary" : "text-foreground")}>
                                                {member.name}
                                            </span>
                                            <span className="text-[10px] font-medium text-muted-foreground">Voir les tâches</span>
                                        </div>
                                        {isSelected && <IconArrowRight className="w-4 h-4 ml-auto text-primary shrink-0" />}
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="text-sm text-muted-foreground italic p-2 bg-muted/20 rounded-lg border border-border/30">Aucune équipe assignée</div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* COLONNE DROITE : TÂCHES */}
            <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                    <div className="flex items-center gap-2">
                        <IconListCheck className="w-4 h-4 text-primary" />
                        Tâches {selectedMemberId ? "Assignées" : ""}
                    </div>
                    {memberTasks.length > 0 && <Badge variant="secondary" className="h-5 px-2 bg-primary/10 text-primary hover:bg-primary/20 border-0">{memberTasks.length}</Badge>}
                </div>

                <div className="bg-card rounded-xl border border-border/40 shadow-sm p-1 min-h-[220px] relative overflow-hidden">
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                    
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full py-10 gap-3 relative z-10">
                            <IconLoader className="w-6 h-6 animate-spin text-primary" />
                            <span className="text-xs font-medium text-muted-foreground">Chargement des tâches...</span>
                        </div>
                    ) : !selectedMemberId ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-full py-10 gap-3 text-muted-foreground/50 relative z-10"
                        >
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border border-border/40 mb-2">
                                <IconUserCircle className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="text-sm font-semibold text-foreground/70">Sélectionnez un membre</p>
                            <p className="text-xs max-w-[200px] text-center">Cliquez sur un membre à gauche pour afficher la liste de ses tâches en cours.</p>
                        </motion.div>
                    ) : memberTasks.length > 0 ? (
                        <ScrollArea className="h-[210px] relative z-10">
                            <div className="space-y-2 p-2">
                                <AnimatePresence>
                                    {memberTasks.map((task: any, idx: number) => {
                                        const dateStr = formatTaskDate(task.dueDate);
                                        return (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                key={task.id} 
                                                className="bg-background/80 backdrop-blur-sm p-3 rounded-xl border border-border/50 shadow-sm flex flex-col gap-2 hover:shadow-md transition-all hover:bg-background cursor-default overflow-hidden"
                                            >
                                                <div className="flex justify-between items-center gap-4 w-full min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate flex-1" title={task.description}>
                                                        {task.description?.length > 65 ? task.description.substring(0, 65) + '...' : task.description}
                                                    </p>
                                                    <Badge variant="outline" className={cn("text-[9px] h-5 px-1.5 font-bold border-0 shadow-none shrink-0", getPriorityColor(task.priority))}>
                                                        {task.priority || "NORMAL"}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground flex-wrap">
                                                    <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md", task.status === 'DONE' ? "bg-green-500/10 text-green-600" : "bg-slate-500/10 text-slate-600")}>
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", task.status === 'DONE' ? "bg-green-500" : "bg-slate-500")} />
                                                        {task.status}
                                                    </span>
                                                    {dateStr && (
                                                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md border border-border/40">
                                                            <IconCalendar className="w-3 h-3 text-primary/70" />
                                                            {dateStr}
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-10 gap-2 text-muted-foreground">
                            <IconListCheck className="w-8 h-8 opacity-20" />
                            <p className="text-xs">Aucune tâche pour ce membre</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- COMPOSANT ROW (Main) ---
function ProjectRow({ item }: { item: any }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = React.useState(false);
    const { project } = item;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DONE': return "bg-green-100 text-green-700 border-green-200";
            case 'IN_PROGRESS': return "bg-blue-100 text-blue-700 border-blue-200";
            case 'BLOCKED': return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    const teamMembers = [
        ...(project.team?.infographistes || []),
        ...(project.team?.team3D || []),
        ...(project.team?.coordinators || [])
    ];

    return (
        <>
            <TableRow className={cn("hover:bg-muted/30 transition-colors group border-b border-border/40 relative", isOpen && "bg-muted/10 border-b-0")}>
                {/* Code: Whitespace nowrap pour éviter le retour à la ligne */}
                <TableCell className="font-mono text-xs font-medium text-muted-foreground align-middle py-4 w-[120px] whitespace-nowrap">
                    {project.projectCode || "N/A"}
                </TableCell>

                <TableCell className="align-middle py-4 w-[120px]">
                    <Badge className={cn("text-[10px] uppercase border font-bold shadow-none whitespace-nowrap", getStatusColor(project.preparationStatus || project.status))}>
                        {project.preparationStatus === 'IN_PRODUCTION' ? 'Prod' : 'Autre'}
                    </Badge>
                </TableCell>

                <TableCell className="align-middle py-4">
                    <div className="flex flex-col gap-1 max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]">
                        <span
                            className="font-semibold text-sm truncate text-foreground cursor-pointer hover:text-primary transition-colors select-none"
                            onClick={() => setIsOpen(!isOpen)}
                            title={project.title}
                        >
                            {project.title}
                        </span>
                        <span className="text-xs text-muted-foreground truncate opacity-80" title={project.object}>
                            {project.object}
                        </span>
                    </div>
                </TableCell>

                <TableCell className="text-right align-middle py-4">
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsOpen(!isOpen)}
                            className={cn("h-8 gap-1 text-muted-foreground hover:text-foreground hover:bg-muted", isOpen && "text-primary bg-primary/10")}
                        >
                            <span className="text-xs font-medium hidden sm:inline">{isOpen ? "Fermer" : "Aperçu"}</span>
                            {isOpen ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
                        </Button>

                        <Button
                            size="sm"
                            className="h-8 gap-2 bg-primary/90 hover:bg-primary shadow-sm text-xs font-medium whitespace-nowrap"
                            onClick={() => router.push(`/dashboard/projects/${project.id}/production`)}
                        >
                            <IconLayoutDashboard className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Production</span>
                        </Button>
                    </div>
                </TableCell>
            </TableRow>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <TableRow className="bg-muted/10 border-b border-border/40">
                        <TableCell colSpan={4} className="p-0 border-0">
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 sm:p-6 border-t border-border/20 shadow-[inset_0_4px_6px_-6px_rgba(0,0,0,0.1)]">
                                    <TeamTaskExplorer projectId={project.id} teamMembers={teamMembers} />
                                </div>
                            </motion.div>
                        </TableCell>
                    </TableRow>
                )}
            </AnimatePresence>
        </>
    );
}

// --- PAGE MAIN CONTENT ---
function StructurePageContent() {
    const [searchTerm, setSearchTerm] = React.useState("");
    const [pmFilter, setPmFilter] = React.useState("all");

    const { data, loading, error } = useQuery(GET_PROJECTS_FEED);
    const { data: pmData, loading: loadingPMs } = useQuery(GET_PROJECT_MANAGERS);

    const allProjects = React.useMemo(() => {
        return data?.projects_feed?.map((item: any) => item.project) || [];
    }, [data]);

    const feedItems = React.useMemo(() => data?.projects_feed || [], [data]);

    const stats = React.useMemo(() => {
        if (!allProjects.length) return { active: 0, pms: 0, creatives: 0, coordinators: 0 };
        const active = allProjects.filter((p: any) => p.preparationStatus === 'IN_PRODUCTION');
        const uniquePMs = new Set();
        const uniqueCreatives = new Set();
        const uniquecoordinators = new Set();

        active.forEach((p: any) => {
            p.projectManagers?.forEach((pm: any) => uniquePMs.add(pm.id));
            p.team?.infographistes?.forEach((u: any) => uniqueCreatives.add(u.id));
            p.team?.team3D?.forEach((u: any) => uniqueCreatives.add(u.id));
            p.team?.coordinators?.forEach((u: any) => uniquecoordinators.add(u.id));
        });

        return {
            active: active.length,
            pms: uniquePMs.size,
            creatives: uniqueCreatives.size,
            coordinators: uniquecoordinators.size
        };
    }, [allProjects]);

    const filteredFeedItems = React.useMemo(() => {
        let items = feedItems.filter(
            (item: any) => item.project.preparationStatus === 'IN_PRODUCTION'
        );

        if (searchTerm) {
            items = items.filter((item: any) =>
                item.project.object.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.project.projectCode && item.project.projectCode.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (pmFilter !== "all") {
            items = items.filter((item: any) =>
                item.project.projectManagers.some((pm: any) => pm.id === pmFilter)
            );
        }

        return items;
    }, [feedItems, searchTerm, pmFilter]);

    if (error) {
        return <p className="p-6 text-red-500">Erreur: {error.message}</p>;
    }

    return (
        // Max-width 1920px pour aligner avec les autres pages
        <div className="flex flex-col gap-12 p-4 md:p-8 pt-6 max-w-[1920px] mx-auto w-full">

            {/* CHART & STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
                <div className="lg:col-span-2 h-full">
                    {loading ? <Skeleton className="h-full w-full rounded-xl" /> : <StructureChart data={allProjects} />}
                </div>
                <div className="lg:col-span-1 h-full">
                    {loading ? <Skeleton className="h-full w-full rounded-xl" /> : (
                        <StructureStats
                            className="h-full"
                            activeProjects={stats.active}
                            totalPMs={stats.pms}
                            totalCreatives={stats.creatives}
                            totalcoordinators={stats.coordinators}
                        />
                    )}
                </div>
            </div>

            <div className="hidden lg:block h-8 w-full" />

            {/* CONTENT & FILTERS */}
            <div className="w-full mt-10 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Structure des Projets</h2>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-80">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Chercher par dossier ou client..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={pmFilter} onValueChange={setPmFilter}>
                        <SelectTrigger className="w-full sm:w-60">
                            <SelectValue placeholder="Filtrer par Chef de Projet..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les Chefs de Projet</SelectItem>
                            {loadingPMs ? (
                                <SelectItem value="loading" disabled>Chargement...</SelectItem>
                            ) : (
                                pmData?.users.map((pm: any) => (
                                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* TABLE AVEC OVERFLOW POUR MOBILE */}
                <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto w-full custom-scrollbar"> {/* ✅ FIX RESPONSIVE TABLE */}
                        {loading ? (
                            <div className="p-6 space-y-4">
                                <Skeleton className="h-12 w-full rounded-lg" />
                                <Skeleton className="h-12 w-full rounded-lg" />
                                <Skeleton className="h-12 w-full rounded-lg" />
                            </div>
                        ) : (
                            <Table className="min-w-[800px] w-full"> {/* Min width pour éviter le squish sur mobile */}
                                <TableHeader className="bg-muted/30 border-b border-border/40">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[120px] py-4 whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">Code</TableHead>
                                        <TableHead className="w-[120px] py-4 whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                        <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Projet</TableHead>
                                        <TableHead className="w-[200px] text-right py-4 whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {filteredFeedItems.length > 0 ? (
                                            filteredFeedItems.map((item: any) => (
                                                <ProjectRow key={item.project.id} item={item} />
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-40 text-center">
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                                        <IconSearch className="w-10 h-10 opacity-20" />
                                                        <p className="text-sm font-medium">Aucun projet trouvé pour cette recherche.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

// Layout Wrapper
export default function StructurePage() {
    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties}
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col bg-muted/10 min-h-screen">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <StructurePageContent />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}