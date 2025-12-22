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
  IconBriefcase,
  IconUsers
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// --- 1. QUERY MISE À JOUR (Récupère myTasks ET allTasks) ---
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
    # Tâches de l'utilisateur connecté
    myTasks {
      id
      description
      status
      priority
      department
      dueDate
      createdAt
      assignedTo { id name }
    }
    # Toutes les tâches (Pour Admin/PM)
    allTasks {
      id
      description
      status
      priority
      department
      dueDate
      createdAt
      assignedTo { id name }
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
  const { data, loading, error } = useQuery(GET_PAGE_DATA, {
    pollInterval: 5000 // Rafraîchissement auto
  });

  const me = data?.me;
  const role = me?.role?.name;

  // --- 2. LOGIQUE DE RÔLE ---
  // Est considéré comme Manager : ADMIN, PM, DIRECTEUR
  const isManager = ['ADMIN', 'PROJECT_MANAGER', 'DIRECTOR_EVENT'].includes(role);

  // Sélection des données à afficher
  // Si Manager -> allTasks, Sinon -> myTasks
  const tasks = isManager ? (data?.allTasks || []) : (data?.myTasks || []);

  // --- 3. CALCUL DES STATS ---
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === "DONE").length;
  const pendingTasks = tasks.filter((t: any) => t.status !== "DONE").length;

  // Calcul Urgence (< 24h ou HIGH)
  const urgentTasks = tasks.filter((t: any) => {
    if (t.status === "DONE") return false;
    if (t.priority === "HIGH") return true; // Priorité haute toujours urgente
    if (!t.dueDate) return false;

    const now = new Date();
    const due = new Date(t.dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    return diffHours < 24;
  }).length;

  // Taux de complétion
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bonne après-midi";
    return "Bonsoir";
  };

  if (error) return <div className="p-8 text-center text-red-500">Erreur de chargement des données.</div>;

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
                  <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md", isManager ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-muted/50")}>
                    <IconBriefcase className="h-3 w-3" />
                    <span className="font-medium">{role || "Membre d'équipe"}</span>
                  </div>
                  <span className="hidden md:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <IconCalendar className="h-3 w-3" />
                    <span className="capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicateur de Vue (Globale vs Perso) */}
            <div className="flex items-center gap-2">
              {isManager ? (
                <span className="flex items-center gap-2 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                  <IconUsers className="w-3.5 h-3.5" /> Vue Globale (Équipe)
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs font-medium bg-muted text-muted-foreground px-3 py-1 rounded-full border">
                  <IconBriefcase className="w-3.5 h-3.5" /> Mes Tâches
                </span>
              )}
            </div>
          </div>

          {/* 2. Key Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={isManager ? "Total Tâches (Global)" : "Mes Tâches"}
              value={loading ? "-" : totalTasks}
              description={isManager ? "Toutes les tâches actives" : "Assignées à moi"}
              icon={IconChecklist}
            />

            <StatCard
              title="Priorité Haute"
              value={loading ? "-" : urgentTasks}
              description="Urgentes ou < 24h"
              icon={IconAlertCircle}
              className={urgentTasks > 0 ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10" : ""}
            />

            <StatCard
              title="Productivité"
              value={loading ? "-" : `${completionRate}%`}
              description="Taux de complétion"
              icon={IconChartPie}
              trend={<Progress value={completionRate} className="h-1.5 bg-muted" indicatorClassName="bg-emerald-600" />}
            />

            <StatCard
              title="En Cours"
              value={loading ? "-" : pendingTasks}
              description="À traiter"
              icon={IconClock}
            />
          </div>

          {/* 3. Main Data Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-1">
              {/* On passe la liste filtrée selon le rôle au composant Table */}
              {/* Assurez-vous que TasksTable accepte une prop 'data' ou modifiez-le pour utiliser les données passées */}
              <TasksTable initialData={tasks} isManager={isManager} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}