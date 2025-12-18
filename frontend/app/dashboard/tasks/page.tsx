"use client";

import * as React from "react";
import { TasksTable } from "./tasks-table";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { gql, useQuery } from "@apollo/client";
import {
  IconChecklist,
  IconClock,
  IconAlertCircle,
  IconChartPie,
  IconCalendar,
  IconBriefcase
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// --- QUERY ---
const GET_PAGE_DATA = gql`
  query GetPageData {
    me {
      id
      name
      email
      role {
        name
      }
    }
    myTasks {
      id
      status
      dueDate
    }
  }
`;

// --- STAT CARD COMPONENT ---
function StatCard({ title, value, icon: Icon, description, className, trend }: any) {
  return (
    <Card className={cn("shadow-sm bg-card text-card-foreground border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground opacity-70" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {trend && <div className="mt-3">{trend}</div>}
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const { data, loading, error } = useQuery(GET_PAGE_DATA);

  const me = data?.me;
  const tasks = data?.myTasks || [];

  // Logic for Statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === "DONE").length;
  const pendingTasks = tasks.filter((t: any) => t.status === "TODO" || t.status === "IN_PROGRESS").length;

  // Logic for "Urgent" (Due in < 24h)
  const urgentTasks = tasks.filter((t: any) => {
    if (!t.dueDate || t.status === "DONE") return false;
    const diffTime = new Date(t.dueDate).getTime() - new Date().getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays < 1;
  }).length;

  // Completion Rate
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bonne après-midi";
    return "Bonsoir";
  };

  if (error) return <div className="p-8 text-center text-destructive">Erreur de chargement des données.</div>;

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-muted/10 dark:bg-background">
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full space-y-6">

          {/* 1. Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
            <div className="flex items-center gap-4">
              {loading ? (
                <Skeleton className="h-14 w-14 rounded-full" />
              ) : (
                <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${me?.name}`} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                    {me?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {loading ? <Skeleton className="h-6 w-40" /> : `${getGreeting()}, ${me?.name}`}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                    <IconBriefcase className="h-3 w-3" />
                    <span className="font-medium">{me?.role?.name || "Membre d'équipe"}</span>
                  </div>
                  <span className="hidden md:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <IconCalendar className="h-3 w-3" />
                    <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Key Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Assigné"
              value={loading ? "-" : totalTasks}
              description="Tâches totales"
              icon={IconChecklist}
            />
            <StatCard
              title="Urgence (24h)"
              value={loading ? "-" : urgentTasks}
              description="Nécessite attention immédiate"
              icon={IconAlertCircle}
              className={urgentTasks > 0 ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10" : ""}
            />
            <StatCard
              title="Productivité"
              value={loading ? "-" : `${completionRate}%`}
              description="Taux d'achèvement"
              icon={IconChartPie}
              trend={<Progress value={completionRate} className="h-1.5 bg-muted" indicatorClassName="bg-emerald-600" />}
            />
            <StatCard
              title="En attente"
              value={loading ? "-" : pendingTasks}
              description="À faire ou en cours"
              icon={IconClock}
            />
          </div>

          {/* 3. Main Data Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-1">
              <TasksTable />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}