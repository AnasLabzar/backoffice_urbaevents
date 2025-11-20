"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { gql, useQuery } from "@apollo/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconBriefcase, IconActivity, IconCoin, IconAlertTriangle } from "@tabler/icons-react";

// Components
import { FinancialAnalytics } from "@/components/analytics/financial-analytics";
import { StatusAnalytics } from "@/components/analytics/status-analytics";
import { TeamAnalytics } from "@/components/analytics/team-analytics";
import { Button } from "@/components/ui/button";

const GET_ANALYTICS_DATA = gql`
  query GetAnalyticsData {
    projects_feed {
      project {
        id
        title
        projectType
        preparationStatus
        generalStatus
        estimatedBudget
        cautionAmount
        projectManagers { name }
      }
    }
  }
`;

export default function AnalyticsPage() {
    const { data, loading, error } = useQuery(GET_ANALYTICS_DATA);
    const projects = React.useMemo(() => data?.projects_feed?.map((i: any) => i.project) || [], [data]);

    const summary = React.useMemo(() => {
        const total = projects.length;
        const active = projects.filter((p: any) => p.preparationStatus === 'IN_PRODUCTION').length;
        const budget = projects.reduce((acc: number, p: any) => acc + (p.estimatedBudget || 0), 0);
        const caution = projects.reduce((acc: number, p: any) => acc + (p.cautionAmount || 0), 0);
        return { total, active, budget, caution };
    }, [projects]);

    if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

    return (
        <SidebarProvider
            style={{ "--sidebar-width": "18rem", "--header-height": "3rem" } as React.CSSProperties}
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col p-6 bg-muted/5 min-h-screen space-y-8">

                    {/* --- TITLE --- */}
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Tableau de Bord</h2>
                        <p className="text-muted-foreground">Vue d'ensemble des performances</p>
                    </div>

                    {/* --- ROW 1: KPI CARDS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard
                            title="Total Projets"
                            value={summary.total}
                            icon={IconBriefcase}
                            trend="+2"
                            color="blue"
                        />
                        <KpiCard
                            title="En Production"
                            value={summary.active}
                            icon={IconActivity}
                            trend="Stable"
                            color="emerald"
                        />
                        <KpiCard
                            title="Volume Budget"
                            value={`${(summary.budget / 1000000).toFixed(2)}M`}
                            unit="Dhs"
                            icon={IconCoin}
                            trend="+15%"
                            color="amber"
                        />
                        <KpiCard
                            title="Cautions"
                            value={`${(summary.caution / 1000).toFixed(0)}K`}
                            unit="Dhs"
                            icon={IconAlertTriangle}
                            trend="-5%"
                            color="rose"
                        />
                    </div>

                    {loading ? (
                        <Skeleton className="w-full h-96 rounded-xl" />
                    ) : (
                        <>
                            {/* --- ROW 2: FINANCIAL & STATUS (8/4) --- */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[420px]">
                                <div className="lg:col-span-8 h-full">
                                    <FinancialAnalytics projects={projects} />
                                </div>
                                <div className="lg:col-span-4 h-full">
                                    <StatusAnalytics projects={projects} />
                                </div>
                            </div>

                            {/* --- ROW 3: TEAM & METRICS (6/6) --- */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[380px]">
                                <div className="lg:col-span-6 h-full">
                                    <TeamAnalytics projects={projects} />
                                </div>
                                <div className="lg:col-span-6 h-full">
                                    <QuickStatsCard summary={summary} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

// Professional KPI Card
function KpiCard({ title, value, unit, icon: Icon, trend, color }: any) {
    const colorClasses: any = {
        blue: "text-blue-500 bg-blue-500/10",
        emerald: "text-emerald-500 bg-emerald-500/10",
        amber: "text-amber-500 bg-amber-500/10",
        rose: "text-rose-500 bg-rose-500/10",
    };

    return (
        <Card className="shadow-sm border-border/50 bg-card/50 relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-1">
                    <div className="text-2xl font-bold">{value}</div>
                    {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    <span className={trend.includes('+') ? 'text-emerald-500' : ''}>{trend}</span> vs dernier mois
                </p>
            </CardContent>
        </Card>
    )
}

// Placeholder turned into useful "Quick Stats" text card
function QuickStatsCard({ summary }: any) {
    const efficiency = summary.total > 0 ? Math.round((summary.active / summary.total) * 100) : 0;
    const avgBudget = summary.total > 0 ? (summary.budget / summary.total / 1000000).toFixed(2) : 0;

    return (
        <Card className="h-full flex flex-col shadow-sm border-border/50 bg-card/50">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Métriques Clés</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 h-full content-center pb-8">
                <div className="space-y-1 p-4 rounded-lg bg-muted/30 border border-border/40">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Efficacité Prod.</p>
                    <p className="text-2xl font-bold text-foreground">{efficiency}%</p>
                    <p className="text-xs text-muted-foreground">Projets actifs / total</p>
                </div>
                <div className="space-y-1 p-4 rounded-lg bg-muted/30 border border-border/40">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Budget Moyen</p>
                    <p className="text-2xl font-bold text-foreground">{avgBudget}M</p>
                    <p className="text-xs text-muted-foreground">Par projet</p>
                </div>
                <div className="space-y-1 p-4 rounded-lg bg-muted/30 border border-border/40">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Taux Caution</p>
                    <p className="text-2xl font-bold text-foreground">~1.5%</p>
                    <p className="text-xs text-muted-foreground">Moyenne du marché</p>
                </div>
                <div className="space-y-1 p-4 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-center">
                    <Button variant="outline" className="w-full">Voir Rapports Complets</Button>
                </div>
            </CardContent>
        </Card>
    )
}