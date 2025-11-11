"use client";

import * as React from "react";
import { gql, useQuery, useLazyQuery } from "@apollo/client";
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
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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
}: {
  user: User | null;
  projectId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
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

  const Content = (
    <>
      <SheetHeader>
        <SheetTitle>Activité de {user?.name}</SheetTitle>
        <SheetDescription>
          Affichage de l'activité de l'utilisateur sur son dernier projet.
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto p-4">
        {logLoading && (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {!logLoading && userLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <IconTimelineEvent className="h-12 w-12" />
            <p className="mt-2">Aucune activité enregistrée pour cet utilisateur sur ce projet.</p>
          </div>
        )}
        {!logLoading && userLogs.length > 0 && (
          <div className="relative space-y-6 pl-6">
            <div className="absolute left-[.1em] top-[1em] bottom-0 w-0.5 bg-border ml-[23px] border-[1px dashed #ffffff1a]" />
            {userLogs.map((log) => (
              <div key={log.id} className="relative flex items-start">
                <div className="z-10 flex-shrink-0 bg-background p-2 rounded-full border">
                  <IconActivity className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-foreground">{log.details}</p>
                  <p className="text-xs text-muted-foreground">
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
      <p className="text-sm text-muted-foreground italic">
        Aucune tâche récente.
      </p>
    );
  }

  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <p className="text-sm font-medium truncate" title={lastTask.description}>
        {lastTask.description}
      </p>
      <span
        className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          lastTask.status === "DONE"
            ? "bg-green-100 text-green-700"
            : "bg-blue-100 text-blue-700"
        )}
      >
        {lastTask.status.replace("_", " ")}
      </span>
      {lastTask.project && (
        <p className="text-xs text-muted-foreground mt-1">
          Projet: {lastTask.project.object}
        </p>
      )}
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
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{user.name}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center gap-2">
          <IconShieldCheck className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{user.role.name}</span>
        </div>
        <Separator />
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <IconFileText className="h-4 w-4" />
            Dernière Tâche Assignée
          </h4>
          <UserLastTask lastTask={lastTask} />
        </div>
      </CardContent>
      <CardFooter>
        {/* Bouton de traçabilité RÉ-ACTIVÉ */}
        <Button
          variant="outline"
          className="w-full"
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            {error && (
              <p className="col-span-full text-red-500">
                Erreur de chargement: {error.message}
              </p>
            )}
            {!loading &&
              !error &&
              users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  allTasks={allTasks}
                  onViewTraceability={handleViewTraceability}
                />
              ))}
          </div>
        </div>
      </SidebarInset>

      {/* La Modale (Sheet/Drawer) pour la traçabilité */}
      <UserTraceabilityModal
        user={selectedUser}
        projectId={selectedProjectId}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </SidebarProvider>
  );
}