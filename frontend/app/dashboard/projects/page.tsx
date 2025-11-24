"use client";

import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { IconSearch } from "@tabler/icons-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateProjectDrawer } from "@/components/create-project-drawer";

// Import Queries
import { GET_PROJECTS_FEED } from "@/lib/graphql/projects";

// Import Refactored Components
import { ProjectMetrics } from "@/components/projects/project-metrics";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectCard } from "@/components/projects/project-card"; // <-- Assurez-vous que ce fichier existe
import { calculateRemainingDays } from "@/components/projects/utils";

export default function ProjectsPage() {
    // 1. Data Fetching
    const { data, loading, error } = useQuery(GET_PROJECTS_FEED);

    // 2. State pour la recherche (pour filtrer les cartes)
    const [searchQuery, setSearchQuery] = useState("");

    // 3. Data Preparation
    const rawFeed = data?.projects_feed || [];
    const projectsOnly = rawFeed.map((item: any) => item.project);

    // 4. Filtrage pour les Cartes
    const filteredProjects = searchQuery
        ? projectsOnly.filter((project: any) =>
            project.object.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.title.toLowerCase().includes(searchQuery.toLowerCase())
        ) : projectsOnly;

    const activeProjects = filteredProjects.filter((p: any) => calculateRemainingDays(p.submissionDeadline).text !== "Dépassé");
    const archivedProjects = filteredProjects.filter((p: any) => calculateRemainingDays(p.submissionDeadline).text === "Dépassé");

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
                        <div className="flex flex-col gap-12 py-6 px-4 lg:px-8">

                            {/* Section 1: Metrics */}
                            <ProjectMetrics
                                projects={projectsOnly}
                                loading={loading}
                            />

                            {/* Section 2: Toolbar (Recherche & Création) */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-36">
                                <div className="relative w-full md:w-96">
                                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <CreateProjectDrawer />
                            </div>

                            {/* Section 3: Grille de Cartes (C'EST ÇA QUI MANQUAIT) */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-xl" />)}
                                {error && <p className="text-red-500 col-span-4">Erreur: {error.message}</p>}
                                {!loading && !error && activeProjects.map((project: any) => (
                                    <ProjectCard key={project.id} project={project} />
                                ))}
                            </div>

                            {/* Section 3.5: Archives (Optionnel) */}
                            {!loading && !error && archivedProjects.length > 0 && (
                                <>
                                    <div className="relative my-6">
                                        <Separator />
                                        <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-3 text-sm font-medium text-muted-foreground">
                                            Archives (Dépassé)
                                        </span>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 opacity-70 hover:opacity-100 transition-opacity">
                                        {archivedProjects.map((project: any) => (
                                            <ProjectCard key={project.id} project={project} />
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="hidden lg:block h-4 w-full" />
                            <Separator />

                            {/* Section 4: Data Table */}
                            <ProjectList
                                data={rawFeed}
                                loading={loading}
                                error={error}
                            />

                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}