"use client";

import React, { useState, useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { ColumnFiltersState } from "@tanstack/react-table";

import { columns } from "@/components/projects/table/columns";
import { DataTable } from "@/components/projects/table/data-table";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ProjectsStats } from "@/components/projects-stats";
import { PhasePipeline } from "@/components/dashboard/phase-pipeline";
import { UrgentDeadlines } from "@/components/dashboard/urgent-deadlines";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconArrowUpRight,
  IconPercentage
} from "@tabler/icons-react";
import { ME_QUERY } from "@/lib/graphql/projects";
import { AnimatedKPICards } from "@/components/dashboard/animated-kpi-cards";

const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id
        title
        clientName
        eventDate
        budgetTarget
        currentPhase
        object
        status: generalStatus
        preparationStatus
        marketEstimate
        estimatedBudget
        cautionAmount
        projectManagers { id name }
        stages { 
          administrative { documents { id fileName fileUrl } }
          technical { documents { id fileName fileUrl originalFileName } }
        }
        submissionDeadline
        milestones { code status }
        cautionRequestDate
        feasibilityChecks { administrative technical financial }
        caution { status }
        team {
          infographistes { id name }
          team3D { id name }
          coordinators { id name }
        }
        proposalAvis { status reason givenBy { name } givenAt }
      }
      latestTask { id description status createdAt }
    }
  }
`;

export default function ProjectsPage() {
  const { data: userData, loading: userLoading } = useQuery(ME_QUERY);
  const { data: projectsData, loading: projectsLoading, error } = useQuery(GET_PROJECTS_FEED);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const userRole = userData?.me?.role?.name || "GUEST";
  const isLoading = userLoading || projectsLoading;

  const { tableData, stats, projectsOnly } = useMemo(() => {
    const rawData = projectsData?.projects_feed || [];
    const _projectsOnly = rawData.map((item: any) => item.project);

    const total = _projectsOnly.length;
    const inProgress = _projectsOnly.filter((p: any) => ['IN_PRODUCTION', 'TO_PREPARE'].includes(p.preparationStatus)).length;
    const completed = _projectsOnly.filter((p: any) => p.preparationStatus === 'DONE').length;
    const activePipeline = total - completed;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalBudget = _projectsOnly.reduce((acc: number, curr: any) => acc + (curr.estimatedBudget || 0), 0);
    const averageBudget = total > 0 ? totalBudget / total : 0;

    const urgentDeadlines = _projectsOnly.filter((p: any) => {
      if (!p.submissionDeadline) return false;
      const days = Math.ceil((new Date(p.submissionDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 3;
    }).length;
    const urgencyRate = activePipeline > 0 ? Math.round((urgentDeadlines / activePipeline) * 100) : 0;

    const pendingCautions = _projectsOnly.filter((p: any) => p.caution?.status === 'REQUESTED').length;

    return {
      tableData: rawData,
      projectsOnly: _projectsOnly,
      stats: {
        total, inProgress, completed, totalBudget,
        averageBudget, urgentDeadlines, urgencyRate,
        completionRate, pendingCautions
      }
    };
  }, [projectsData]);

  const canSeeFinancials = ['ADMIN', 'PROPOSAL_MANAGER', 'FINANCE'].includes(userRole);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(amount);
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

        {/* ✅ FIX: Utilisation de 'block' au lieu de 'flex' pour permettre le scroll naturel */}
        <div className="flex-1 min-h-screen p-4 md:p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100 via-background to-muted/20 dark:from-slate-900 dark:via-background dark:to-muted/10">
          <div className="mx-auto max-w-[1400px] flex flex-col gap-6">

            {/* --- 🚀 PIPELINE PHASE (NEW) --- */}
            <PhasePipeline projects={projectsOnly} />

            {/* --- 📊 SECTION KPI CARDS (ANIMATED) --- */}
            <AnimatedKPICards 
              stats={stats} 
              isLoading={isLoading} 
              canSeeFinancials={canSeeFinancials} 
              userRole={userRole} 
            />

            {/* --- 📈 CHART SECTION (Responsive Bento Grid) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
              <div className="lg:col-span-2 min-h-[400px] w-full flex flex-col gap-6">
                {isLoading ? (
                  <Skeleton className="h-full w-full rounded-xl" />
                ) : (
                  <ChartAreaInteractive projects={projectsOnly} />
                )}
              </div>

              <div className="lg:col-span-1 flex flex-col gap-6 w-full">
                {isLoading ? (
                  <>
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                  </>
                ) : (
                  <>
                    <div className="h-[300px]">
                      <UrgentDeadlines projects={projectsOnly} />
                    </div>
                    <div className="h-[400px]">
                      <ActivityFeed feedData={tableData} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* --- 📋 TABLE SECTION --- */}
            {/* ✅ FIX: Separé avec mt-8 et overflow-hidden pour éviter le clash */}
            <div className="w-full flex flex-col gap-4 mt-4">
              <h2 className="text-xl font-semibold px-1">Liste des Projets</h2>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : error ? (
                <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">Error: {error.message}</div>
              ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden w-full">
                  {/* Le Scroll horizontal est géré dans le composant DataTable, mais on sécurise le container */}
                  <div className="w-full overflow-x-auto">
                    <DataTable
                      columns={columns}
                      data={tableData}
                      columnFilters={columnFilters}
                      onColumnFiltersChange={setColumnFilters}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}