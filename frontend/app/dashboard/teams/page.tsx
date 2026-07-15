"use client";

import * as React from "react";
import { gql, useQuery, useLazyQuery } from "@apollo/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconActivity,
  IconUser,
  IconMail,
  IconShieldCheck,
  IconFileText,
  IconTimelineEvent,
  IconAlertCircle,
  IconExternalLink,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { useIsMobile } from "@/hooks/use-mobile"; // Assumé exister
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// 1. Définir les types basés sur vos schémas
type Role = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type Task = {
  id: string;
  description: string;
  status: string;
  createdAt?: string;
  project?: {
    id: string;
    object: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  };
};

type Log = {
  id: string;
  details: string;
  createdAt: string;
  user: {
    name: string;
  };
};

// 2. Définir les requêtes GQL (Corrigées)
const GET_ALL_USERS_WITH_ROLES = gql`
  query GetAllUsersWithRoles {
    users {
      id
      name
      email
      # isActive -- RETIRÉ, cause l'erreur GraphQL
      role {
        id
        name
      }
    }
  }
`;

const GET_ALL_TASKS = gql`
  query GetAllTasks {
    allTasks {
      id
      description
      status
      createdAt
      project {
        id
        object
      }
      assignedTo {
        id
        name
      }
    }
  }
`;

// NOUVEAU: Ajout de GET_LOGS_QUERY (copié de votre fichier data-table)
const GET_LOGS_QUERY = gql`
  query GetLogs($projectId: ID!) {
    logs(projectId: $projectId) {
      id
      details
      createdAt
      user {
        name
      }
    }
  }
`;

// Helper pour parser les dates
function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  let date;
  if (/^\d+$/.test(dateString)) {
    date = new Date(parseInt(dateString, 10));
  } else {
    date = new Date(dateString);
  }
  if (isNaN(date.getTime())) return null;
  return date;
}

// =======================================================================
// COMPOSANT MODALE DE TRACIBILITÉ (Ré-intégré)
// =======================================================================
function UserTraceabilityModal({
  user,
  projectId,
  isOpen,
  onOpenChange,
  allTasks,
}: {
  user: User | null;
  projectId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allTasks: Task[];
}) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [getLogs, { data: logData, loading: logLoading }] =
    useLazyQuery(GET_LOGS_QUERY);

  React.useEffect(() => {
    if (isOpen && user && projectId) {
      getLogs({ variables: { projectId } });
    }
  }, [isOpen, user, projectId, getLogs]);

  // Filtre les logs pour ne montrer que ceux de l'utilisateur sélectionné
  const userLogs: Log[] = React.useMemo(() => {
    if (!logData || !user) return [];
    return logData.logs.filter((log: Log) => log.user.name === user.name);
  }, [logData, user]);

  // Filtre les tâches pour l'utilisateur
  const userTasks: Task[] = React.useMemo(() => {
    if (!allTasks || !user) return [];
    return allTasks.filter((task) => task.assignedTo?.id === user.id);
  }, [allTasks, user]);

  const Content = (
    <>
      <SheetHeader>
        <SheetTitle>Activité de {user?.name}</SheetTitle>
        <SheetDescription>
          Affichage de l'activité de l'utilisateur sur son dernier projet.
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        
        {/* SECTION TÂCHES */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <IconFileText className="h-4 w-4 text-primary" />
            Tâches Assignées ({userTasks.length})
          </h3>
          {userTasks.length === 0 ? (
            <div className="p-4 bg-muted/20 border border-border/30 rounded-xl border-dashed text-center">
              <p className="text-xs text-muted-foreground italic">Aucune tâche assignée.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {userTasks.map((task) => {
                const isDone = task.status === "DONE";
                return (
                  <div key={task.id} className="p-3.5 bg-background/60 backdrop-blur-sm border border-border/50 rounded-xl flex flex-col gap-2 shadow-sm">
                    <p className="text-sm font-semibold text-foreground leading-tight">{task.description}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-transparent w-fit",
                        isDone ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", isDone ? "bg-green-500" : "bg-blue-500")} />
                        {task.status.replace("_", " ")}
                      </span>
                      {task.project && (
                        <div 
                           onClick={() => router.push(`/dashboard/projects/${task.project!.id}/production`)}
                           className="flex items-center gap-1.5 cursor-pointer group/link hover:bg-muted/50 px-2 py-1 rounded-md transition-colors"
                        >
                          <span className="text-[10px] font-medium text-muted-foreground group-hover/link:text-primary transition-colors truncate max-w-[130px]" title={task.project.object}>
                            {task.project.object}
                          </span>
                          <IconExternalLink className="w-3 h-3 text-muted-foreground group-hover/link:text-primary transition-colors" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator className="bg-border/50" />

        {/* SECTION LOGS / ACTIVITÉ */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <IconActivity className="h-4 w-4 text-primary" />
            Historique d'Activité
          </h3>
          {logLoading && (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          )}
          {!logLoading && userLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 bg-muted/10 border border-border/30 rounded-xl border-dashed text-muted-foreground">
              <IconTimelineEvent className="h-8 w-8 opacity-20 mb-2" />
              <p className="text-xs">Aucune activité enregistrée.</p>
            </div>
          )}
          {!logLoading && userLogs.length > 0 && (
            <div className="relative space-y-6 pl-6 pt-2">
              <div className="absolute left-[.1em] top-[1em] bottom-0 w-0.5 bg-border ml-[23px] border-[1px dashed #ffffff1a]" />
              {userLogs.map((log) => (
                <div key={log.id} className="relative flex items-start">
                  <div className="z-10 flex-shrink-0 bg-card p-1.5 rounded-full border border-border/50 shadow-sm mt-0.5">
                    <IconActivity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-foreground">{log.details}</p>
                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                      {format(
                        parseDate(log.createdAt)!,
                        "d MMMM yyyy 'à' HH:mm",
                        { locale: fr }
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <SheetFooter>
        <SheetClose asChild>
          <Button variant="outline">Fermer</Button>
        </SheetClose>
      </SheetFooter>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[80vh]">{Content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl flex flex-col h-full">
        {Content}
      </SheetContent>
    </Sheet>
  );
}

// =======================================================================
// COMPOSANT DERNIÈRE TÂCHE (Modifié)
// =======================================================================
function UserLastTask({ lastTask }: { lastTask: Task | null }) {
  if (!lastTask) {
    return (
      <div className="flex flex-col items-center justify-center h-24 bg-muted/20 border border-border/30 rounded-xl border-dashed">
        <p className="text-xs text-muted-foreground italic">Aucune tâche récente.</p>
      </div>
    );
  }

  const isDone = lastTask.status === "DONE";

  return (
    <div className="p-3.5 bg-background/60 backdrop-blur-sm border border-border/50 rounded-xl flex flex-col gap-2 group-hover:bg-background/80 transition-colors shadow-sm">
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight" title={lastTask.description}>
          {lastTask.description}
        </p>
      </div>
      
      <div className="flex items-center justify-between mt-1">
        <span
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-transparent",
            isDone
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
          )}
        >
          <div className={cn("w-1.5 h-1.5 rounded-full", isDone ? "bg-green-500" : "bg-blue-500")} />
          {lastTask.status.replace("_", " ")}
        </span>
        
        {lastTask.project && (
          <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[120px]" title={lastTask.project.object}>
            {lastTask.project.object}
          </span>
        )}
      </div>
    </div>
  );
}

// =======================================================================
// COMPOSANT CARTE UTILISATEUR (Modifié)
// =======================================================================
function UserCard({
  user,
  allTasks,
  onViewTraceability,
}: {
  user: User;
  allTasks: Task[];
  onViewTraceability: (user: User, projectId: string) => void;
}) {
  // Logique pour trouver la dernière tâche et son projet
  const lastTask = React.useMemo(() => {
    const userTasks = allTasks
      .filter(
        (task) => task.assignedTo?.id === user.id && task.createdAt
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );
    return userTasks.length > 0 ? userTasks[0] : null;
  }, [user.id, allTasks]);

  const lastProjectId = lastTask?.project?.id || null;

  return (
    <Card className="flex flex-col bg-card/40 backdrop-blur-xl border-border/40 hover:border-primary/40 shadow-sm hover:shadow-lg transition-all duration-300 group relative overflow-hidden h-full">
      {/* Subtle background glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between mb-1">
            <CardTitle className="text-xl font-bold tracking-tight">{user.name}</CardTitle>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0">
                <IconShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold tracking-widest uppercase">{user.role.name}</span>
            </div>
        </div>
        <CardDescription className="text-xs truncate">{user.email}</CardDescription>
      </CardHeader>

      <CardContent className="flex-grow space-y-4 relative z-10 pb-2">
        <Separator className="bg-border/40 group-hover:bg-border/60 transition-colors" />
        <div className="pt-2">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <IconFileText className="w-3.5 h-3.5 text-primary/70" />
            Dernière Tâche
          </h4>
          <UserLastTask lastTask={lastTask} />
        </div>
      </CardContent>

      <CardFooter className="relative z-10 pt-4">
        <Button
          variant="secondary"
          className="w-full bg-background/50 hover:bg-primary/10 hover:text-primary border border-border/40 hover:border-primary/30 transition-all font-semibold text-xs h-9 shadow-sm"
          onClick={() => onViewTraceability(user, lastProjectId!)}
          disabled={!lastProjectId}
        >
          <IconActivity className="h-4 w-4 mr-2" />
          Voir Activité Récente
        </Button>
      </CardFooter>
    </Card>
  );
}

// =======================================================================
// PAGE PRINCIPALE (Modifiée)
// =======================================================================
export default function TeamPage() {
  const {
    data: userData,
    loading: userLoading,
    error: userError,
  } = useQuery(GET_ALL_USERS_WITH_ROLES);
  
  const {
    data: taskData,
    loading: taskLoading,
    error: taskError,
  } = useQuery(GET_ALL_TASKS);

  // État pour la modale
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const handleViewTraceability = (user: User, projectId: string) => {
    setSelectedUser(user);
    setSelectedProjectId(projectId);
    setIsModalOpen(true);
  };

  const users: User[] = userData?.users || [];
  const allTasks: Task[] = taskData?.allTasks || [];

  const loading = userLoading || taskLoading;
  const error = userError || taskError;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-grow flex-col space-y-8 p-4 md:p-8">
          <div className="flex items-center justify-between space-y-2">
            <h1 className="text-3xl font-bold">Équipe</h1>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[300px] w-full rounded-2xl" />
              ))}
            {error && (
              <p className="col-span-full text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                Erreur de chargement: {error.message}
              </p>
            )}
            {!loading && !error && (
              <AnimatePresence>
                {users.map((user, idx) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }}
                    className="h-full"
                  >
                    <UserCard
                      user={user}
                      allTasks={allTasks}
                      onViewTraceability={handleViewTraceability}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* La Modale (Sheet/Drawer) pour la traçabilité */}
      <UserTraceabilityModal
        user={selectedUser}
        projectId={selectedProjectId}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        allTasks={allTasks}
      />
    </SidebarProvider>
  );
}