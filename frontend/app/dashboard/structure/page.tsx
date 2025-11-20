"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { gql, useQuery } from "@apollo/client";
import { Project } from "@/lib/types";
import { StructureAccordion } from "@/components/structure-accordion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconSearch } from "@tabler/icons-react";

// --- COMPONENTS ---
import { StructureStats } from "@/components/structure-stats";
import { StructureChart } from "@/components/structure-chart";

// --- 1. USE THE EXISTING QUERY (Same as ProjectsPage) ---
const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id
        title
        object
        status: generalStatus
        preparationStatus
        projectManagers { id name }
        stages { 
          administrative { documents { id fileName fileUrl } } 
          technical { documents { id fileName fileUrl originalFileName } } 
        }
        submissionDeadline
        cautionRequestDate
        feasibilityChecks {
          administrative
          technical
          financial
        }
        caution {
          status
        }
        team {
          infographistes { id name }
          team3D { id name }
          assistants { id name }
        }
        proposalAvis {
          status
          reason
          givenBy { name }
          givenAt
        }
      }
      latestTask { id description status createdAt }
    }
  }
`;

const GET_PROJECT_MANAGERS = gql`
  query GetProjectManagers {
    users(role: "PROJECT_MANAGER") { id name }
  }
`;

function StructurePageContent() {
    const [searchTerm, setSearchTerm] = React.useState("");
    const [pmFilter, setPmFilter] = React.useState("all");

    const { data, loading, error } = useQuery(GET_PROJECTS_FEED);
    const { data: pmData, loading: loadingPMs } = useQuery(GET_PROJECT_MANAGERS);

    // --- 2. DATA MAPPING (Important: Extract project from wrapper) ---
    // The existing query returns { project: {...}, latestTask: {...} }
    // We need to map it to just get the project object.
    const allProjects = React.useMemo(() => {
        return data?.projects_feed?.map((item: any) => item.project) || [];
    }, [data]);

    // --- 3. STATS CALCULATIONS ---
    const stats = React.useMemo(() => {
        if (!allProjects.length) return { active: 0, pms: 0, creatives: 0, assistants: 0 };

        // Active = Projects In Production
        const active = allProjects.filter((p: any) => p.preparationStatus === 'IN_PRODUCTION');

        const uniquePMs = new Set();
        const uniqueCreatives = new Set();
        const uniqueAssistants = new Set();

        active.forEach((p: any) => {
            p.projectManagers?.forEach((pm: any) => uniquePMs.add(pm.id));
            p.team?.infographistes?.forEach((u: any) => uniqueCreatives.add(u.id));
            p.team?.team3D?.forEach((u: any) => uniqueCreatives.add(u.id));
            p.team?.assistants?.forEach((u: any) => uniqueAssistants.add(u.id));
        });

        return {
            active: active.length,
            pms: uniquePMs.size,
            creatives: uniqueCreatives.size,
            assistants: uniqueAssistants.size
        };
    }, [allProjects]);

    // --- 4. FILTER LOGIC ---
    const filteredProjects: Project[] = React.useMemo(() => {
        // Start with IN_PRODUCTION projects for the accordion (or all if you prefer)
        let projects = allProjects.filter(
            (p: Project) => p.preparationStatus === 'IN_PRODUCTION'
        );

        if (searchTerm) {
            projects = projects.filter((p: Project) =>
                p.object.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (pmFilter !== "all") {
            projects = projects.filter((p: Project) =>
                p.projectManagers.some((pm: any) => pm.id === pmFilter)
            );
        }

        return projects;
    }, [allProjects, searchTerm, pmFilter]);

    if (error) {
        return <p className="p-6 text-red-500">Erreur: {error.message}</p>;
    }

    return (
        // Apply the same GAP-12 layout we fixed for ProjectsPage
        <div className="flex flex-col gap-12 p-4 md:p-8 pt-6">

            {/* --- SECTION 1: CHART & STATS (Fixed Height) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
                {/* Chart Column */}
                <div className="lg:col-span-2 h-full">
                    {loading ? (
                        <Skeleton className="h-full w-full rounded-xl" />
                    ) : (
                        // This handles the missing createdAt by using ID extraction internally
                        <StructureChart data={allProjects} />
                    )}
                </div>

                {/* Stats Column */}
                <div className="lg:col-span-1 h-full">
                    {loading ? (
                        <Skeleton className="h-full w-full rounded-xl" />
                    ) : (
                        <StructureStats
                            className="h-full"
                            activeProjects={stats.active}
                            totalPMs={stats.pms}
                            totalCreatives={stats.creatives}
                            totalAssistants={stats.assistants}
                        />
                    )}
                </div>
            </div>

            {/* --- SPACER DIV (The Glue Fix) --- */}
            <div className="hidden lg:block h-8 w-full" />

            {/* --- SECTION 2: CONTENT --- */}
            <div className="w-full mt-10 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Structure des Projets</h2>
                </div>

                {/* Filters */}
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

                {/* Accordion */}
                {loading ? (
                    <div className="p-4 space-y-3 border rounded-lg">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : (
                    <StructureAccordion projects={filteredProjects} />
                )}
            </div>
        </div>
    );
}

// Layout
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