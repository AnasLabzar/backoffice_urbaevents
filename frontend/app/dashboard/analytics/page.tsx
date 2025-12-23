"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { gql, useQuery } from "@apollo/client";
import {
    IconBriefcase, IconActivity, IconCoin, IconAlertTriangle,
    IconChecklist, IconDownload, IconTrendingUp, IconTrendingDown, IconTableExport
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { startOfMonth, subMonths, isSameMonth, parseISO } from "date-fns";
import { toast } from "sonner"; // Assure-toi d'avoir sonner ou ton toast habituel

// Analytics Components
import { FinancialAnalytics } from "@/components/analytics/financial-analytics";
import { StatusAnalytics } from "@/components/analytics/status-analytics";
import { TeamAnalytics } from "@/components/analytics/team-analytics";
import { TaskPriorityAnalytics } from "@/components/analytics/task-priority-analytics";
import { ProjectTrendAnalytics } from "@/components/analytics/project-trend-analytics";
import { RecentActivityFeed } from "@/components/analytics/recent-activity-feed";

// --- GRAPHQL QUERY ---
const GET_FULL_ANALYTICS_DATA = gql`
  query GetFullAnalyticsData {
    projects_feed {
      project {
        id
        title
        projectCode
        projectType
        preparationStatus
        generalStatus
        marketEstimate
        estimatedBudget
        cautionAmount
        submissionDeadline
        createdAt
        updatedAt
        projectManagers { id name }
      }
    }
    allTasks {
        id
        status
        priority
        department
        dueDate
        createdAt
        updatedAt
    }
  }
`;

export default function AnalyticsPage() {
    const { data, loading, error } = useQuery(GET_FULL_ANALYTICS_DATA, {
        pollInterval: 30000,
        fetchPolicy: "cache-and-network"
    });

    const projects = React.useMemo(() => data?.projects_feed?.map((i: any) => i.project) || [], [data]);
    const tasks = React.useMemo(() => data?.allTasks || [], [data]);

    // --- CALCUL DES KPI & TENDANCES ---
    const stats = React.useMemo(() => {
        const now = new Date();
        const lastMonth = subMonths(now, 1);

        // 1. Projets Actifs
        const total = projects.length;
        const active = projects.filter((p: any) => p.generalStatus === 'IN_PROGRESS').length;

        // Calcul Trend Projets
        const projectsThisMonth = projects.filter((p: any) => p.createdAt && isSameMonth(parseISO(p.createdAt), now)).length;
        const projectsLastMonth = projects.filter((p: any) => p.createdAt && isSameMonth(parseISO(p.createdAt), lastMonth)).length;
        const projectTrend = projectsLastMonth === 0 ? 100 : Math.round(((projectsThisMonth - projectsLastMonth) / projectsLastMonth) * 100);

        // 2. Finances
        const totalBudget = projects.reduce((acc: number, p: any) => acc + (p.estimatedBudget || 0), 0);
        const budgetThisMonth = projects.filter((p: any) => p.createdAt && isSameMonth(parseISO(p.createdAt), now))
            .reduce((acc: number, p: any) => acc + (p.estimatedBudget || 0), 0);
        const budgetLastMonth = projects.filter((p: any) => p.createdAt && isSameMonth(parseISO(p.createdAt), lastMonth))
            .reduce((acc: number, p: any) => acc + (p.estimatedBudget || 0), 0);
        const budgetTrend = budgetLastMonth === 0 ? 100 : Math.round(((budgetThisMonth - budgetLastMonth) / budgetLastMonth) * 100);

        // 3. Tâches
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const doneThisMonth = tasks.filter((t: any) => t.status === 'DONE' && t.updatedAt && isSameMonth(parseISO(t.updatedAt), now)).length;
        const doneLastMonth = tasks.filter((t: any) => t.status === 'DONE' && t.updatedAt && isSameMonth(parseISO(t.updatedAt), lastMonth)).length;
        const productivityTrend = doneLastMonth === 0 ? 100 : Math.round(((doneThisMonth - doneLastMonth) / doneLastMonth) * 100);

        // 4. Alertes
        const overdueTasks = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE').length;
        const highPriorityTasks = tasks.filter((t: any) => t.priority === 'HIGH' && t.status !== 'DONE').length;
        const cautionPending = projects.filter((p: any) => p.preparationStatus === 'CAUTION_PENDING').length;

        return {
            active, total, projectTrend,
            totalBudget, budgetTrend,
            completionRate, productivityTrend,
            overdueTasks, highPriorityTasks, cautionPending
        };
    }, [projects, tasks]);

    // --- FONCTION D'EXPORTATION ---
    const handleExport = () => {
        if (!projects.length) {
            toast.error("Aucune donnée à exporter");
            return;
        }

        try {
            // Création des en-têtes et des lignes
            const headers = ["Code", "Projet", "Type", "Statut", "Budget Estimé", "Caution", "Date Création"];
            const rows = projects.map((p: any) => [
                p.projectCode,
                `"${p.title.replace(/"/g, '""')}"`, // Échapper les guillemets pour CSV
                p.projectType,
                p.preparationStatus,
                p.estimatedBudget || 0,
                p.cautionAmount || 0,
                p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"
            ]);

            // Assemblage du CSV
            const csvContent = [
                headers.join(","),
                ...rows.map((r: any) => r.join(","))
            ].join("\n");

            // Création du Blob et téléchargement
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Export CSV généré avec succès !");
        } catch (err) {
            console.error("Erreur export:", err);
            toast.error("Erreur lors de l'exportation");
        }
    };

    if (error) return <div className="p-8 text-destructive bg-destructive/10 rounded-lg m-4">Error: {error.message}</div>;

    return (
        <SidebarProvider style={{ "--sidebar-width": "18rem" } as React.CSSProperties}>
            <AppSidebar variant="inset" />
            <SidebarInset className="bg-[#FAFAFA] dark:bg-[#09090b]">
                <SiteHeader />
                <div className="flex flex-1 flex-col p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">

                    {/* --- HEADER PROFESSIONNEL --- */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                                Tableau de Bord
                                <div className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-background"></span>
                                </div>
                            </h2>
                            <p className="text-muted-foreground text-sm font-medium">
                                Performance globale et suivi opérationnel
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {/* LIVE INDICATOR BADGE */}
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-sm">
                                <IconActivity className="w-3.5 h-3.5 animate-pulse" />
                                Données en temps réel
                            </div>

                            {/* BOUTON EXPORTER */}
                            <Button
                                onClick={handleExport}
                                variant="outline"
                                className="ml-auto md:ml-0 gap-2 h-10 border-border/60 hover:bg-muted/50 hover:border-border transition-all shadow-sm active:scale-95"
                            >
                                <IconTableExport className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">Exporter</span>
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <DashboardSkeleton />
                    ) : (
                        <Tabs defaultValue="overview" className="space-y-8">

                            {/* --- TABS NAVIGATION PREMIUM --- */}
                            <div className="border-b border-border/40 pb-px">
                                <TabsList className="h-12 bg-transparent p-0 gap-6 justify-start w-full overflow-x-auto no-scrollbar">
                                    <CustomTabTrigger value="overview" icon={IconActivity} label="Vue Générale" />
                                    <CustomTabTrigger value="production" icon={IconChecklist} label="Production" />
                                    <CustomTabTrigger value="financial" icon={IconCoin} label="Finances" />
                                </TabsList>
                            </div>

                            <TabsContent value="overview" className="space-y-8 pt-2">

                                {/* --- KPI GRID --- */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <KpiCard
                                        title="Projets Actifs"
                                        value={stats.active}
                                        icon={IconBriefcase}
                                        intent="primary"
                                        trend={stats.projectTrend}
                                        trendLabel="vs mois dernier"
                                        footerText={`${stats.total} projets au total`}
                                    />
                                    <KpiCard
                                        title="Volume d'Affaires"
                                        value={`${(stats.totalBudget / 1000000).toFixed(2)}M`}
                                        unit="Dhs"
                                        icon={IconCoin}
                                        intent="success"
                                        trend={stats.budgetTrend}
                                        trendLabel="croissance vol."
                                        footerText="Budget Client cumulé"
                                    />
                                    <KpiCard
                                        title="Productivité"
                                        value={`${stats.completionRate}%`}
                                        icon={IconChecklist}
                                        intent="info"
                                        trend={stats.productivityTrend}
                                        trendLabel="tâches finies"
                                        progress={stats.completionRate}
                                    />
                                    <KpiCard
                                        title="Points d'Attention"
                                        value={stats.overdueTasks}
                                        icon={IconAlertTriangle}
                                        intent={stats.overdueTasks > 0 ? "danger" : "success"}
                                        footerText={`${stats.highPriorityTasks} Urgences • ${stats.cautionPending} Cautions`}
                                        isAlert={stats.overdueTasks > 0}
                                    />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                                    <div className="lg:col-span-4 h-[420px]">
                                        <ProjectTrendAnalytics projects={projects} />
                                    </div>
                                    <div className="lg:col-span-3 h-[420px]">
                                        <StatusAnalytics projects={projects} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2">
                                        <FinancialAnalytics projects={projects} />
                                    </div>
                                    <div className="lg:col-span-1">
                                        <RecentActivityFeed tasks={tasks} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="production" className="space-y-6 pt-2">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <TaskPriorityAnalytics tasks={tasks} />
                                    <TeamAnalytics projects={projects} tasks={tasks} />
                                </div>
                                <RecentActivityFeed tasks={tasks} detailed />
                            </TabsContent>

                            <TabsContent value="financial" className="space-y-6 pt-2">
                                <FinancialAnalytics projects={projects} detailed />
                            </TabsContent>

                        </Tabs>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

// --- CUSTOM TAB TRIGGER ---
function CustomTabTrigger({ value, icon: Icon, label }: any) {
    return (
        <TabsTrigger
            value={value}
            className="group relative rounded-none focus-none border-none border-transparent bg-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary hover:text-foreground data-[state=active]:shadow-none"
        >
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 group-data-[state=active]:text-primary" />
                <span>{label}</span>
            </div>
        </TabsTrigger>
    );
}

// --- KPI CARD ---
function KpiCard({
    title, value, unit, icon: Icon, intent, trend, trendLabel, progress, footerText, isAlert
}: any) {

    const theme: any = {
        primary: {
            border: "border-border",
            iconBg: "bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400",
            bar: "bg-blue-600"
        },
        success: {
            border: "border-border",
            iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400",
            bar: "bg-emerald-600"
        },
        info: {
            border: "border-border",
            iconBg: "bg-violet-500/10", iconColor: "text-violet-600 dark:text-violet-400",
            bar: "bg-violet-600"
        },
        danger: {
            border: "border-rose-200 dark:border-rose-900",
            iconBg: "bg-rose-500/10", iconColor: "text-rose-600 dark:text-rose-400",
            bar: "bg-rose-600"
        },
    };

    const style = theme[intent] || theme.primary;
    const isPositive = trend >= 0;

    return (
        <Card className={`relative overflow-hidden transition-all hover:shadow-lg bg-card ${style.border}`}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${style.iconBg} ${style.iconColor} transition-colors`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border 
                            ${isPositive
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                            }`}
                        >
                            {isPositive ? <IconTrendingUp className="w-3.5 h-3.5" /> : <IconTrendingDown className="w-3.5 h-3.5" />}
                            <span>{Math.abs(trend)}%</span>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
                        {unit && <span className="text-sm font-semibold text-muted-foreground">{unit}</span>}
                    </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border/50">
                    {progress !== undefined ? (
                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                <span>Progression</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5" indicatorClassName={style.bar} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            {trendLabel && <span>{trendLabel}</span>}
                            {footerText && <span className="font-medium text-foreground/80">{footerText}</span>}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-3 gap-6">
                <Skeleton className="h-[420px] col-span-2 rounded-xl" />
                <Skeleton className="h-[420px] rounded-xl" />
            </div>
        </div>
    )
}