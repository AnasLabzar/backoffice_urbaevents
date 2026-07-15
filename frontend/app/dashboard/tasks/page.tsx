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
import { motion, AnimatePresence } from "framer-motion";

// --- 1. QUERY MISE À JOUR (COMPLÈTE POUR LE TABLEAU) ---
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
      updatedAt
      assignedTo { id name email }
      project { id object title }   # ✅ Ajouté pour le tableau
      v1Uploads { id fileUrl originalFileName } # ✅ Ajouté
      finalUpload { id fileUrl originalFileName } # ✅ Ajouté
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
      updatedAt
      assignedTo { id name email }
      project { id object title }   # ✅ Ajouté pour le tableau
      v1Uploads { id fileUrl originalFileName } # ✅ Ajouté
      finalUpload { id fileUrl originalFileName } # ✅ Ajouté
    }
  }
`;

// --- STAT CARD COMPONENT ---
function StatCard({ title, value, icon: Icon, description, className, trend }: any) {
  return (
    <Card className={cn("shadow-sm bg-card/40 backdrop-blur-xl border-border/40 hover:border-primary/40 hover:shadow-lg transition-all duration-300 relative overflow-hidden group", className)}>
      <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-bold text-muted-foreground tracking-tight">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-black tracking-tighter text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{description}</p>
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
  const isManager = ['ADMIN', 'PROJECT_MANAGER', 'DIRECTOR_EVENT'].includes(role);

  // Si Manager -> allTasks, Sinon -> myTasks
  const tasks = isManager ? (data?.allTasks || []) : (data?.myTasks || []);

  // --- 3. CALCUL DES STATS ---
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === "DONE").length;
  const pendingTasks = tasks.filter((t: any) => t.status !== "DONE").length;

  const urgentTasks = tasks.filter((t: any) => {
    if (t.status === "DONE") return false;
    if (t.priority === "HIGH") return true;
    if (!t.dueDate) return false;

    const now = new Date();
    const due = new Date(t.dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  }).length;

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
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl p-6 rounded-2xl border border-border/40 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/50" />
            <div className="flex items-center gap-4 relative z-10">
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

            <div className="flex items-center gap-2">
              {isManager ? (
                <span className="flex items-center gap-2 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                  <IconUsers className="w-3.5 h-3.5" /> Vue Globale
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs font-medium bg-muted text-muted-foreground px-3 py-1 rounded-full border">
                  <IconBriefcase className="w-3.5 h-3.5" /> Mes Tâches
                </span>
              )}
            </div>
          </motion.div>

          {/* 2. Key Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
                    <StatCard title={isManager ? "Total Tâches" : "Mes Tâches"} value={loading ? "-" : totalTasks} description="Actives" icon={IconChecklist} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
                    <StatCard title="Priorité Haute" value={loading ? "-" : urgentTasks} description="Urgentes" icon={IconAlertCircle} className={urgentTasks > 0 ? "border-red-500/30 bg-red-500/5 dark:bg-red-500/10 hover:border-red-500/50" : ""} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
                    <StatCard title="Productivité" value={loading ? "-" : `${completionRate}%`} description="Taux de complétion" icon={IconChartPie} trend={<Progress value={completionRate} className="h-1.5 bg-muted/50" indicatorClassName="bg-emerald-500" />} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
                    <StatCard title="En Cours" value={loading ? "-" : pendingTasks} description="À traiter" icon={IconClock} />
                </motion.div>
            </AnimatePresence>
          </div>

          {/* 3. Main Data Table */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
            className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl shadow-lg overflow-hidden"
          >
            <div className="p-1">
              <TasksTable initialData={tasks} isManager={isManager} isLoading={loading} />
            </div>
          </motion.div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}