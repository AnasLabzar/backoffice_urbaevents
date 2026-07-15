"use client";

import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import { motion, AnimatePresence } from "framer-motion";
import { IconSearch, IconFolderOff, IconArchive, IconLayoutGrid, IconList } from "@tabler/icons-react";

// Layout & UI Imports
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateProjectDrawer } from "@/components/create-project-drawer";

// Data & Logic Imports
import { GET_PROJECTS_FEED } from "@/lib/graphql/projects";
import { calculateRemainingDays } from "@/components/projects/utils";

// Components Imports
import { ProjectMetrics } from "@/components/projects/project-metrics";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectCard } from "@/components/projects/project-card";

export default function ProjectsPage() {
    const { data, loading, error } = useQuery(GET_PROJECTS_FEED, {
        fetchPolicy: "cache-and-network"
    });

    const [searchQuery, setSearchQuery] = useState("");

    // Default view mode (optional, if you want tabs to switch between cards/list)
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const rawFeed = data?.projects_feed || [];
    const projectsOnly = rawFeed.map((item: any) => ({
        ...item.project,
        latestTask: item.latestTask
    }));

    const filteredProjects = searchQuery
        ? projectsOnly.filter((p: any) =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.object.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.projectCode.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : projectsOnly;

    const activeProjects = filteredProjects.filter((p: any) =>
        p.preparationStatus !== 'DONE' &&
        p.preparationStatus !== 'NO' &&
        calculateRemainingDays(p.submissionDeadline).text !== "Dépassé"
    );

    const archivedProjects = filteredProjects.filter((p: any) =>
        p.preparationStatus === 'DONE' ||
        p.preparationStatus === 'NO' ||
        calculateRemainingDays(p.submissionDeadline).text === "Dépassé"
    );

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties}
        >
            <AppSidebar variant="inset" />
            <SidebarInset className="overflow-x-hidden">
                <SiteHeader />

                {/* FIX: Removed unnecessary nested flex containers. 
                   Used 'w-full' and 'max-w-[1920px]' to handle large screens gracefully.
                   Added 'mx-auto' to center content on ultra-wide monitors.
                */}
                <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-8 bg-muted/5 dark:bg-background min-h-screen">

                    {/* --- SECTION 1: METRICS & KPIS --- */}
                    <div className="w-full animate-in fade-in slide-in-from-top-4 duration-500">
                        <ProjectMetrics
                            projects={projectsOnly}
                            loading={loading}
                        />
                    </div>

                    {/* --- SECTION 2: TOOLBAR --- */}
                    <div className="flex mt-[12em] flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 -my-4 px-2 -mx-2 rounded-lg border-b border-transparent data-[stuck=true]:border-border/40 transition-all">
                        <div className="relative w-full sm:w-80 md:w-96">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher un projet..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="hidden sm:block">
                                <TabsList className="h-10 bg-muted/50 p-1">
                                    <TabsTrigger value="grid" className="h-8 px-3"><IconLayoutGrid className="w-4 h-4 mr-2" /> Grille</TabsTrigger>
                                    <TabsTrigger value="list" className="h-8 px-3"><IconList className="w-4 h-4 mr-2" /> Liste</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <CreateProjectDrawer />
                        </div>
                    </div>

                    {/* --- SECTION 3: CONTENT AREA --- */}
                    <div className="space-y-10 mt-6">

                        {/* A. ACTIVE PROJECTS */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    En Cours
                                    <Badge variant="secondary" className="ml-2 rounded-full px-2.5 py-0.5 text-xs font-normal">
                                        {activeProjects.length}
                                    </Badge>
                                </h2>
                            </div>

                            {/* LOADING STATE */}
                            {loading && (
                                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-[320px] rounded-xl" />
                                    ))}
                                </div>
                            )}

                            {/* EMPTY STATE */}
                            {!loading && !error && activeProjects.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/5">
                                    <div className="bg-muted p-4 rounded-full mb-4">
                                        <IconFolderOff className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium text-foreground">Aucun projet trouvé</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                                        Aucun projet ne correspond à votre recherche ou il n'y a pas de projet actif pour le moment.
                                    </p>
                                </div>
                            )}

                            {/* GRID VIEW */}
                            {!loading && !error && viewMode === 'grid' && (
                                <motion.div 
                                    className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <AnimatePresence>
                                        {activeProjects.map((project: any, idx: number) => (
                                            <motion.div
                                                key={project.id}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4, delay: idx * 0.05, ease: "easeOut" }}
                                                className="h-full"
                                            >
                                                <ProjectCard project={project} />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {/* LIST VIEW (Optional if you implemented list toggle) */}
                            {!loading && !error && viewMode === 'list' && (
                                <div className="border rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-500 bg-background">
                                    <ProjectList
                                        data={activeProjects.map((p: any) => ({ project: p, latestTask: p.latestTask }))}
                                        loading={false}
                                        error={undefined}
                                    />
                                </div>
                            )}
                        </div>

                        {/* B. ARCHIVED PROJECTS */}
                        {!loading && archivedProjects.length > 0 && (
                            <div className="space-y-6 pt-8">
                                <div className="flex items-center gap-4">
                                    <Separator className="flex-1" />
                                    <Badge variant="outline" className="gap-2 py-1.5 px-3 text-muted-foreground bg-background/50 backdrop-blur-sm">
                                        <IconArchive className="w-3.5 h-3.5" />
                                        Archives ({archivedProjects.length})
                                    </Badge>
                                    <Separator className="flex-1" />
                                </div>

                                <motion.div 
                                    className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 opacity-75 hover:opacity-100 transition-opacity duration-300"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                >
                                    <AnimatePresence>
                                        {archivedProjects.map((project: any, idx: number) => (
                                            <motion.div
                                                key={project.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4, delay: 0.4 + (idx * 0.05), ease: "easeOut" }}
                                                className="h-full"
                                            >
                                                <ProjectCard project={project} />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            </div>
                        )}

                        {/* C. FULL TABLE VIEW (Always visible at bottom for detailed analysis) */}
                        <div className="space-y-4 pt-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold tracking-tight">Vue Détaillée (Tous)</h2>
                            </div>
                            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                <ProjectList
                                    data={rawFeed}
                                    loading={loading}
                                    error={error}
                                />
                            </div>
                        </div>

                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}