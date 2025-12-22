"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { gql, useQuery } from "@apollo/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconDownload,
  IconAlertTriangle,
  IconFileText,
  IconCalendar,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// --- QUERIES ---
const GET_MY_TASKS_QUERY = gql`
  query GetMyTasks {
    myTasks {
      id
      description
      status
      department
      dueDate
      createdAt
      updatedAt
      assignedTo {
        id
        name
        email
      }
      project {
        id
        object
        title
      }
      v1Uploads {
        id
        fileName
        fileUrl
        originalFileName
      }
      finalUpload {
        id
        fileName
        fileUrl
        originalFileName
      }
    }
  }
`;

const GET_ALL_TASKS_QUERY = gql`
  query GetAllTasks {
    allTasks {
      id
      description
      status
      department
      dueDate
      createdAt
      updatedAt
      assignedTo {
        id
        name
        email
      }
      project {
        id
        object
        title
      }
      v1Uploads {
        id
        fileName
        fileUrl
        originalFileName
      }
      finalUpload {
        id
        fileName
        fileUrl
        originalFileName
      }
    }
  }
`;

// --- TYPES ---
export interface Task {
  id: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  department: "CREATIVE" | "TECHNICAL_OFFICE" | "WORKSHOP" | "FIELD" | "LOGISTICS";
  dueDate: string | null;
  createdAt: string;
  updatedAt?: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  project: {
    id: string;
    object: string;
    title: string;
  };
  v1Uploads: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    originalFileName: string;
  }>;
  finalUpload: {
    id: string;
    fileName: string;
    fileUrl: string;
    originalFileName: string;
  } | null;
}

// --- HELPERS ---

const getFileUrl = (filePath: string) => {
  if (!filePath) return "#";
  const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5002'
    : 'https://backoffice.urbagroupe.ma';
  return `${baseUrl}/${filePath.startsWith('/') ? filePath.slice(1) : filePath}`;
};

function formatDate(dateString: string | null) {
  if (!dateString) return "Non définie";

  const date = new Date(dateString);

  // VÉRIFICATION DE SÉCURITÉ : Si la date est invalide, on ne plante pas
  if (isNaN(date.getTime())) {
    return "Date invalide";
  }

  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

// --- COMPONENTS ---

// 1. Status Badge (Dark Mode Ready)
function TaskStatusBadge({ status }: { status: string }) {
  // Using generic color classes that work in both modes via opacity
  const config: Record<string, string> = {
    TODO: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200/50 dark:border-orange-900/50",
    IN_PROGRESS: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/50",
    DONE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50",
  };

  const labels: Record<string, string> = { TODO: "À faire", IN_PROGRESS: "En cours", DONE: "Terminé" };

  return (
    <Badge variant="outline" className={cn("capitalize whitespace-nowrap font-medium", config[status] || config.TODO)}>
      {labels[status] || status}
    </Badge>
  );
}

// 2. Department Badge (Dark Mode Ready)
function DepartmentBadge({ department }: { department: Task["department"] }) {
  const deptConfig = {
    CREATIVE: { label: "Créatif", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200/50" },
    TECHNICAL_OFFICE: { label: "Bureau Tech", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-200/50" },
    WORKSHOP: { label: "Atelier", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200/50" },
    FIELD: { label: "Terrain", color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-200/50" },
    LOGISTICS: { label: "Logistique", color: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-200/50" },
  };
  const config = deptConfig[department] || deptConfig.CREATIVE;

  return (
    <div className={cn("text-[10px] px-2 py-0.5 rounded-full border w-fit font-semibold whitespace-nowrap", config.color)}>
      {config.label}
    </div>
  );
}

// 3. File Downloads
function FileDownloads({ task }: { task: Task }) {
  const hasV1 = task.v1Uploads.length > 0;
  const hasFinal = !!task.finalUpload;

  if (!hasV1 && !hasFinal) return <span className="text-muted-foreground text-xs opacity-50">-</span>;

  return (
    <div className="flex gap-1.5">
      {hasV1 && (
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div className="h-7 w-7 rounded-md border bg-background flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                <span className="text-[10px] font-bold">V1</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border">
              <div className="flex flex-col gap-2 p-1">
                <span className="font-semibold text-xs border-b pb-1">Fichiers V1</span>
                {task.v1Uploads.map(f => (
                  <a key={f.id} href={getFileUrl(f.fileUrl)} target="_blank" className="text-xs hover:text-primary flex items-center gap-2">
                    <IconDownload className="h-3 w-3" /> {f.originalFileName}
                  </a>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {hasFinal && (
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <a
                href={getFileUrl(task.finalUpload!.fileUrl)}
                target="_blank"
                className="h-7 w-7 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
              >
                <IconDownload className="h-3.5 w-3.5" />
              </a>
            </TooltipTrigger>
            <TooltipContent><p>Télécharger le fichier final</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// --- TABLE COLUMNS DEFINITION (CORRIGÉ) ---
export const getTaskColumns = (
  setSelectedTask: React.Dispatch<React.SetStateAction<Task | null>>,
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>
): ColumnDef<Task>[] => [
    {
      accessorKey: "description",
      header: "Description & Projet",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 max-w-[300px]">
          <span
            className="font-medium text-sm truncate text-foreground hover:text-primary cursor-pointer transition-colors"
            onClick={() => { setSelectedTask(row.original); setIsDrawerOpen(true); }}
          >
            {row.original.description}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {/* Ajout de ?. et || pour éviter le crash si project est null */}
            <span className="truncate max-w-[150px]">
              {row.original.project?.object || "Objet non spécifié"}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "project.title",
      header: "Client",
      cell: ({ row }) => {
        const project = row.original.project;
        if (!project) return <span className="text-xs text-muted-foreground">Aucun projet</span>;

        return (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-normal h-5 px-1.5">
              {project.id ? project.id.slice(-4) : "????"}
            </Badge>
            <span className="text-sm font-medium truncate max-w-[140px]" title={project.title}>
              {project.title}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "assignedTo.name",
      header: "Responsable",
      cell: ({ row }) => {
        const user = row.original.assignedTo;
        // Si aucun utilisateur n'est assigné, on affiche un placeholder au lieu de crasher
        if (!user) {
          return (
            <div className="flex items-center gap-2 opacity-50">
              <div className="h-6 w-6 rounded-full bg-muted border flex items-center justify-center text-[9px]">?</div>
              <span className="text-sm italic">Non assigné</span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
              <AvatarFallback className="text-[9px]">{user.name ? user.name.slice(0, 2).toUpperCase() : "??"}</AvatarFallback>
            </Avatar>
            <span className="text-sm truncate max-w-[120px]">{user.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "department",
      header: "Département",
      cell: ({ row }) => <DepartmentBadge department={row.original.department} />,
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "dueDate",
      header: "Échéance",
      cell: ({ row }) => {
        const isOverdue = row.original.dueDate && new Date(row.original.dueDate) < new Date() && row.original.status !== "DONE";
        return (
          <div className={cn(
            "flex items-center gap-1.5 text-sm whitespace-nowrap px-2 py-1 rounded-md w-fit",
            isOverdue
              ? "bg-red-500/10 text-red-600 dark:text-red-400 font-medium"
              : "text-muted-foreground"
          )}>
            {isOverdue && <IconAlertTriangle className="h-3.5 w-3.5" />}
            {formatDate(row.original.dueDate)}
          </div>
        );
      },
    },
    {
      id: "uploads",
      header: "Fichiers",
      cell: ({ row }) => <FileDownloads task={row.original} />,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const task = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                <span className="sr-only">Menu</span>
                <IconDotsVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedTask(task); setIsDrawerOpen(true); }}>
                <IconEye className="mr-2 h-4 w-4" /> Détails
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconEdit className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:text-red-600">
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

// --- MAIN TABLE COMPONENT ---
export function TasksTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [activeTab, setActiveTab] = React.useState<"my-tasks" | "all-tasks">("my-tasks");
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // Data Fetching
  const { data: myTasksData, loading: myLoading, error: myError } = useQuery(GET_MY_TASKS_QUERY);
  const { data: allTasksData, loading: allLoading, error: allError } = useQuery(GET_ALL_TASKS_QUERY);

  const myTasks = myTasksData?.myTasks || [];
  const allTasks = allTasksData?.allTasks || [];

  // Memoize data to prevent re-renders
  const data = React.useMemo(() => {
    return activeTab === "my-tasks" ? myTasks : allTasks;
  }, [activeTab, myTasks, allTasks]);

  const overdueCount = React.useMemo(() => {
    return myTasks.filter((t: Task) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;
  }, [myTasks]);

  const columns = React.useMemo(() => getTaskColumns(setSelectedTask, setIsDrawerOpen), []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Loading State
  if (myLoading || allLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  // Error State
  if (myError || allError) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-destructive border border-destructive/20">
        <h3 className="font-bold">Erreur de chargement</h3>
        <p className="text-sm mt-1">{myError?.message || allError?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* 1. Dynamic Alert for Overdue Tasks */}
      {overdueCount > 0 && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400">
          <IconAlertTriangle className="h-4 w-4" />
          <AlertTitle className="ml-2 font-bold">Attention requise</AlertTitle>
          <AlertDescription className="ml-2 flex items-center justify-between w-full">
            <span>Vous avez <strong>{overdueCount} tâche(s)</strong> en retard.</span>
            <Button variant="link" size="sm" className="h-auto p-0 text-red-600 dark:text-red-400 underline" onClick={() => setActiveTab("my-tasks")}>
              Voir mes tâches
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 2. Controls & Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 py-2">

          <TabsList className="bg-muted text-muted-foreground p-1 h-10">
            <TabsTrigger value="my-tasks" className="px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              Mes Tâches <Badge variant="secondary" className="ml-2 h-5 bg-primary/10 text-primary">{myTasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="all-tasks" className="px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              Toutes les Tâches <span className="ml-2 text-xs text-muted-foreground">({allTasks.length})</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative w-full lg:w-[280px]">
              <Input
                placeholder="Filtrer par description..."
                value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("description")?.setFilterValue(event.target.value)}
                className="h-9 w-full bg-background"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto h-9 bg-background">
                  <IconLayoutColumns className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Vues</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuLabel>Colonnes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table.getAllColumns().filter(c => c.getCanHide()).map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id === "project_title" ? "Client" : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 3. Table Container */}
        <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/30 border-b border-border/50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground/50">
                      <IconFileText className="h-10 w-10 mb-3 opacity-20" />
                      <p className="text-sm font-medium">Aucun résultat trouvé</p>
                      <p className="text-xs">Essayez d'ajuster vos filtres.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Full Pagination (Restored) */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground order-2 sm:order-1">
            <span>Lignes par page</span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px] bg-background">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <div className="text-sm font-medium mr-2 text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 bg-background"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 bg-background"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 bg-background"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 bg-background"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Tabs>

      {/* 5. Details Drawer (Professional & Dark Mode Ready) */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="fixed right-0 top-0 h-full w-full sm:w-[450px] mt-0 rounded-none border-l bg-background shadow-2xl focus:outline-none z-50">
          {selectedTask && (
            <div className="h-full flex flex-col">
              <DrawerHeader className="border-b bg-muted/20 px-6 py-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-background">
                    {selectedTask.project?.title || "Projet Inconnu"}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{formatDate(selectedTask.createdAt)}</span>
                </div>
                <DrawerTitle className="text-xl font-bold leading-tight">{selectedTask.description}</DrawerTitle>
                <DrawerDescription className="mt-1">
                  Projet ID: {selectedTask.project?.id || "N/A"}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                {/* Status Section */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Statut actuel</Label>
                    <div><TaskStatusBadge status={selectedTask.status} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Priorité/Date</Label>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <IconCalendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(selectedTask.dueDate)}
                    </div>
                  </div>
                </div>

                {/* Assignment Section (SÉCURISÉ) */}
                <div className="space-y-3 p-4 rounded-lg border bg-card/50">
                  <Label className="text-xs uppercase text-muted-foreground font-semibold">Responsable</Label>
                  {selectedTask.assignedTo ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedTask.assignedTo.name}`} />
                        <AvatarFallback>USER</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold">{selectedTask.assignedTo.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedTask.assignedTo.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Aucun responsable assigné</div>
                  )}
                </div>

                {/* Details Section */}
                <div className="space-y-3">
                  <Label className="text-xs uppercase text-muted-foreground font-semibold">Détails de la mission</Label>
                  <div className="text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-md border border-border/50">
                    {selectedTask.description}
                  </div>
                </div>

                {/* Files Section */}
                <div className="space-y-3">
                  <Label className="text-xs uppercase text-muted-foreground font-semibold">Fichiers joints</Label>
                  <div className="flex items-center gap-4">
                    <FileDownloads task={selectedTask} />
                  </div>
                </div>
              </div>

              <DrawerFooter className="border-t bg-muted/20 px-6 py-4">
                <Button className="w-full">Marquer comme terminé</Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full bg-background hover:bg-muted">Fermer</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}