"use client";

import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import { IconSearch, IconFolderOff, IconArchive } from "@tabler/icons-react";

// Layout & UI Imports
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDrawer } from "@/components/create-project-drawer";

// Data & Logic Imports
import { GET_PROJECTS_FEED } from "@/lib/graphql/projects";
import { calculateRemainingDays } from "@/components/projects/utils";

// Refactored Components Imports
import { ProjectMetrics } from "@/components/projects/project-metrics";
import { ProjectList } from "@/components/projects/project-list"; // Wraps DataTable
import { ProjectCard } from "@/components/projects/project-card";

export default function ProjectsPage() {
    // 1. Data Fetching
    const { data, loading, error } = useQuery(GET_PROJECTS_FEED, {
        fetchPolicy: "cache-and-network"
    });

    // 2. Local State
    const [searchQuery, setSearchQuery] = useState("");

    // 3. Data Processing
    // We flatten the feed to get the project objects for the cards/metrics
    const rawFeed = data?.projects_feed || [];
    const projectsOnly = rawFeed.map((item: any) => ({
        ...item.project,
        latestTask: item.latestTask // We attach the task to the project object for the card to use
    }));

    // 4. Filtering Logic
    const filteredProjects = searchQuery
        ? projectsOnly.filter((p: any) =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.object.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.projectCode.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : projectsOnly;

    // Split Active vs Archived (Deadline passed or Status DONE)
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
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col bg-muted/10 min-h-screen">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-8 py-6 px-4 lg:px-8">

                            {/* --- SECTION 1: METRICS & KPIS --- */}
                            {/* This replaces ChartAreaInteractive with a cleaner wrapper */}
                            <ProjectMetrics
                                projects={projectsOnly}
                                loading={loading}
                            />

                            {/* --- SECTION 2: TOOLBAR --- */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
                                <div className="relative w-full md:w-96">
                                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher par titre, client ou code..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-background shadow-sm"
                                    />
                                </div>
                                <CreateProjectDrawer />
                            </div>

                            {/* --- SECTION 3: ACTIVE PROJECTS (CARDS) --- */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold tracking-tight">En Cours</h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {loading && Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-[280px] rounded-xl" />
                                    ))}

                                    {!loading && !error && activeProjects.length === 0 && (
                                        <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                                            <IconFolderOff className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p>Aucun projet actif trouvé.</p>
                                        </div>
                                    )}

                                    {!loading && !error && activeProjects.map((project: any) => (
                                        <ProjectCard key={project.id} project={project} />
                                    ))}
                                </div>
                            </div>

                            {/* --- SECTION 4: ARCHIVED / OVERDUE (OPTIONAL) --- */}
                            {!loading && archivedProjects.length > 0 && (
                                <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-4">
                                        <Separator className="flex-1" />
                                        <Badge variant="outline" className="gap-2 text-muted-foreground">
                                            <IconArchive className="w-3 h-3" />
                                            Archives / Terminés
                                        </Badge>
                                        <Separator className="flex-1" />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grayscale hover:grayscale-0 transition-all duration-500">
                                        {archivedProjects.map((project: any) => (
                                            <ProjectCard key={project.id} project={project} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="h-4" />

                            {/* --- SECTION 5: DETAILED TABLE --- */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold tracking-tight">Vue Détaillée</h2>
                                {/* ProjectList handles the DataTable and Columns internally */}
                                <ProjectList
                                    data={rawFeed} // Passes the raw {project, latestTask} structure
                                    loading={loading}
                                    error={error}
                                />
                            </div>

                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}