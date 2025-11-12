"use client";

import * as React from "react";
// Imports
import {
  IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronsLeft,
  IconChevronsRight, IconDotsVertical, IconLayoutColumns,
  IconEye, IconActivity, IconClock,
  IconCircleCheckFilled, IconX,
  IconDownload, IconListCheck,
  IconUsers, IconPlus,
  IconCheck, IconSelector // <-- S777NAHA
} from "@tabler/icons-react";
import { gql } from "@apollo/client";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client/react";
import {
  ColumnDef, ColumnFiltersState, SortingState, VisibilityState, flexRender,
  getCoreRowModel, getFacetedRowModel, getFacetedUniqueValues,
  getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable
} from "@tanstack/react-table";
import { toast } from "sonner";
import { z } from "zod";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
// --- HADO L-COMPONENTS L-JDAD L-UI ---
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
// ---------------------------------
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription,
  DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger
} from "@/components/ui/drawer";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { CreateProjectDrawer } from "@/components/create-project-drawer";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/ui/file-upload";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays, subDays } from "date-fns";
import { cn } from "@/lib/utils";
const IconChevronsUpDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
);

// --- L-QUERIES L-MOHIMIN ---
const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id
        title
        object
        status: generalStatus
        preparationStatus
        projectManagers { id name }
        stages { 
          administrative { documents { id fileName fileUrl } }
          technical { documents { id fileName fileUrl originalFileName } }
        }
        submissionDeadline
        cautionRequestDate
        feasibilityChecks {
          administrative
          technical
          financial
        }
        caution {
          status
        }
        team {
          infographistes { id name }
          team3D { id name }
          assistants { id name }
        }
        proposalAvis { # <-- ZID HNA
          status
          reason
          givenBy { name }
          givenAt
        }
      }
      latestTask { id description status createdAt }
    }
  }
`;

const ME_QUERY = gql` query Me { me { id role { name permissions } } }`;

const GET_PROJECT_MANAGERS = gql`
  query GetProjectManagers {
    users(role: "PROJECT_MANAGER") { id name }
  }
`;
const GET_TEAM_MEMBERS = gql`
  query GetTeamMembers {
    infographistes: users(role: "CREATIVE") { id name }
    team3D: users(role: "3D_ARTIST") { id name }
    assistants: users(role: "ASSISTANT_PM") { id name }
  }
`;
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

// --- QUERY JDID L-TASKS ---
const GET_TASKS_BY_PROJECT_QUERY = gql`
  query GetTasksByProject($projectId: ID!) {
    tasksByProject(projectId: $projectId) {
      id
      description
      status
      department
      assignedTo {
        id
        name
      }
      # --- ZIDNA HADO L-JDAD ---
      v1Uploads {
        id
        fileUrl
        originalFileName
      }
      finalUpload {
        id
        fileUrl
        originalFileName
      }
    }
  }
`;

// --- L-MUTATIONS L-MOHIMIN ---
const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) { id title object status: generalStatus }
  }
`;
const UPLOAD_DOCUMENT_MUTATION = gql`
  mutation UploadDocument(
    $projectId: ID!, $stageName: String!, 
    $docType: String!, $fileUrl: String!, $originalFileName: String!
  ) {
    proposal_uploadDocument(
      projectId: $projectId, stageName: $stageName, 
      docType: $docType, fileUrl: $fileUrl, originalFileName: $originalFileName
    ) { id stages { administrative { documents { id fileName } } } }
  }
`;
const SUBMIT_REVIEW_MUTATION = gql`
  mutation SubmitForReview($projectId: ID!) {
    proposal_submitForReview(projectId: $projectId) { id preparationStatus }
  }
`;
const ADMIN_ASSIGN_PROJECT_MUTATION = gql`
  mutation AdminAssignProject($input: AdminAssignProjectInput!) {
    admin_assignProject(input: $input) {
      id
      preparationStatus
      projectManagers { id name }
    }
  }
`;
const CP_UPLOAD_ESTIMATE_MUTATION = gql`
  mutation CpUploadEstimate($projectId: ID!, $fileUrl: String!, $originalFileName: String!) {
    cp_uploadEstimate(projectId: $projectId, fileUrl: $fileUrl, originalFileName: $originalFileName) { id preparationStatus }
  }
`;
const ADMIN_RUN_FEASIBILITY_MUTATION = gql`
  mutation AdminRunFeasibility($input: AdminFeasibilityInput!) {
    admin_runFeasibility(input: $input) { id feasibilityChecks { administrative technical financial } }
  }
`;
const ADMIN_LAUNCH_PROJECT_MUTATION = gql`
  mutation AdminLaunchProject($projectId: ID!) {
    admin_launchProject(projectId: $projectId) { id preparationStatus }
  }
`;
const FINANCE_REQUEST_CAUTION_MUTATION = gql`
  mutation FinanceRequestCaution($projectId: ID!) {
    finance_requestCaution(projectId: $projectId) { id caution { status } preparationStatus }
  }
`;
const CP_ASSIGN_TEAM_MUTATION = gql`
  mutation CpAssignTeam($input: CPAssignTeamInput!) {
    cp_assignTeam(input: $input) { id team { infographistes { id } team3D { id } assistants { id } } }
  }
`;
const PM_CREATE_TASK_MUTATION = gql`
  mutation PmCreateTask($input: PMCreateTaskInput!) {
    pm_createTask(input: $input) {
      id
      description
      status
    }
  }
`;
const PM_UPDATE_TASK_STATUS_MUTATION = gql`
  mutation PmUpdateTaskStatus($taskId: ID!, $status: String!) {
    pm_updateTaskStatus(taskId: $taskId, status: $status) {
      id
      status
    }
  }
`;
// ------------------------------------

// --- MUTATIONS L-JDAD L-UPLOAD ---
const CP_UPLOAD_ASSET_MUTATION = gql`
  mutation CpUploadAsset($projectId: ID!, $fileUrl: String!, $originalFileName: String!) {
    cp_uploadAsset(projectId: $projectId, fileUrl: $fileUrl, originalFileName: $originalFileName) {
      id
      stages { technical { documents { id } } }
    }
  }
`;
const TEAM_UPLOAD_TASK_V1_MUTATION = gql`
  mutation TeamUploadTaskV1($taskId: ID!, $fileUrl: String!, $originalFileName: String!) {
    team_uploadTaskV1(taskId: $taskId, fileUrl: $fileUrl, originalFileName: $originalFileName) {
      id
      v1Uploads { id }
    }
  }
`;
const TEAM_UPLOAD_TASK_FINAL_MUTATION = gql`
  mutation TeamUploadTaskFinal($taskId: ID!, $fileUrl: String!, $originalFileName: String!) {
    team_uploadTaskFinal(taskId: $taskId, fileUrl: $fileUrl, originalFileName: $originalFileName) {
      id
      status
      finalUpload { id }
    }
  }
`;
// ------------------------------------

const GIVE_PROPOSAL_AVIS_MUTATION = gql`
  mutation GiveProposalAvis($projectId: ID!, $status: String!, $reason: String) {
    giveProposalAvis(projectId: $projectId, status: $status, reason: $reason) {
      id
      preparationStatus
      proposalAvis {
        status
        reason
        givenBy { name }
        givenAt
      }
    }
  }
`;

/**
 * Kat-converti ay date (timestamp wla ISO string) l-objet Date s7i7
 */
function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  let date;
  // Check wach l-dateString raqm (timestamp)
  if (/^\d+$/.test(dateString)) {
    date = new Date(parseInt(dateString, 10));
  } else {
    // Ila ماشي raqm, t3aml m3ah b7al ISO string (e.g., "2025-11-21T...")
    date = new Date(dateString);
  }

  // T2kd l-date s7i7
  if (isNaN(date.getTime())) return null;
  return date;
}

// --- HADI L-FUNCTION L-LI KANT NAQSSA (1) ---
function formatDate(date: Date | null, formatStr: string = "PPP p") {
  if (!date) return "N/A";
  try {
    return format(date, formatStr);
  } catch (error) {
    return "Date Invalide";
  }
}
// ------------------------------------

// --- HADI L-FUNCTION L-LI KANT NAQSSA (2) ---
function calculateRemainingDays(dateString: string) {
  const deadline = parseDate(dateString); // Nst3mlo l-parser l-jdid

  if (!deadline) return { text: "N/A", color: "text-muted-foreground" };

  const today = new Date();
  const daysLeft = differenceInDays(deadline, today);

  if (daysLeft < 0) return { text: "Dépassé", color: "text-red-500 font-bold" };
  if (daysLeft === 0) return { text: "Auj.", color: "text-yellow-500 font-bold" };
  if (daysLeft <= 7) return { text: `${daysLeft} Jours`, color: "text-yellow-500" };
  return { text: `${daysLeft} Jours`, color: "text-green-500" };
}
// ------------------------------------

// --- COMPONENTS DYAL STATUS (Nafs l-code) ---
function TaskStatusPill({ status }: { status: string }) {
  return (
    <Badge variant={
      status === 'DONE' ? 'default' : status === 'IN_PROGRESS' ? 'outline' : 'secondary'
    } className={cn(
      "capitalize",
      status === 'DONE' && "bg-green-600 text-white",
      status === 'IN_PROGRESS' && "text-blue-500 border-blue-500"
    )}>
      {status.toLowerCase().replace('_', ' ')}
    </Badge>
  );
}

function ProjectStatusPill({ status }: { status: string }) {
  const safeStatus = status || "UNKNOWN";
  let dotColor = "";
  switch (safeStatus) {
    case 'DRAFT': dotColor = "bg-gray-400"; break;
    case 'TO_CONFIRM': dotColor = "bg-yellow-500"; break;
    case 'TO_PREPARE': dotColor = "bg-blue-500"; break;
    case 'FEASIBILITY_PENDING': dotColor = "bg-orange-500"; break;
    case 'CAUTION_PENDING': dotColor = "bg-pink-500"; break;
    case 'IN_PRODUCTION': dotColor = "bg-purple-500"; break;
    case 'DONE': dotColor = "bg-green-500"; break;
    case 'CANCELED': case 'NO': dotColor = "bg-red-500"; break;
    default: dotColor = "bg-gray-500";
  }
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
      <span className="text-sm text-muted-foreground capitalize">
        {safeStatus.toLowerCase().replace('_', ' ')}
      </span>
    </div>
  );
}
// ------------------------------------

// --- L-HELPER L-JDID DYAL L-CHECK ---
const hasFile = (docs: { fileName: string }[], docType: string) => {
  return docs.some(doc => doc.fileName === docType);
};


// --- SCHEMA DYAL ZOD ---
const projectManagerSchema = z.object({ id: z.string(), name: z.string() });
const documentSchema = z.object({ id: z.string(), fileName: z.string(), fileUrl: z.string().optional() });
const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  object: z.string(),
  status: z.string(),
  preparationStatus: z.string(),
  projectManagers: z.array(projectManagerSchema),
  stages: z.object({
    administrative: z.object({ documents: z.array(documentSchema) }),
    technical: z.object({ documents: z.array(documentSchema) })
  }).nullable(),
  submissionDeadline: z.string(),
  cautionRequestDate: z.string().nullable(),
  feasibilityChecks: z.object({
    administrative: z.string(),
    technical: z.string(),
    financial: z.string(),
  }),
  caution: z.object({
    status: z.string(),
  }),
  team: z.object({
    infographistes: z.array(z.object({ id: z.string(), name: z.string() })),
    team3D: z.array(z.object({ id: z.string(), name: z.string() })),
    assistants: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
  proposalAvis: z.object({
    status: z.string(),
    reason: z.string().optional(),
    givenBy: z.object({ name: z.string() }),
    givenAt: z.string(),
  }).optional().nullable(),
});
const latestTaskSchema = z.object({ /* ... */ }).nullable();
export const feedItemSchema = z.object({
  project: projectSchema,
  latestTask: latestTaskSchema,
});
export type ProjectFeedItem = z.infer<typeof feedItemSchema>;
type Project = z.infer<typeof projectSchema>;
type TeamMember = { id: string, name: string };

// --- L-COMPONENT L-JDID DYAL L-CELL ---
const FileStatusCell = ({ row, docType }: { row: any, docType: string }) => {
  const { data: meData } = useQuery(ME_QUERY);
  const userRole = meData?.me.role.name;

  // Safely get documents from administrative stage
  const docs = row.original.project.stages?.administrative?.documents || [];
  const file = docs.find((doc: { fileName: string, fileUrl?: string }) => doc.fileName === docType);

  // For PROPOSAL_MANAGER: Show checkmark/cross
  if (userRole === 'PROPOSAL_MANAGER') {
    return file
      ? <IconCircleCheckFilled className="text-green-500 mx-auto" />
      : <IconX className="text-red-500 mx-auto" />;
  }

  // For other roles: Show download button if file exists
  if (file && file.fileUrl) {
    // FIX: Properly construct the download URL
    const downloadUrl = `https://backoffice.urbagroupe.ma/${file.fileUrl}`;

    return (
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Télécharger ${file.fileName}`}
        className="flex justify-center"
      >
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <IconDownload className="h-5 w-5 text-primary" />
        </Button>
      </a>
    );
  }

  // No file available
  return <span className="text-muted-foreground mx-auto">N/A</span>;
};
// ------------------------------------

// --- L-COLUMNS ARRAY (Jdid b l-columns jdad) ---
export const columns: ColumnDef<ProjectFeedItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "project.object",
    header: "Dossier",
    cell: ({ row }) => <TableCellViewer item={row.original.project} />,
  },
  {
    accessorKey: "project.title",
    header: "Client"
  },

  // --- DOCUMENT COLUMNS ---
  {
    id: 'doc_cps',
    header: 'CPS',
    cell: ({ row }) => <FileStatusCell row={row} docType="CPS" />,
    enableHiding: true,
  },
  {
    id: 'doc_rc',
    header: 'RC',
    cell: ({ row }) => <FileStatusCell row={row} docType="RC" />,
    enableHiding: true,
  },
  {
    id: 'doc_avis',
    header: 'Avis',
    cell: ({ row }) => <FileStatusCell row={row} docType="Avis" />,
    enableHiding: true,
  },

  // --- L-COLUMNS L-L-ADMIN/CP ---
  {
    accessorKey: "project.preparationStatus",
    header: "Status Préparation",
    cell: ({ row }) => (
      <ProjectStatusPill status={row.original.project.preparationStatus} />
    ),
  },
  {
    id: 'remainingTime',
    header: 'Délai Restant',
    cell: ({ row }) => {
      const project = row.original.project;
      if (project.preparationStatus !== 'TO_PREPARE') {
        return <span className="text-muted-foreground">--</span>;
      }
      const { text, color } = calculateRemainingDays(project.submissionDeadline);
      return <span className={cn("text-sm", color)}>{text}</span>;
    }
  },
  {
    accessorKey: "project.projectManagers",
    header: "Chef de Projet",
    cell: ({ row }) => {
      const pm = row.original.project.projectManagers[0];
      return <div>{pm ? pm.name : "N/A"}</div>;
    },
  },
  // ---------------------------------

  // --- COLUMN JDIDA L-L-ÉQUIPE (ANAS) ---
  {
    id: 'tasks_checklist',
    header: 'Checklist Tâches',
    cell: ({ row }) => {
      return <TaskChecklistPanel project={row.original.project} />;
    }
  },
  // ---------------------------------

  { accessorKey: "latestTask.description", header: "Dernière Tâche" },
  { accessorKey: "latestTask.status", header: "Status Tâche" },
  { id: "actions", cell: ({ row }) => <ProjectActionsMenu project={row.original.project} /> },
];

// --- L-FUNCTION "DataTable" (BDIL Kbir) ---
export function DataTable({
  columns,
  data,
}: {
  columns: ColumnDef<ProjectFeedItem>[];
  data: ProjectFeedItem[];
}) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data: meData, loading: roleLoading } = useQuery(ME_QUERY);
  const userRole = meData?.me.role.name;


  const table = useReactTable({
    data,
    columns,
    state: {
      sorting, columnVisibility, rowSelection, columnFilters, pagination,
    },
    getRowId: (row) => row.project.id,
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

  // --- L-LOGIC L-S7I7 DYAL L-ROLES ---
  React.useEffect(() => {
    if (roleLoading) return;
    if (userRole === 'PROPOSAL_MANAGER') {
      table.getColumn('project.preparationStatus')?.toggleVisibility(false);
      table.getColumn('project.projectManagers')?.toggleVisibility(false);
      table.getColumn('remainingTime')?.toggleVisibility(false);
    } else if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER' || userRole === 'FINANCE') {
      table.getColumn('doc_cps')?.toggleVisibility(false);
      table.getColumn('doc_rc')?.toggleVisibility(false);
      table.getColumn('doc_avis')?.toggleVisibility(false);
    } else if (userRole === 'CREATIVE' || userRole === '3D_ARTIST' || userRole === 'ASSISTANT_PM') {
      // Team members kaychofo ghir l-columns l-assassin
      table.getColumn('doc_cps')?.toggleVisibility(false);
      table.getColumn('doc_rc')?.toggleVisibility(false);
      table.getColumn('doc_avis')?.toggleVisibility(false);
      table.getColumn('project.preparationStatus')?.toggleVisibility(false);
      table.getColumn('project.projectManagers')?.toggleVisibility(false);
      table.getColumn('remainingTime')?.toggleVisibility(false);
      table.getColumn('latestTask.description')?.toggleVisibility(false);
      table.getColumn('latestTask.status')?.toggleVisibility(false);
    }
  }, [userRole, roleLoading, table]);
  // ----------------------------------------------------

  // --- HELPER FUNCTION L-FILE STATUS ---
  const getFileStatus = (docs: { fileName: string }[], docType: string) => {
    const file = docs.find(doc => doc.fileName === docType);
    return {
      exists: !!file,
      file: file || null
    };
  };

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="outline">Outline</TabsTrigger>
          <TabsTrigger value="past-performance">
            Past Performance <Badge variant="secondary">3</Badge>
          </TabsTrigger>
          <TabsTrigger value="key-personnel">
            Key Personnel <Badge variant="secondary">2</Badge>
          </TabsTrigger>
          <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter((column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.split(".").pop()}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <CreateProjectDrawer />
        </div>
      </div>
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
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
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* L-Tabs l-khrin (Khllinahom) */}
      <TabsContent value="past-performance" className="flex flex-col px-4 lg:px-6">
        {/* ... */}
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        {/* ... */}
      </TabsContent>
      <TabsContent value="focus-documents" className="flex flex-col px-4 lg:px-6">
        {/* ... */}
      </TabsContent>
    </Tabs>
  );
}


// --- L-PANEL L-JDID (TableCellViewer) m3a L-LOGIC DYAL L-ROLES ---

// (Hada component sghir dyal l-Preview l-l-Admin)
function ProjectPreviewPanel({ project }: { project: Project }) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);

  const [getLogs, { data: logData, loading: logLoading }] = useLazyQuery(GET_LOGS_QUERY);

  const handleTriggerClick = () => {
    setIsOpen(true);
    if (!logData) {
      getLogs({ variables: { projectId: project.id } });
    }
  };

  // 1. N-parsiw l-dates l-wlin
  const submissionDate = parseDate(project.submissionDeadline);
  const cautionDate = submissionDate ? subDays(submissionDate, 7) : null;

  const content = (
    <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
      {/* 1. Détails */}
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h4 className="font-semibold">Détails du Projet</h4>
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Client:</span>
          <span className="font-medium">{project.title}</span>
          <span className="text-muted-foreground">Projet:</span>
          <span className="font-medium">{project.object}</span>
          <span className="text-muted-foreground">Status:</span>
          <span><ProjectStatusPill status={project.preparationStatus} /></span>
          <span className="text-muted-foreground">Chef de Projet:</span>
          <span className="font-medium">
            {project.projectManagers[0]?.name || "N/A"}
          </span>
        </div>
      </div>

      {/* 2. L-Dates */}
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h4 className="font-semibold flex items-center gap-2">
          <IconClock className="h-4 w-4" />
          Dates Clés
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Demande Caution (Calc.):</span>
          <span className="font-medium">{formatDate(cautionDate, "PPP")}</span>
          <span className="text-muted-foreground">Date de Dépôt:</span>
          <span className="font-medium text-red-500">{formatDate(submissionDate, "PPP p")}</span>
        </div>
      </div>

      {/* 3. L-BLOC L-JDID DYAL L-ÉQUIPE */}
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h4 className="font-semibold flex items-center gap-2">
          <IconUsers className="h-4 w-4" />
          Équipe Assignée
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Infographistes:</span>
          <div className="flex flex-col">
            {project.team.infographistes.length > 0 ? (
              project.team.infographistes.map(u => <span key={u.id} className="font-medium">{u.name}</span>)
            ) : <span className="font-medium text-muted-foreground">N/A</span>}
          </div>

          <span className="text-muted-foreground">Équipe 3D:</span>
          <div className="flex flex-col">
            {project.team.team3D.length > 0 ? (
              project.team.team3D.map(u => <span key={u.id} className="font-medium">{u.name}</span>)
            ) : <span className="font-medium text-muted-foreground">N/A</span>}
          </div>

          <span className="text-muted-foreground">Assistants:</span>
          <div className="flex flex-col">
            {project.team.assistants.length > 0 ? (
              project.team.assistants.map(u => <span key={u.id} className="font-medium">{u.name}</span>)
            ) : <span className="font-medium text-muted-foreground">N/A</span>}
          </div>
        </div>
      </div>
      {/* ---------------------------------- */}

      {/* 4. L-Tracabilité */}
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h4 className="font-semibold flex items-center gap-2">
          <IconActivity className="h-4 w-4" />
          Traçabilité (Logs)
        </h4>
        <div className="max-h-48 overflow-y-auto">
          {logLoading && <Skeleton className="h-8 w-full" />}
          {logData && logData.logs.length === 0 && <p className="text-muted-foreground">Aucune activité.</p>}
          <ul className="list-none space-y-2">
            {logData?.logs.map((log: any) => (
              <li key={log.id} className="text-xs">
                <span className="font-medium">{log.user.name}</span>
                <span className="text-muted-foreground">: {log.details}</span>
                <br />
                <span className="text-muted-foreground/70">{formatDate(parseDate(log.createdAt))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const trigger = (
    <DropdownMenuItem onSelect={(e) => {
      e.preventDefault();
      handleTriggerClick();
    }}>
      <IconEye className="mr-2 h-4 w-4" />
      Preview
    </DropdownMenuItem>
  );

  const footer = (<Button variant="outline">Done</Button>);

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="gap-1">
            <DrawerTitle>{project.object}</DrawerTitle>
            <DrawerDescription>Aperçu du dossier (Read-Only).</DrawerDescription>
          </DrawerHeader>
          {content}
          <DrawerFooter>
            <DrawerClose asChild>{footer}</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader className="gap-1">
          <SheetTitle>{project.object}</SheetTitle>
          <SheetDescription>Aperçu du dossier (Read-Only).</SheetDescription>
        </SheetHeader>
        {content}
        <SheetFooter>
          <SheetClose asChild>{footer}</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// (Hada component dyal l-Actions Menu)
function ProjectActionsMenu({ project }: { project: Project }) {
  const { data: meData } = useQuery(ME_QUERY);
  const userRole = meData?.me.role.name;

  const handleViewTasks = () => {
    toast.info("Page dyal l-tasks baqia ma wajdach.");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <IconDotsVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">

        {/* L-Button "Preview" kayban l-kolchi db */}
        <ProjectPreviewPanel project={project} />

        <DropdownMenuItem onClick={handleViewTasks}>
          View Tasks
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {userRole === 'ADMIN' && (
          <DropdownMenuItem variant="destructive">
            Delete
          </DropdownMenuItem>
        )}

      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --- HADA L-PANEL L-JDID DYAL L-ÉQUIPE (ANAS) ---
// (UI JDID B Accordion w Uploads)
function TaskChecklistPanel({ project }: { project: Project }) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
  const { data: meData } = useQuery(ME_QUERY);
  const currentUserId = meData?.me.id;

  // File state l-l-upload
  const [fileV1, setFileV1] = React.useState<File | null>(null);
  const [fileFinal, setFileFinal] = React.useState<File | null>(null);

  // Lazy Query l-l-Tasks
  const [getTasks, { data: taskData, loading: taskLoading }] = useLazyQuery(GET_TASKS_BY_PROJECT_QUERY);

  // Mutations
  const [updateTaskStatus, { loading: loadingTaskUpdate }] = useMutation(PM_UPDATE_TASK_STATUS_MUTATION, {
    onCompleted: () => toast.success("Status de la tâche mis à jour!"),
    onError: (error) => toast.error(`Error: ${error.message}`),
    refetchQueries: [
      { query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: project.id } },
      { query: GET_PROJECTS_FEED }
    ],
  });
  const [uploadV1, { loading: loadingV1 }] = useMutation(TEAM_UPLOAD_TASK_V1_MUTATION, {
    onCompleted: () => { toast.success("Screenshot V1 uploadé!"); setFileV1(null); },
    onError: (error) => toast.error(`Error: ${error.message}`),
    refetchQueries: [{ query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: project.id } }],
  });
  const [uploadFinal, { loading: loadingFinal }] = useMutation(TEAM_UPLOAD_TASK_FINAL_MUTATION, {
    onCompleted: () => { toast.success("Version Finale uploadée!"); setFileFinal(null); },
    onError: (error) => toast.error(`Error: ${error.message}`),
    refetchQueries: [{ query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: project.id } }],
  });

  const handleTriggerClick = () => {
    setIsOpen(true);
    getTasks({ variables: { projectId: project.id } });
  };

  const handleTaskStatusChange = (taskId: string, newStatus: string) => {
    updateTaskStatus({
      variables: { taskId: taskId, status: newStatus }
    });
  };

  // Update the handleFileUploadAndMutate function
  const handleFileUploadAndMutate = async (
    file: File | null, // <-- HADA HOWA L-FILE LI DÉJA OPTIMISÉ
    mutation: Function,
    docType: string, // "TASK_V1" or "TASK_FINAL"
    taskId: string
  ) => {
    if (!file) {
      toast.error(`Aucun fichier sélectionné.`);
      return false;
    }

    try {
      // --- L-MODIFICATION BDAT HNA ---

      // 7IYYEDNA: const optimizedFile = await optimizeAndValidateFile(file, 50);
      // L-fichier déja optimisé mn FileUpload.tsx

      const formDataRest = new FormData();
      formDataRest.append('file', file); // <-- N-sifto l-fichier l-s7i7

      toast.loading(`Optimisation et upload de ${file.name}...`);

      const response = await fetch(`https://backoffice.urbagroupe.ma/api/upload/${project.id}`, {
        method: 'POST',
        body: formDataRest
      });

      if (!response.ok) throw new Error('File upload failed.');

      const result = await response.json();
      const fileUrl = result.fileUrl;
      toast.dismiss();

      // Had l-function khassa ghir b les tâches
      const mutationVariables = {
        taskId: taskId,
        originalFileName: file.name, // <-- Nst3mlo l-fichier l-s7i7
        fileUrl: fileUrl,
      };

      await mutation({ variables: mutationVariables });

      toast.success(`Fichier uploadé avec succès! (${(file.size / 1024 / 1024).toFixed(2)} MB)`); // <-- Nst3mlo l-fichier l-s7i7
      return true;

      // --- L-MODIFICATION SALAT HNA ---
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Erreur: ${error.message}`);
      return false;
    }
  };

  const myTasks = taskData?.tasksByProject.filter(
    (task: any) => task.assignedTo.id === currentUserId
  );

  const content = (
    <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h4 className="font-semibold">Mes Tâches pour: {project.object}</h4>

        <div className="max-h-96 overflow-y-auto">
          {taskLoading && <Skeleton className="h-8 w-full" />}
          {myTasks && myTasks.length === 0 && <p className="text-muted-foreground">Aucune tâche assignée.</p>}

          <Accordion type="single" collapsible className="w-full">
            {myTasks?.map((task: any) => (
              <AccordionItem value={task.id} key={task.id}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium">{task.description}</span>
                    <TaskStatusPill status={task.status} />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-muted/50 rounded-b-md">
                  <div className="flex flex-col gap-4">
                    {/* 1. Bdil Status */}
                    <div>
                      <Label>Changer Status</Label>
                      <Select
                        value={task.status}
                        onValueChange={(newStatus) => handleTaskStatusChange(task.id, newStatus)}
                        disabled={loadingTaskUpdate}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODO">To Do</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="DONE">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* 2. Upload V1 */}
                    <div>
                      <Label>Upload Screenshot (V1)</Label>
                      <FileUpload
                        label="Screenshot V1"
                        onFileSelect={(file) => setFileV1(file)}
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        disabled={loadingV1 || !fileV1}
                        onClick={() => handleFileUploadAndMutate(fileV1, uploadV1, 'TASK_V1', task.id)}
                      >
                        {loadingV1 ? "Uploading V1..." : "Uploader V1"}
                      </Button>
                      {/* TODO: Affichi l-lista dyal V1 uploads */}
                    </div>

                    <Separator />

                    {/* 3. Upload Final */}
                    <div>
                      <Label>Upload Version Finale</Label>
                      <FileUpload
                        label="Version Finale"
                        onFileSelect={(file) => setFileFinal(file)}
                      />
                      <Button
                        size="sm"
                        className="mt-2 bg-green-600 hover:bg-green-700"
                        disabled={loadingFinal || !fileFinal}
                        onClick={() => handleFileUploadAndMutate(fileFinal, uploadFinal, 'TASK_FINAL', task.id)}
                      >
                        {loadingFinal ? "Uploading Final..." : "Uploader Version Finale"}
                      </Button>
                      {/* TODO: Affichi l-fichier finali ila kan */}
                    </div>

                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );

  // L-Trigger (l-button li f l-table)
  const trigger = (
    <Button variant="outline" size="sm" className="w-full" onClick={handleTriggerClick}>
      <IconListCheck className="mr-2 h-4 w-4" />
      Voir Checklist
    </Button>
  );

  const footer = (<Button variant="outline">Fermer</Button>);

  // BDILNA HNA (UI JDID)
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="gap-1"><DrawerTitle>Checklist Tâches</DrawerTitle></DrawerHeader>
          {content}
          <DrawerFooter><DrawerClose asChild>{footer}</DrawerClose></DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      {/* ZIDNA 3RD HNA HTA HOWA */}
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader className="gap-1"><SheetTitle>Checklist Tâches</SheetTitle></SheetHeader>
        {content}
        <SheetFooter><SheetClose asChild>{footer}</SheetClose></SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// --- COMPONENT L-JDID DYAL L-UI L-TEAM ---
function MultiSelectPopover({ title, options, selectedIds, onChange }: {
  title: string;
  options: TeamMember[];
  selectedIds: string[];
  onChange: (id: string, isChecked: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selectedIds.length > 0 ? `${selectedIds.length} sél.` : title}
          </span>
          <IconChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder={`Chercher ${title}...`} />
          <CommandList>
            <CommandEmpty>Aucun membre trouvé.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    onChange(option.id, !selectedIds.includes(option.id));
                  }}
                >
                  <IconCheck
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.includes(option.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
// ------------------------------------------

// (Hada howa l-component l-kbir dyal l-modification)
function TableCellViewer({ item }: { item: Project }) {
  const isMobile = useIsMobile();
  const { data: meData } = useQuery(ME_QUERY);
  const userRole = meData?.me.role.name;
  const userPermissions = meData?.me.role.permissions || [];

  // --- L-STATE DYAL L-FORMS ---
  const [fileCPS, setFileCPS] = React.useState<File | null>(null);
  const [fileRC, setFileRC] = React.useState<File | null>(null);
  const [fileAvis, setFileAvis] = React.useState<File | null>(null);
  const [fileTech, setFileTech] = React.useState<File | null>(null);
  const [fileEstimate, setFileEstimate] = React.useState<File | null>(null);
  const [fileAsset, setFileAsset] = React.useState<File | null>(null); // <-- ZIDNA HADA

  const [adminFormData, setAdminFormData] = React.useState({
    status: item.preparationStatus,
    projectManagerId: item.projectManagers[0]?.id || ''
  });
  const [feasibilityData, setFeasibilityData] = React.useState({
    administrative: item.feasibilityChecks.administrative,
    technical: item.feasibilityChecks.technical,
    financial: item.feasibilityChecks.financial
  });
  const [teamData, setTeamData] = React.useState({
    infographisteIds: item.team.infographistes.map(u => u.id),
    team3DIds: item.team.team3D.map(u => u.id),
    assistantIds: item.team.assistants.map(u => u.id),
  });
  const [formData, setFormData] = React.useState({ ...item });
  const [newTaskDesc, setNewTaskDesc] = React.useState("");
  const [newTaskAssignee, setNewTaskAssignee] = React.useState("");
  const [newTaskDept, setNewTaskDept] = React.useState("");

  // --- L-Mutations ---
  const [updateProject, { loading: loadingUpdate }] = useMutation(UPDATE_PROJECT_MUTATION, { /* ... */ });
  const [uploadDocument, { loading: loadingUpload }] = useMutation(UPLOAD_DOCUMENT_MUTATION, { /* ... */ });
  const [submitForReview, { loading: loadingSubmit }] = useMutation(SUBMIT_REVIEW_MUTATION, { /* ... */ });
  const [adminAssignProject, { loading: loadingAssign }] = useMutation(ADMIN_ASSIGN_PROJECT_MUTATION, { /* ... */ });
  const [cpUploadEstimate, { loading: loadingEstimate }] = useMutation(CP_UPLOAD_ESTIMATE_MUTATION, { /* ... */ });
  const [adminRunFeasibility, { loading: loadingFeasibility }] = useMutation(ADMIN_RUN_FEASIBILITY_MUTATION, { /* ... */ });
  const [adminLaunchProject, { loading: loadingLaunch }] = useMutation(ADMIN_LAUNCH_PROJECT_MUTATION, { /* ... */ });
  const [financeRequestCaution, { loading: loadingCaution }] = useMutation(FINANCE_REQUEST_CAUTION_MUTATION, { /* ... */ });
  const [cpAssignTeam, { loading: loadingTeam }] = useMutation(CP_ASSIGN_TEAM_MUTATION, { /* ... */ });
  const [createTask, { loading: loadingTaskCreate }] = useMutation(PM_CREATE_TASK_MUTATION, {
    onCompleted: () => {
      toast.success("Tâche créée!");
      setNewTaskDesc("");
      setNewTaskAssignee("");
      setNewTaskDept("");
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
    refetchQueries: [
      { query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: item.id } },
      { query: GET_PROJECTS_FEED }
    ],
  });
  // --- ZID L-MUTATION L-JDIDA ---
  const [giveProposalAvis, { loading: loadingAvis }] = useMutation(GIVE_PROPOSAL_AVIS_MUTATION, {
    onCompleted: () => {
      toast.success("Avis enregistré!");
      setAvisData({ status: '', reason: '' });
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
    refetchQueries: [{ query: GET_PROJECTS_FEED }],
  });
  const [updateTaskStatus, { loading: loadingTaskUpdate }] = useMutation(PM_UPDATE_TASK_STATUS_MUTATION, { /* ... */ });

  // --- ZIDNA HADI L-MUTATION L-JDIDA (CP ASSET) ---
  const [cpUploadAsset, { loading: loadingAsset }] = useMutation(CP_UPLOAD_ASSET_MUTATION, {
    onCompleted: () => { toast.success("Asset uploadé!"); setFileAsset(null); },
    onError: (error) => toast.error(`Error: ${error.message}`),
    refetchQueries: [{ query: GET_PROJECTS_FEED }], // N-refreshiw l-docs
  });

  // --- ZID HNA L-STATE L-JDID ---
  const [avisData, setAvisData] = React.useState({
    status: '',
    reason: ''
  });

  // --- L-Queries ---
  const { data: pmData, loading: loadingPMs } = useQuery(GET_PROJECT_MANAGERS, {
    skip: userRole !== 'ADMIN'
  });
  const { data: teamMembers, loading: loadingTeamMembers } = useQuery(GET_TEAM_MEMBERS, {
    skip: !(userRole === 'ADMIN' || userPermissions.includes('assign_creative_tasks'))
  });
  const { data: taskData, loading: taskLoading } = useQuery(GET_TASKS_BY_PROJECT_QUERY, {
    variables: { projectId: item.id },
    skip: !item.id,
  });

  // --- L-Functions dyal l-Forms ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData({ ...formData, [e.target.id]: e.target.value }); };
  const handleSelectChange = (id: string, value: string) => { setFormData({ ...formData, [id]: value }); };

  // --- HADI L-FUNCTION L-LI KANT NAQSSA (1) ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProject({
      variables: {
        id: item.id, input: {
          title: formData.title,
          object: formData.object,
          status: formData.status
        }
      }
    });
  };
  // ----------------------------------------


  const handleAvisFormChange = (field: string, value: string) => {
    setAvisData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitAvis = () => {
    if (!avisData.status) {
      toast.error("Veuillez sélectionner une décision");
      return;
    }

    if (avisData.status === 'NOT_ACCEPTED' && !avisData.reason.trim()) {
      toast.error("Veuillez saisir la raison du refus");
      return;
    }

    giveProposalAvis({
      variables: {
        projectId: item.id,
        status: avisData.status,
        reason: avisData.reason || null
      }
    });
  };

  const handleAdminFormChange = (id: string, value: string) => {
    setAdminFormData(prev => ({ ...prev, [id]: value }));
  };
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adminAssignProject({
      variables: {
        input: {
          projectId: item.id,
          projectManagerIds: [adminFormData.projectManagerId],
          status: adminFormData.status,
        }
      }
    });
  };
  const handleFeasibilityChange = (checkType: string, value: string) => {
    adminRunFeasibility({ variables: { input: { projectId: item.id, checkType, status: value } } });
    setFeasibilityData(prev => ({ ...prev, [checkType]: value }));
  };
  const handleLaunchProject = () => {
    adminLaunchProject({ variables: { projectId: item.id } });
  };
  const handleRequestCaution = () => {
    financeRequestCaution({ variables: { projectId: item.id } });
  };

  // Function dyal l-upload l-jdida (b REST)
  const handleFileUploadAndMutate = async (
    file: File | null, // <-- HADA HOWA L-FILE LI DÉJA OPTIMISÉ
    mutation: Function,
    docType: string,
    stageName?: string
  ) => {
    const projectId = item.id;
    if (!file) {
      toast.error(`Aucun fichier ${docType} sélectionné.`);
      return false;
    }
    const formDataRest = new FormData();
    formDataRest.append('file', file);
    try {
      toast.loading(`Uploading ${file.name}...`);
      const response = await fetch(`https://backoffice.urbagroupe.ma/api/upload/${projectId}`, { method: 'POST', body: formDataRest });
      if (!response.ok) throw new Error('File upload failed.');
      const result = await response.json();
      const fileUrl = result.fileUrl;
      toast.dismiss();

      await mutation({
        variables: {
          projectId: projectId,
          stageName: stageName,
          docType: docType,
          originalFileName: file.name,
          fileUrl: fileUrl,
        },
      });
      // --- L-MODIFICATION HNA ---
      toast.success(`Fichier uploadé avec succès! (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      return true;
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Error uploading file: ${error.message}`);
      return false;
    }
  };

  const handleSubmitEstimate = () => {
    handleFileUploadAndMutate(fileEstimate, cpUploadEstimate, 'CP_ESTIMATE', 'technical');
  };
  const handleAssignTeam = () => {
    cpAssignTeam({ variables: { input: { projectId: item.id, ...teamData } } });
  };

  // --- S777NA HADI (2) ---
  const handleSubmitForReview = async () => {
    if (!fileCPS || !fileRC || !fileAvis) {
      toast.error("Il faut sélectionner les 3 fichiers (CPS, RC, Avis) d'abord.");
      return;
    }

    const cpsOK = await handleFileUploadAndMutate(fileCPS, uploadDocument, 'CPS', 'administrative');
    const rcOK = await handleFileUploadAndMutate(fileRC, uploadDocument, 'RC', 'administrative');
    const avisOK = await handleFileUploadAndMutate(fileAvis, uploadDocument, 'Avis', 'administrative');

    if (fileTech) {
      await handleFileUploadAndMutate(fileTech, uploadDocument, 'Fichier Technique', 'technical');
    }

    if (cpsOK && rcOK && avisOK) {
      submitForReview({ variables: { projectId: item.id } });
    } else {
      toast.error("Un problème est survenu lors de l'upload. Veuillez réessayer.");
    }
  };
  // ------------------------------------------

  // --- L-FUNCTION L-JDIDA L-TEAM (MultiSelect) ---
  const handleTeamChange = (type: 'infographisteIds' | 'team3DIds' | 'assistantIds', userId: string, isChecked: boolean) => {
    setTeamData(prev => {
      const currentIds = prev[type] || [];
      let newIds;
      if (isChecked) {
        newIds = [...currentIds, userId];
      } else {
        newIds = currentIds.filter(id => id !== userId);
      }
      return { ...prev, [type]: newIds };
    });
  };

  // L-Function l-jdida dyal l-tasks
  const handleCreateTask = () => {
    if (!newTaskDesc || !newTaskAssignee || !newTaskDept) {
      toast.error("Description, Assignation, et Département sont requis.");
      return;
    }
    createTask({
      variables: {
        input: {
          projectId: item.id,
          description: newTaskDesc,
          assignedToId: newTaskAssignee,
          department: newTaskDept,
        }
      }
    });
  };

  // L-Function l-jdida dyal update tasks
  const handleTaskStatusChange = (taskId: string, newStatus: string) => {
    updateTaskStatus({
      variables: { taskId: taskId, status: newStatus }
    });
  };

  // --- FUNCTION JDIDA L-CP ASSET ---
  const handleSubmitAsset = () => {
    handleFileUploadAndMutate(fileAsset, cpUploadAsset, 'ASSET', 'technical');
  };

  React.useEffect(() => { setFormData({ ...item }); }, [item]);
  const loading = loadingUpdate || loadingUpload || loadingSubmit || loadingAssign || loadingEstimate || loadingFeasibility || loadingLaunch || loadingCaution || loadingTeam || loadingTaskCreate || loadingTaskUpdate;

  // L-Checks dyal l-Status
  const existingAdminDocs = item.stages?.administrative?.documents || [];
  const isDraft = item.preparationStatus === 'DRAFT';
  const isPendingAdminReview = item.preparationStatus === 'TO_CONFIRM';
  const isToPrepare = item.preparationStatus === 'TO_PREPARE';
  const isFeasibilityPending = item.preparationStatus === 'FEASIBILITY_PENDING';
  const isCautionPending = item.preparationStatus === 'CAUTION_PENDING';
  const isInProduction = item.preparationStatus === 'IN_PRODUCTION';

  // --- L-FUNCTION L-RA2ISSIA L-RENDER ---
  const renderPanelContent = () => {
    // 1. L-7ala dyal Yassmin
    if (userRole === 'PROPOSAL_MANAGER') {
      return (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          {isDraft ? (
            <>
              <h4 className="font-semibold">Dossier Administratif (Requis)</h4>
              <p className="text-xs text-muted-foreground">
                Veuillez uploader les 3 documents requis (CPS, RC, Avis) pour soumettre le projet.
              </p>
              <FileUpload label="CPS (Requis)" onFileSelect={(file) => setFileCPS(file)} />
              <FileUpload label="RC (Requis)" onFileSelect={(file) => setFileRC(file)} />
              <FileUpload label="Avis de Marché (Requis)" onFileSelect={(file) => setFileAvis(file)} />
              <Separator />
              <h4 className="font-semibold mt-2">Dossier Technique (Optionnel)</h4>
              <FileUpload label="Fichier Technique" onFileSelect={(file) => setFileTech(file)} />
            </>
          ) : (
            <h4 className="font-semibold text-green-600">
              Ce projet a été soumis à l'administration.
            </h4>
          )}
          {existingAdminDocs.length > 0 && (
            <div className="mt-2">
              <Label>Fichiers Déjà Uploadés:</Label>
              <ul className="list-disc pl-5 text-muted-foreground">
                {existingAdminDocs.map(doc => (
                  <li key={doc.id}>{doc.fileName}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // 2. L-7ala dyal l-Admin (Dossier jdid)
    if (userRole === 'ADMIN' && isPendingAdminReview) {
      return (
        <form id="admin-assign-form" className="flex flex-col gap-4" onSubmit={handleAdminSubmit}>
          <h4 className="font-semibold">Validation Administrative</h4>
          <div className="flex flex-col gap-3">
            <Label htmlFor="status">Décision</Label>
            <Select value={adminFormData.status} onValueChange={(value) => handleAdminFormChange("status", value)}>
              <SelectTrigger id="status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TO_PREPARE">À Préparer (Oui)</SelectItem>
                <SelectItem value="NO">Non (Refusé)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="projectManagerId">Assigner Chef de Projet</Label>
            {loadingPMs ? <Skeleton className="h-10 w-full" /> : (
              <Select value={adminFormData.projectManagerId} onValueChange={(value) => handleAdminFormChange("projectManagerId", value)}>
                <SelectTrigger id="projectManagerId" className="w-full"><SelectValue placeholder="Choisir un CP..." /></SelectTrigger>
                <SelectContent>
                  {pmData?.users.map((pm: { id: string, name: string }) => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </form>
      );
    }
    // --- HNA L-MODIFICATION ---
    // 3. L-7ala dyal l-CP (Dossier jdid "TO_PREPARE")
    if (userPermissions.includes('manage_assigned_projects') && isToPrepare) {
      return (
        <div className="flex flex-col gap-6 w-full"> {/* ZEDNA GAP HNA */}

          {/* Bloc 1: Upload Estimate (Bdelnah chwiya) */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <h4 className="font-semibold">Étape 1: Estimation de Coût</h4>
            <p className="text-xs text-muted-foreground">
              Veuillez uploader l'estimation (Excel) pour que l'Admin puisse faire la Feasibility Check.
            </p>
            <FileUpload label="Estimation de Coût (Excel)" onFileSelect={(file) => setFileEstimate(file)} />
            {/* ZEDNA L-BUTTON HNA BLA FORM */}
            <Button onClick={handleSubmitEstimate} disabled={loadingEstimate || !fileEstimate} size="sm" className="mt-2 w-fit self-end">
              {loadingEstimate ? "Uploading..." : "Uploader l'Estimation"}
            </Button>
          </div>

          {/* Bloc 2: Avis (HADA JDID) */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <h4 className="font-semibold">Étape 2: Avis sur la Proposition</h4>
            <p className="text-xs text-muted-foreground">
              Donnez votre avis pour envoyer ce projet à l'étape de faisabilité (Admin) ou le refuser.
            </p>
            <div className="flex flex-col gap-3">
              <Label htmlFor="avis-status">Décision</Label>
              <Select value={avisData.status} onValueChange={(value) => handleAvisFormChange("status", value)}>
                <SelectTrigger id="avis-status"><SelectValue placeholder="Choisir une décision..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCEPTED">✅ Accepté (pour Feasibility)</SelectItem>
                  <SelectItem value="NOT_ACCEPTED">❌ Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* L-Textarea dyal l-Reason (conditionnel) */}
            {avisData.status === 'NOT_ACCEPTED' && (
              <div className="flex flex-col gap-3">
                <Label htmlFor="avis-reason">Raison du Refus (Obligatoire)</Label>
                <Textarea
                  id="avis-reason"
                  placeholder="Expliquer pourquoi ce projet est refusé..."
                  value={avisData.reason}
                  onChange={(e) => handleAvisFormChange("reason", e.target.value)}
                />
              </div>
            )}

            <Button onClick={handleSubmitAvis} disabled={loadingAvis} size="sm" className="mt-2 w-fit self-end">
              {loadingAvis ? "Enregistrement..." : "Enregistrer l'Avis"}
            </Button>
          </div>
        </div>
      );
    }
    // --- FIN DYAL L-MODIFICATION ---


    // 4. L-7ala dyal l-Admin (Kaydir l-Feasibility)
    if (userRole === 'ADMIN' && isFeasibilityPending) {
      const { administrative, technical, financial } = feasibilityData;
      return (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h4 className="font-semibold">Étape: Feasibility Checks</h4>
          <p className="text-xs text-muted-foreground">
            Veuillez valider les 3 points (l'estimation financière est basée sur le fichier du CP).
          </p>
          <div className="flex flex-col gap-3">
            <Label>Check Administratif</Label>
            <Select value={administrative} onValueChange={(v) => handleFeasibilityChange('administrative', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PASS">Pass</SelectItem>
                <SelectItem value="FAIL">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3">
            <Label>Check Technical</Label>
            <Select value={technical} onValueChange={(v) => handleFeasibilityChange('technical', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PASS">Pass</SelectItem>
                <SelectItem value="FAIL">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3">
            <Label>Check Financial</Label>
            <Select value={financial} onValueChange={(v) => handleFeasibilityChange('financial', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PASS">Pass</SelectItem>
                <SelectItem value="FAIL">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div >
      );
    }

    // 7ala jdida 5: Safia (Caution)
    if (userPermissions.includes('manage_cautions') && isCautionPending) {
      return (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h4 className="font-semibold">Étape: Demande de Caution</h4>
          <p className="text-xs text-muted-foreground">
            Veuillez confirmer que la caution a été demandée à la banque.
          </p>
        </div>
      );
    }

    // --- HNA L-BDIL L-JDID (L-FORM DYAL L-TEAM + L-TASKS) ---
    // 6. L-7ala dyal l-CP w l-Admin (Production)
    if ((userPermissions.includes('assign_creative_tasks') || userRole === 'ADMIN') && isInProduction) {
      if (loadingTeamMembers) {
        return <Skeleton className="h-40 w-full" />;
      }

      const allTeamMembers = [
        ...(teamMembers?.infographistes || []),
        ...(teamMembers?.team3D || []),
        ...(teamMembers?.assistants || [])
      ];

      // --- L-BDIL L-JDID (L-LOGIC 4) ---
      const assignedTeamMembers = allTeamMembers.filter(member =>
        teamData.infographisteIds.includes(member.id) ||
        teamData.team3DIds.includes(member.id) ||
        teamData.assistantIds.includes(member.id)
      );
      // --------------------------------

      return (
        <div className="flex flex-col gap-6 w-full">
          {/* --- BLOC 1: ASSIGNATION ÉQUIPE (UI JDID) --- */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <h4 className="font-semibold">Étape: Assignation Équipe</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Infographistes</Label>
                <MultiSelectPopover
                  title="Choisir..."
                  options={teamMembers?.infographistes || []}
                  selectedIds={teamData.infographisteIds}
                  onChange={(id, checked) => handleTeamChange('infographisteIds', id, checked)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Équipe 3D</Label>
                <MultiSelectPopover
                  title="Choisir..."
                  options={teamMembers?.team3D || []}
                  selectedIds={teamData.team3DIds}
                  onChange={(id, checked) => handleTeamChange('team3DIds', id, checked)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Assistants</Label>
                <MultiSelectPopover
                  title="Choisir..."
                  options={teamMembers?.assistants || []}
                  selectedIds={teamData.assistantIds}
                  onChange={(id, checked) => handleTeamChange('assistantIds', id, checked)}
                />
              </div>
            </div>
            <Button onClick={handleAssignTeam} disabled={loadingTeam} size="sm" className="mt-2 w-fit self-end">
              {loadingTeam ? "Assignation..." : "Enregistrer l'Équipe"}
            </Button>
          </div>

          {/* --- BLOC 2: UPLOAD ASSETS (JDID L-CP) --- */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <h4 className="font-semibold">Étape: Assets & Inspiration</h4>
            <p className="text-xs text-muted-foreground">
              Uploadez les assets (inspiration, charte, etc.) pour l'équipe.
            </p>
            <FileUpload label="Fichier Asset (Inspiration, etc.)" onFileSelect={(file) => setFileAsset(file)} />
            <Button onClick={handleSubmitAsset} disabled={loadingAsset || !fileAsset} size="sm" className="mt-2 w-fit self-end">
              {loadingAsset ? "Uploading..." : "Uploader Asset"}
            </Button>
            {/* TODO: Affichi l-lista dyal l-assets li t-uploadaw */}
          </div>

          <Separator />

          {/* --- BLOC 3: GESTION DES TÂCHES --- */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <h4 className="font-semibold">Étape: Gestion des Tâches</h4>

            {/* L-Form dyal l-Ajout */}
            <div className="flex items-end gap-2">
              <div className="flex-grow flex flex-col gap-2">
                <Label htmlFor="new-task-desc">Nouvelle Tâche</Label>
                <Input
                  id="new-task-desc"
                  placeholder="Description (ex: Design 3D Stand...)"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-task-assign">Assigner à</Label>
                <Select
                  value={newTaskAssignee}
                  onValueChange={(value) => {
                    const selected = assignedTeamMembers.find(m => m.id === value);
                    setNewTaskAssignee(value);
                    const dept = allTeamMembers.find(m => m.id === value)?.dept || '';
                    setNewTaskDept(dept);
                  }}
                >
                  <SelectTrigger id="new-task-assign" className="w-[180px]">
                    <SelectValue placeholder="Choisir un membre..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedTeamMembers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateTask} disabled={loadingTaskCreate} size="icon">
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>

            <Separator className="my-2" />

            {/* --- L-TABLE L-JDIDA DYAL L-TASKS (UI JDID) --- */}
            <h5 className="font-medium">Tâches Actuelles</h5>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tâche</TableHead>
                    <TableHead>Assigné à</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskLoading && (
                    <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  )}
                  {taskData && taskData.tasksByProject.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune tâche créée.</TableCell></TableRow>
                  )}
                  {taskData?.tasksByProject.map((task: any) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.description}</TableCell>
                      <TableCell>{task.assignedTo.name}</TableCell>
                      <TableCell>
                        <TaskStatusPill status={task.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      );
    }
    // ---------------------------------


    // 7ala 7: L-7ala l-3adia (Modification)
    if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER') {
      return (
        <form id="update-dossier-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3">
            <Label htmlFor="object">Nom du Projet</Label>
            <Input id="object" value={formData.object} onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="title">Nom du Client</Label>
            <Input id="title" value={formData.title} onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="status">Status Général</Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
              <SelectTrigger id="status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
      );
    }

    // 7ala 8: Ma 3ndo 7ta role
    return <p>Vous n'avez pas accès à ce panneau.</p>;
  };



  // --- L-FUNCTION L-RA2ISSIA L-FOOTER ---
  const renderPanelFooter = () => {
    // 1. L-Footer dyal Yassmin
    if (userRole === 'PROPOSAL_MANAGER' && isDraft) {
      return (
        <Button onClick={handleSubmitForReview} disabled={loading} className="bg-green-600 hover:bg-green-700">
          {loadingSubmit ? "Soumission..." : "Uploader et Soumettre"}
        </Button>
      );
    }
    // 2. L-Footer dyal l-Admin (Validation)
    if (userRole === 'ADMIN' && isPendingAdminReview) {
      return (
        <Button form="admin-assign-form" type="submit" disabled={loading}>
          {loadingAssign ? "Assignation..." : "Valider & Assigner"}
        </Button>
      );
    }

    // --- HNA L-LOGIC L-JDID (Part 2) ---

    // 3. L-Footer dyal l-CP (Upload Estimate)
    if (userPermissions.includes('manage_assigned_projects') && isToPrepare) {
      return (
        <Button onClick={handleSubmitEstimate} disabled={loading || !fileEstimate}>
          {loadingEstimate ? "Uploading..." : "Uploader l'Estimation"}
        </Button>
      );
    }

    // 4. L-Footer dyal l-Admin (Launch Project)
    if (userRole === 'ADMIN' && isFeasibilityPending) {
      const canLaunch = feasibilityData.administrative === 'PASS' &&
        feasibilityData.technical === 'PASS' &&
        feasibilityData.financial === 'PASS';
      return (
        <Button onClick={handleLaunchProject} disabled={loading || !canLaunch} className="bg-green-600 hover:bg-green-700">
          {loadingLaunch ? "Lancement..." : "Lancer le Projet"}
        </Button>
      );
    }

    // 5. L-Footer dyal Safia (Finance)
    if (userPermissions.includes('manage_cautions') && isCautionPending) {
      return (
        <Button onClick={handleRequestCaution} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loadingCaution ? "Enregistrement..." : "Confirmer Demande Caution"}
        </Button>
      );
    }

    // 6. L-Footer dyal l-CP (Assign Team)
    // --- HNA L-BDIL L-JDID (L-FORM DYAL L-TEAM + L-TASKS + ASSETS) ---
    // 6. L-7ala dyal l-CP w l-Admin (Production)
    if ((userPermissions.includes('assign_creative_tasks') || userRole === 'ADMIN') && isInProduction) {
      if (loadingTeamMembers) {
        return <Skeleton className="h-40 w-full" />;
      }

      const allTeamMembers = [
        ...(teamMembers?.infographistes.map((u: any) => ({ ...u, dept: 'CREATIVE' })) || []),
        ...(teamMembers?.team3D.map((u: any) => ({ ...u, dept: '3D_ARTIST' })) || []),
        ...(teamMembers?.assistants.map((u: any) => ({ ...u, dept: 'ASSISTANT_PM' })) || [])
      ];

      const assignedTeamMembers = allTeamMembers.filter(member =>
        teamData.infographisteIds.includes(member.id) ||
        teamData.team3DIds.includes(member.id) ||
        teamData.assistantIds.includes(member.id)
      );

      return (
        <div className="flex flex-col gap-6 w-full">
          {/* --- BLOC 1: ASSIGNATION ÉQUIPE (UI JDID) --- */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <h4 className="font-semibold">Étape: Assignation Équipe</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Infographistes</Label>
                <MultiSelectPopover
                  title="Choisir..."
                  options={teamMembers?.infographistes || []}
                  selectedIds={teamData.infographisteIds}
                  onChange={(id, checked) => handleTeamChange('infographisteIds', id, checked)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Équipe 3D</Label>
                <MultiSelectPopover
                  title="Choisir..."
                  options={teamMembers?.team3D || []}
                  selectedIds={teamData.team3DIds}
                  onChange={(id, checked) => handleTeamChange('team3DIds', id, checked)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Assistants</Label>
                <MultiSelectPopover
                  title="Choisir..."
                  options={teamMembers?.assistants || []}
                  selectedIds={teamData.assistantIds}
                  onChange={(id, checked) => handleTeamChange('assistantIds', id, checked)}
                />
              </div>
            </div>
            <Button onClick={handleAssignTeam} disabled={loadingTeam} size="sm" className="mt-2 w-fit self-end">
              {loadingTeam ? "Assignation..." : "Enregistrer l'Équipe"}
            </Button>
          </div>

          {/* --- BLOC 2: UPLOAD ASSETS (JDID L-CP) --- */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <h4 className="font-semibold">Étape: Assets & Inspiration</h4>
            <p className="text-xs text-muted-foreground">
              Uploadez les assets (inspiration, charte, etc.) pour l'équipe.
            </p>
            <FileUpload label="Fichier Asset" onFileSelect={(file) => setFileAsset(file)} />
            <Button onClick={handleSubmitAsset} disabled={loadingAsset || !fileAsset} size="sm" className="mt-2 w-fit self-end">
              {loadingAsset ? "Uploading..." : "Uploader Asset"}
            </Button>
            {/* TODO: Affichi l-lista dyal l-assets li t-uploadaw */}
          </div>

          <Separator />

          {/* --- BLOC 3: GESTION DES TÂCHES --- */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <h4 className="font-semibold">Étape: Gestion des Tâches</h4>

            {/* L-Form dyal l-Ajout */}
            <div className="flex items-end gap-2">
              <div className="flex-grow flex flex-col gap-2">
                <Label htmlFor="new-task-desc">Nouvelle Tâche</Label>
                <Input
                  id="new-task-desc"
                  placeholder="Description (ex: Design 3D Stand...)"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-task-assign">Assigner à</Label>
                <Select
                  value={newTaskAssignee}
                  onValueChange={(value) => {
                    const selected = assignedTeamMembers.find(m => m.id === value);
                    setNewTaskAssignee(value);
                    const dept = allTeamMembers.find(m => m.id === value)?.dept || '';
                    setNewTaskDept(dept);
                  }}
                >
                  <SelectTrigger id="new-task-assign" className="w-[180px]">
                    <SelectValue placeholder="Choisir un membre..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedTeamMembers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateTask} disabled={loadingTaskCreate} size="icon">
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>

            <Separator className="my-2" />

            {/* --- L-TABLE L-JDIDA DYAL L-TASKS (UI JDID) --- */}
            <h5 className="font-medium">Tâches Actuelles</h5>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tâche</TableHead>
                    <TableHead>Assigné à</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskLoading && (
                    <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  )}
                  {taskData && taskData.tasksByProject.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune tâche créée.</TableCell></TableRow>
                  )}
                  {taskData?.tasksByProject.map((task: any) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.description}</TableCell>
                      <TableCell>{task.assignedTo.name}</TableCell>
                      <TableCell>
                        <TaskStatusPill status={task.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      );
    }
    // ---------------------------------
    // 7iydnah mn hna, drnah f l-bloc dyal l-assignation (Button "Enregistrer l'Équipe")

    // 7. L-Footer dyal l-Modification l-3adia
    if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER') {
      return (
        <Button form="update-dossier-form" type="submit" disabled={loading}>
          {loadingUpdate ? "Saving..." : "Save Changes"}
        </Button>
      );
    }
    return null;
  };

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.object}
        </Button>
      </DrawerTrigger>
      {/* --- L-BDIL L-JDID (L-LOGIC 2: Panel 3rid) --- */}
      <DrawerContent className={cn(
        "p-4", // Zidna padding 3am
        isMobile ? "h-[90vh]" : "sm:max-w-4xl" // 4xl l-desktop (896px)
      )}>
        <DrawerHeader className="gap-1 px-0 pt-0">
          <DrawerTitle>{item.object}</DrawerTitle>
          <DrawerDescription>Modifier les informations du dossier.</DrawerDescription>
        </DrawerHeader>

        {/* Zidna overflow hna */}
        <div className="flex-grow overflow-y-auto pr-2 -mr-4">
          {renderPanelContent()}
        </div>

        <DrawerFooter className="px-0 pb-0">
          {renderPanelFooter()}
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};