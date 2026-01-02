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

// --- GRAPHQL QUERY ---
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

  // --- 🧠 CALCULS INTELLIGENTS & DYNAMIQUES ---
  const { tableData, stats, projectsOnly } = useMemo(() => {
    const rawData = projectsData?.projects_feed || [];
    const _projectsOnly = rawData.map((item: any) => item.project);

    // 1. Totaux
    const total = _projectsOnly.length;
    const inProgress = _projectsOnly.filter((p: any) => ['IN_PRODUCTION', 'TO_PREPARE'].includes(p.preparationStatus)).length;
    const completed = _projectsOnly.filter((p: any) => p.preparationStatus === 'DONE').length;
    const activePipeline = total - completed; // Projets non terminés

    // 2. Pourcentages
    // Taux de réussite (Projets finis / Total)
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 3. Finances
    const totalBudget = _projectsOnly.reduce((acc: number, curr: any) => acc + (curr.estimatedBudget || 0), 0);
    const averageBudget = total > 0 ? totalBudget / total : 0;

    // 4. Urgences (Deadline < 3 jours)
    const urgentDeadlines = _projectsOnly.filter((p: any) => {
      if (!p.submissionDeadline) return false;
      const days = Math.ceil((new Date(p.submissionDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 3;
    }).length;
    // Taux d'urgence (Combien de projets actifs sont urgents ?)
    const urgencyRate = activePipeline > 0 ? Math.round((urgentDeadlines / activePipeline) * 100) : 0;

    // 5. Cautions (Pour Finance)
    const pendingCautions = _projectsOnly.filter((p: any) => p.caution?.status === 'REQUESTED').length;

    return {
      tableData: rawData,
      projectsOnly: _projectsOnly, // ✅ Variable exposée pour éviter le ReferenceError
      stats: {
        total, inProgress, completed, totalBudget,
        averageBudget, urgentDeadlines, urgencyRate,
        completionRate, pendingCautions
      }
    };
  }, [projectsData]);

  // Logic de Permissions
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
        <div className="flex flex-1 flex-col bg-muted/10 min-h-screen">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-8 py-6 px-4 lg:px-8">

              {/* --- 📊 SECTION KPI CARDS (CLEAN DESIGN) --- */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* CARD 1: GLOBAL (Avec Taux de Complétion) */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Projets</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <IconBriefcase className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : (
                      <>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <IconPercentage className="h-3 w-3 mr-1" />
                          <span className="text-green-600 font-medium mr-1">{stats.completionRate}%</span>
                          <span className="text-muted-foreground">taux de complétion</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* CARD 2: DYNAMIC (Budget OU Urgences) */}
                {canSeeFinancials ? (
                  // VERSION FINANCE : Budget Global + Moyenne
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pipeline Financier</CardTitle>
                      <div className="p-2 bg-green-100 rounded-full">
                        <IconCoin className="h-4 w-4 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? <Skeleton className="h-8 w-32" /> : (
                        <>
                          <div className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Moyenne: <span className="font-medium text-foreground">{formatCurrency(stats.averageBudget)}</span> /projet
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  // VERSION TECHNIQUE : Urgences + Pourcentage
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Urgences (J-3)</CardTitle>
                      <div className="p-2 bg-red-100 rounded-full">
                        <IconAlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? <Skeleton className="h-8 w-20" /> : (
                        <>
                          <div className="text-2xl font-bold">{stats.urgentDeadlines}</div>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <span className={`${stats.urgencyRate > 20 ? 'text-red-600' : 'text-orange-500'} font-medium mr-1`}>
                              {stats.urgencyRate}%
                            </span>
                            <span>des projets actifs sont urgents</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* CARD 3: PRODUCTION */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">En Production</CardTitle>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <IconActivity className="h-4 w-4 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : (
                      <>
                        <div className="text-2xl font-bold">{stats.inProgress}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <IconArrowUpRight className="h-3 w-3 text-blue-500 mr-1" />
                          <span>Projets actifs en cours</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* CARD 4: DYNAMIC (Action Requise) */}
                {userRole === 'FINANCE' ? (
                  // SPECIALE FINANCE
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cautions à Valider</CardTitle>
                      <div className="p-2 bg-purple-100 rounded-full">
                        <IconChecklist className="h-4 w-4 text-purple-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? <Skeleton className="h-8 w-20" /> : (
                        <>
                          <div className="text-2xl font-bold">{stats.pendingCautions}</div>
                          <p className="text-xs text-muted-foreground mt-1">Demandes en attente</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  // DEFAUT
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Projets Terminés</CardTitle>
                      <div className="p-2 bg-slate-100 rounded-full">
                        <IconClock className="h-4 w-4 text-slate-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? <Skeleton className="h-8 w-20" /> : (
                        <>
                          <div className="text-2xl font-bold">{stats.completed}</div>
                          <p className="text-xs text-muted-foreground mt-1">Historique archivé</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* --- FIN SECTION KPI --- */}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
                <div className="lg:col-span-2 h-full">
                  {isLoading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                  ) : (
                    // ✅ UTILISATION DE 'projectsOnly' (Fix ReferenceError)
                    <ChartAreaInteractive projects={projectsOnly} />
                  )}
                </div>

                <div className="lg:col-span-1 h-full">
                  {isLoading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                  ) : (
                    <ProjectsStats
                      className="h-full"
                      total={stats.total}
                      inProgress={stats.inProgress}
                      completed={stats.completed}
                      pending={tableData.length - stats.inProgress - stats.completed}
                    />
                  )}
                </div>
              </div>

              <div className="w-full mt-32">
                <h2 className="text-xl font-semibold mb-4 px-1">Liste des Projets</h2>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : error ? (
                  <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">Error: {error.message}</div>
                ) : (
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden py-8">
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