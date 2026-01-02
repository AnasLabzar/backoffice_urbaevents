"use client";

import React, { useState, useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { ColumnFiltersState } from "@tanstack/react-table";

import { columns } from "@/components/projects/table/columns";
import { DataTable } from "@/components/projects/table/data-table";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ProjectsStats } from "@/components/projects-stats";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconBriefcase,
  IconCoin,
  IconActivity,
  IconClock,
  IconAlertTriangle,
  IconChecklist,
  IconArrowUpRight,
  IconPercentage
} from "@tabler/icons-react";
import { ME_QUERY } from "@/lib/graphql/projects";

const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id
        title
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
        <div className="flex-1 bg-muted/10 min-h-screen p-4 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl flex flex-col gap-8">

            {/* --- 📊 SECTION KPI CARDS --- */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

              <Card className="hover:shadow-md transition-all duration-200 border-border/60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground truncate">Total Projets</CardTitle>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <IconBriefcase className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-20" /> : (
                    <div className="flex flex-col gap-1">
                      <div className="text-2xl font-bold tracking-tight truncate">{stats.total}</div>
                      <div className="flex items-center text-xs text-muted-foreground truncate">
                        <IconPercentage className="h-3 w-3 mr-1 shrink-0" />
                        <span className="text-green-600 font-medium mr-1">{stats.completionRate}%</span>
                        <span className="truncate">complétion</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {canSeeFinancials ? (
                <Card className="hover:shadow-md transition-all duration-200 border-border/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground truncate">Pipeline Financier</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <IconCoin className="h-4 w-4 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-32" /> : (
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="text-2xl font-bold tracking-tight text-foreground truncate" title={formatCurrency(stats.totalBudget)}>
                          {formatCurrency(stats.totalBudget)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center">
                          <span className="shrink-0 mr-1">Moyenne:</span>
                          <span className="font-medium text-foreground truncate">{formatCurrency(stats.averageBudget)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="hover:shadow-md transition-all duration-200 border-border/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground truncate">Urgences (J-3)</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <IconAlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : (
                      <div className="flex flex-col gap-1">
                        <div className="text-2xl font-bold tracking-tight text-foreground truncate">{stats.urgentDeadlines}</div>
                        <div className="flex items-center text-xs text-muted-foreground truncate">
                          <span className={`${stats.urgencyRate > 20 ? 'text-red-600' : 'text-orange-500'} font-medium mr-1`}>
                            {stats.urgencyRate}%
                          </span>
                          <span className="truncate">actifs urgents</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="hover:shadow-md transition-all duration-200 border-border/60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground truncate">En Production</CardTitle>
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <IconActivity className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-20" /> : (
                    <div className="flex flex-col gap-1">
                      <div className="text-2xl font-bold tracking-tight truncate">{stats.inProgress}</div>
                      <div className="flex items-center text-xs text-muted-foreground truncate">
                        <IconArrowUpRight className="h-3 w-3 text-blue-500 mr-1 shrink-0" />
                        <span className="truncate">Projets actifs</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {userRole === 'FINANCE' ? (
                <Card className="hover:shadow-md transition-all duration-200 border-border/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground truncate">Cautions à Valider</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <IconChecklist className="h-4 w-4 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : (
                      <div className="flex flex-col gap-1">
                        <div className="text-2xl font-bold tracking-tight text-foreground truncate">{stats.pendingCautions}</div>
                        <p className="text-xs text-muted-foreground truncate">Demandes en attente</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="hover:shadow-md transition-all duration-200 border-border/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground truncate">Projets Terminés</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <IconClock className="h-4 w-4 text-slate-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : (
                      <div className="flex flex-col gap-1">
                        <div className="text-2xl font-bold tracking-tight truncate">{stats.completed}</div>
                        <p className="text-xs text-muted-foreground truncate">Historique archivé</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* --- 📈 CHART SECTION (Responsive Grid) --- */}
            {/* ✅ FIX: 'min-h-[300px]' pour forcer une hauteur minimale sur mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
              <div className="lg:col-span-2 min-h-[350px] w-full">
                {isLoading ? (
                  <Skeleton className="h-full w-full rounded-xl" />
                ) : (
                  <ChartAreaInteractive projects={projectsOnly} />
                )}
              </div>

              <div className="lg:col-span-1 min-h-[350px] w-full">
                {isLoading ? (
                  <Skeleton className="h-full w-full rounded-xl" />
                ) : (
                  <ProjectsStats
                    className="h-full w-full"
                    total={stats.total}
                    inProgress={stats.inProgress}
                    completed={stats.completed}
                    pending={tableData.length - stats.inProgress - stats.completed}
                  />
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