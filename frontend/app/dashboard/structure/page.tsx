"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { gql, useQuery } from "@apollo/client";
import { Project } from "@/lib/types";
import { StructureAccordion } from "@/components/structure-accordion"; // L-Component l-jdid
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { IconSearch } from "@tabler/icons-react";

// --- L-QUERIES ---
const GET_PROJECTS_FEED_FOR_STRUCTURE = gql`
  query GetProjectsFeedForStructure {
    projects_feed {
      project {
        id
        title
        object
        preparationStatus
        projectManagers { id name }
        submissionDeadline
        team {
          infographistes { id name }
          team3D { id name }
          assistants { id name }
        }
        stages { 
          administrative { documents { id fileName fileUrl } }
          technical { documents { id fileName fileUrl originalFileName } }
        }
        feasibilityChecks { administrative technical financial }
        caution { status }
      }
    }
  }
`;

const GET_PROJECT_MANAGERS = gql`
  query GetProjectManagers {
    users(role: "PROJECT_MANAGER") { id name }
  }
`;

// --- Hada l-component l-ra2issi li fih l-data o l-filtres ---
function StructurePageContent() {
    const [searchTerm, setSearchTerm] = React.useState("");
    const [pmFilter, setPmFilter] = React.useState("all");

    const { data, loading, error } = useQuery(GET_PROJECTS_FEED_FOR_STRUCTURE);
    const { data: pmData, loading: loadingPMs } = useQuery(GET_PROJECT_MANAGERS);

    const filteredProjects: Project[] = React.useMemo(() => {
        if (!data) return [];

        const allProjects = data.projects_feed.map((item: any) => item.project);

        let projectsInProduction = allProjects.filter(
            (p: Project) => p.preparationStatus === 'IN_PRODUCTION'
        );

        if (searchTerm) {
            projectsInProduction = projectsInProduction.filter((p: Project) =>
                p.object.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (pmFilter !== "all") {
            projectsInProduction = projectsInProduction.filter((p: Project) =>
                p.projectManagers.some((pm: any) => pm.id === pmFilter)
            );
        }

        return projectsInProduction;
    }, [data, searchTerm, pmFilter]);

    if (error) {
        return <p className="p-6 text-red-500">Erreur: {error.message}</p>;
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Structure des Projets</h2>
            </div>

            {/* --- L-OUTILS L-JDAD (FILTRES) --- */}
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
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                            pmData?.users.map((pm: any) => (
                                <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* --- L-Accordion Component --- */}
            {loading ? (
                <div className="p-4 space-y-3 border rounded-lg">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            ) : (
                <StructureAccordion projects={filteredProjects} />
            )}
        </div>
    );
}

// Hada howa l-Layout dyal l-page
export default function StructurePage() {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        {/* 7iydna l-chart mn hna, khllina ghir l-content */}
                        <StructurePageContent />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}