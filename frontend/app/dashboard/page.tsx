"use client";

import React, { useState } from "react"; // 1. Import useState
import { gql, useQuery } from "@apollo/client";
import { ColumnFiltersState } from "@tanstack/react-table"; // 2. Import Type

import { columns } from "@/components/data-table";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ProjectsStats } from "@/components/projects-stats";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function ProjectsPage() {
  const { data, loading, error } = useQuery(GET_PROJECTS_FEED);

  // 3. Add State for Column Filters
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const rawData = data?.projects_feed || [];
  const tableData = rawData;
  const projectsOnly = rawData.map((item: any) => item.project);

  const stats = {
    total: projectsOnly.length,
    inProgress: projectsOnly.filter((p: any) => p.preparationStatus === 'IN_PRODUCTION' || p.preparationStatus === 'TO_PREPARE').length,
    completed: projectsOnly.filter((p: any) => p.preparationStatus === 'DONE').length,
    pending: projectsOnly.filter((p: any) => ['TO_CONFIRM', 'FEASIBILITY_PENDING', 'CAUTION_PENDING'].includes(p.preparationStatus)).length,
  };

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

              {/* --- SECTION 1: CHART & STATS --- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
                <div className="lg:col-span-2 h-full">
                  {loading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                  ) : (
                    <ChartAreaInteractive projects={projectsOnly} />
                  )}
                </div>

                <div className="lg:col-span-1 h-full">
                  {loading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                  ) : (
                    <ProjectsStats
                      className="h-full"
                      total={stats.total}
                      inProgress={stats.inProgress}
                      completed={stats.completed}
                      pending={stats.pending}
                    />
                  )}
                </div>
              </div>

              <div className="hidden lg:block h-8 w-full" />

              {/* --- SECTION 2: TABLE --- */}
              <div className="w-full mt-8 ">
                <h2 className="text-xl font-semibold mb-4 px-1">Liste des Projets</h2>
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : error ? (
                  <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">Error: {error.message}</div>
                ) : (
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden py-8">
                    {/* 4. Pass the props to DataTable */}
                    <DataTable
                      columns={columns}
                      data={tableData}
                      columnFilters={columnFilters}
                      onColumnFiltersChange={setColumnFilters}
                    />
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}