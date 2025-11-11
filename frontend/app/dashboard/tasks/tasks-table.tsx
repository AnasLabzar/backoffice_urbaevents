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
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
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
import { useIsMobile } from "@/hooks/use-mobile"; // <-- Make sure this import path is correct!
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
  DrawerTrigger,
} from "@/components/ui/drawer";

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
        uploadedBy {
          id
          name
        }
      }
      finalUpload {
        id
        fileName
        fileUrl
        originalFileName
        uploadedBy {
          id
          name
        }
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
        uploadedBy {
          id
          name
        }
      }
      finalUpload {
        id
        fileName
        fileUrl
        originalFileName
        uploadedBy {
          id
          name
        }
      }
    }
  }
`;

console.log("ALL TASKS", GET_ALL_TASKS_QUERY);
console.log("MY TASKS", GET_MY_TASKS_QUERY);



// And update the Task interface to make updatedAt optional
export interface Task {
  id: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  department: "CREATIVE" | "TECHNICAL_OFFICE" | "WORKSHOP" | "FIELD" | "LOGISTICS";
  dueDate: string | null;
  createdAt: string;
  updatedAt?: string; // Make it optional
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
    uploadedBy: {
      id: string;
      name: string;
    };
  }>;
  finalUpload: {
    id: string;
    fileName: string;
    fileUrl: string;
    originalFileName: string;
    uploadedBy: {
      id: string;
      name: string;
    };
  } | null;
}

// --- Status Badge Component ---
function TaskStatusBadge({ status }: { status: Task["status"] }) {
  const statusConfig = {
    TODO: { label: "À Faire", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    IN_PROGRESS: { label: "En Cours", className: "bg-blue-100 text-blue-800 border-blue-200" },
    DONE: { label: "Terminé", className: "bg-green-100 text-green-800 border-green-200" },
  };

  const config = statusConfig[status] || statusConfig.TODO;

  return (
    <Button variant="outline" className={cn("capitalize", config.className)}>
      {config.label}
    </Button>
  );
}

// --- Department Badge Component ---
function DepartmentBadge({ department }: { department: Task["department"] }) {
  const deptConfig = {
    CREATIVE: { label: "Créatif", className: "bg-purple-100 text-purple-800 border-purple-200" },
    TECHNICAL_OFFICE: { label: "Bureau Technique", className: "bg-blue-100 text-blue-800 border-blue-200" },
    WORKSHOP: { label: "Atelier", className: "bg-orange-100 text-orange-800 border-orange-200" },
    FIELD: { label: "Terrain", className: "bg-green-100 text-green-800 border-green-200" },
    LOGISTICS: { label: "Logistique", className: "bg-gray-100 text-gray-800 border-gray-200" },
  };

  const config = deptConfig[department] || deptConfig.CREATIVE;

  return (
    <Button variant="outline" className={cn("text-xs", config.className)}>
      {config.label}
    </Button>
  );
}

// --- Date Formatter (FIXED) ---
function formatDate(dateString: string | null) {
  // ✅ FIX 1: Handle null values (like dueDate)
  if (!dateString) return "Non définie";

  try {
    const date = new Date(dateString);

    // ✅ FIX 2: Check for "Invalid Date"
    // This catches issues if the date string is bad
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date value provided");
    }

    // 3. Format valid dates
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "Date invalide";
  }
}


// --- File Download Component ---
function FileDownloads({ task }: { task: Task }) {
  return (
    <div className="flex gap-1">
      {task.v1Uploads.map((file) => (
        <a
          key={file.id}
          href={`http://localhost:5001/${file.fileUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`Télécharger ${file.originalFileName}`}
        >
          <Button variant="outline" className="text-xs bg-blue-50 hover:bg-blue-100 cursor-pointer">
            <IconDownload className="h-3 w-3 mr-1" />
            V1
          </Button>
        </a>
      ))}
      {task.finalUpload && (
        <a
          href={`http://localhost:5001/${task.finalUpload.fileUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`Télécharger ${task.finalUpload.originalFileName}`}
        >
          <Button variant="outline" className="text-xs bg-green-50 hover:bg-green-100 cursor-pointer">
            <IconDownload className="h-3 w-3 mr-1" />
            Final
          </Button>
        </a>
      )}
      {task.v1Uploads.length === 0 && !task.finalUpload && (
        <span className="text-xs text-muted-foreground">Aucun</span>
      )}
    </div>
  );
}

function TaskDetailsViewer({ task }: { task: Task }) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Use the mobile hook from your new file to get the same behavior
  const isMobile = useIsMobile();

  // This is the content from your old drawer
  const content = (
    <div className="space-y-4 py-4 px-4">
      <div>
        <Label>Assigné à:</Label>
        <p className="font-medium">{task.assignedTo.name}</p>
        <p className="text-sm text-muted-foreground">{task.assignedTo.email}</p>
      </div>

      <div>
        <Label>Statut:</Label>
        <TaskStatusBadge status={task.status} />
      </div>

      <div>
        <Label>Département:</Label>
        <DepartmentBadge department={task.department} />
      </div>

      <div>
        <Label>Échéance:</Label>
        <p>{formatDate(task.dueDate)}</p>
      </div>

      <div>
        <Label>Créée le:</Label>
        <p>{formatDate(task.createdAt)}</p>
      </div>

      <div>
        <Label>Dernière mise à jour:</Label>
        <p>{formatDate(task.updatedAt || task.createdAt)}</p>
      </div>

      <div>
        <Label>Fichiers joints:</Label>
        <FileDownloads task={task} />
      </div>
    </div>
  );

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild onClick={() => setIsOpen(true)}>
        {/* This is what's visible in the table cell */}
        <div className="flex flex-col space-y-1 hover:cursor-pointer">
          <span className="font-medium text-sm hover:underline">{task.description}</span>
          <span className="text-xs text-muted-foreground">
            Projet: {task.project.object}
          </span>
        </div>
      </DrawerTrigger>

      {/* This is the side panel content, styled like your new file */}
      <DrawerContent className={cn(
        "p-4",
        isMobile
          ? "h-[90vh]"
          : "sm:max-w-lg right-0 fixed top-0 h-full border-l"
      )}>
        <DrawerHeader className="gap-1 px-0 pt-0">
          <DrawerTitle className="text-xl font-semibold">
            {task.description}
          </DrawerTitle>
          <DrawerDescription>
            Projet: {task.project.title} ({task.project.object})
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-grow overflow-y-auto pr-2 -mr-4">
          {content}
        </div>

        <DrawerFooter className="px-0 pb-0">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Fermer
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// --- Columns Definition ---
export const getTaskColumns = (
  setSelectedTask: React.Dispatch<React.SetStateAction<Task | null>>,
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>
): ColumnDef<Task>[] => [
    {
      accessorKey: "description",
      header: "Description de la Tâche",
      cell: ({ row }) => (
        <TaskDetailsViewer task={row.original} />
      ),
    },
    {
      accessorKey: "project.title",
      header: "Client",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.project.title}</span>
      ),
    },
    {
      accessorKey: "assignedTo.name",
      header: "Assigné à",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.assignedTo.name}</span>
      ),
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
      cell: ({ row }) => (
        <span className={cn(
          "text-sm",
          row.original.dueDate && new Date(row.original.dueDate) < new Date() && row.original.status !== "DONE"
            ? "text-red-600 font-medium"
            : "text-muted-foreground"
        )}>
          {formatDate(row.original.dueDate)}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Créée le",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "uploads",
      header: "Fichiers",
      cell: ({ row }) => <FileDownloads task={row.original} />,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const task = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <IconDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Button
                variant="ghost"
                className="w-full justify-start"
                // ✅ This onClick will now correctly update the state
                // inside your TasksTable component, opening the drawer.
                onClick={() => {
                  setSelectedTask(task);
                  setIsDrawerOpen(true);
                }}
              >
                <IconEye className="mr-2 h-4 w-4" />
                Voir détails
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <IconEdit className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

// --- Main Tasks Table Component ---
interface TasksTableProps {
  // columns: ColumnDef<Task>[];
}

export function TasksTable(/* { columns }: TasksTableProps */) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [activeTab, setActiveTab] = React.useState<"my-tasks" | "all-tasks">("my-tasks");

  // This state is correct and in the right place
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);


  // Fetch both queries separately
  const { data: myTasksData, loading: myTasksLoading, error: myTasksError } = useQuery(GET_MY_TASKS_QUERY);
  const { data: allTasksData, loading: allTasksLoading, error: allTasksError } = useQuery(GET_ALL_TASKS_QUERY); // Typo fixed here

  // Safely extract arrays
  const myTasks = myTasksData?.myTasks || [];
  const allTasks = allTasksData?.allTasks || [];

  // Decide which tasks to display based on the active tab
  // ✅ This logic is correct, but we pass it to `useReactTable`
  const data = React.useMemo(() => {
    return activeTab === "my-tasks" ? myTasks : allTasks;
  }, [activeTab, myTasks, allTasks]);


  // 3. ✅ ADD THIS: Generate columns *inside* the component
  // We use React.useMemo so this array isn't recreated on every render
  const columns = React.useMemo(
    () => getTaskColumns(setSelectedTask, setIsDrawerOpen),
    [] // The state setters are stable and won't change, so we use an empty dependency array
  );


  // Table setup
  const table = useReactTable({
    data: data, // ✅ Use the memoized data
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Loading & error handling
  if (myTasksLoading || allTasksLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (myTasksError || allTasksError) {
    return (
      <div className="text-center py-8 text-red-600">
        Erreur lors du chargement des tâches: {myTasksError?.message || allTasksError?.message}
      </div>
    );
  }



  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "my-tasks" | "all-tasks")} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between lg:px-6 mb-6">
        <TabsList>
          <TabsTrigger value="my-tasks">Mes Tâches ({myTasks.length})</TabsTrigger>
          <TabsTrigger value="all-tasks">Toutes les Tâches ({allTasks.length})</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          {/* Columns toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Colonnes</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                // Filter out non-data columns like 'actions' if they can't be hidden
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize"
                    checked={col.getIsVisible()}
                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  >
                    {/* Use header as a more friendly name if possible */}
                    {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter input */}
          <Input
            placeholder="Filtrer les tâches..."
            value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("description")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
      </div>

      {/* ✅ Unified table rendering for both tabs */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 0 ? header.getSize() : undefined }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          {/* ✅ FIX 3: Replaced manual row mapping with table.getRowModel() */}
          {/* This makes filtering, pagination, and sorting work correctly. */}
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Aucune tâche trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 🧭 Task Details Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-w-lg right-0 fixed top-0 h-full bg-white/95 backdrop-blur-md shadow-2xl border-l z-50">
          {selectedTask ? (
            <>
              <DrawerHeader className="flex justify-between items-center">
                <div>
                  <DrawerTitle className="text-xl font-semibold">
                    {selectedTask.description}
                  </DrawerTitle>
                  <DrawerDescription>
                    Projet: {selectedTask.project.title} ({selectedTask.project.object})
                  </DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                    ✕
                  </Button>
                </DrawerClose>
              </DrawerHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label>Assigné à:</Label>
                  <p className="font-medium">{selectedTask.assignedTo.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTask.assignedTo.email}</p>
                </div>

                <div>
                  <Label>Statut:</Label>
                  <TaskStatusBadge status={selectedTask.status} />
                </div>

                <div>
                  <Label>Département:</Label>
                  <DepartmentBadge department={selectedTask.department} />
                </div>

                <div>
                  <Label>Échéance:</Label>
                  <p>{formatDate(selectedTask.dueDate)}</p>
                </div>

                <div>
                  <Label>Créée le:</Label>
                  <p>{formatDate(selectedTask.createdAt)}</p>
                </div>

                <div>
                  <Label>Dernière mise à jour:</Label>
                  <p>{formatDate(selectedTask.updatedAt || selectedTask.createdAt)}</p>
                </div>

                <div>
                  <Label>Fichiers joints:</Label>
                  <FileDownloads task={selectedTask} />
                </div>
              </div>

              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full">
                    Fermer
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              Aucune tâche sélectionnée.
            </div>
          )}
        </DrawerContent>
      </Drawer>


      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {table.getFilteredSelectedRowModel().rows.length} sur{" "}
          {table.getFilteredRowModel().rows.length} tâche(s) sélectionnée(s).
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Lignes par page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} sur{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Première page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Page précédente</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Page suivante</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Dernière page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </Tabs >
  );
}