"use client";

import * as React from "react";
import {
    useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
    getSortedRowModel, getFacetedRowModel, getFacetedUniqueValues, flexRender,
    SortingState, VisibilityState, ColumnFiltersState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { CreateProjectDrawer } from "@/components/create-project-drawer";
import {
    IconLayoutColumns, IconChevronDown, IconChevronLeft, IconChevronRight,
    IconTrash, IconLoader, IconArchive, IconActivity
} from "@tabler/icons-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery, useSubscription, useMutation, gql, useApolloClient } from "@apollo/client";
import { ME_QUERY, TASK_CREATED_SUBSCRIPTION, TASK_UPDATED_SUBSCRIPTION } from "@/lib/graphql/projects";
import { toast, Toaster } from "sonner";
import { columns } from "./columns";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { differenceInDays, isPast, parseISO, isValid } from "date-fns";

const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project { 
        id 
        title 
        generalStatus 
        submissionDeadline 
        createdAt 
      }
      latestTask {
        id
        status
        description
        updatedAt
      }
    }
  }
`;

const DELETE_PROJECT_MUTATION = gql`
  mutation DeleteProject($projectId: ID!) {
    admin_deleteProject(projectId: $projectId)
  }
`;

const ARCHIVE_PROJECT_MUTATION = gql`
  mutation ArchiveProject($id: ID!) {
    archiveProject(id: $id) {
      id
      generalStatus
    }
  }
`;

function BulkDeleteFloatingBar({
    table,
    selectedCount,
    clearSelection,
    userRole
}: {
    table: any,
    selectedCount: number,
    clearSelection: () => void,
    userRole?: string
}) {
    const client = useApolloClient();
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
    const [isArchiveAlertOpen, setIsArchiveAlertOpen] = React.useState(false);

    const [deleteProject, { loading: deleting }] = useMutation(DELETE_PROJECT_MUTATION);
    const [archiveProject, { loading: archiving }] = useMutation(ARCHIVE_PROJECT_MUTATION);

    const { refetch } = useQuery(GET_PROJECTS_FEED, { skip: true });

    const handleBulkDelete = async () => {
        const selectedRows = table.getSelectedRowModel().rows;
        const idsToDelete = selectedRows.map((row: any) => row.original.project.id);
        if (idsToDelete.length === 0) return;

        try {
            await Promise.all(idsToDelete.map((id: string) =>
                deleteProject({ variables: { projectId: id } })
            ));
            toast.success(`${idsToDelete.length} projets supprimés.`);
            clearSelection();
            setIsDeleteAlertOpen(false);

            await client.refetchQueries({ include: ["GetProjectsFeed"] });
        } catch (error) {
            toast.error("Erreur lors de la suppression.");
        }
    };

    const handleBulkArchive = async () => {
        const selectedRows = table.getSelectedRowModel().rows;
        const idsToArchive = selectedRows.map((row: any) => row.original.project.id);
        if (idsToArchive.length === 0) return;

        try {
            await Promise.all(idsToArchive.map((id: string) =>
                archiveProject({
                    variables: { id },
                    update(cache) {
                        // ✅ Force update both fields to catch aliases
                        cache.modify({
                            id: cache.identify({ __typename: 'Project', id }),
                            fields: {
                                generalStatus() { return "ARCHIVED"; },
                                status() { return "ARCHIVED"; }
                            }
                        });
                    }
                })
            ));

            toast.success(`${idsToArchive.length} projets archivés.`);
            clearSelection();
            setIsArchiveAlertOpen(false);

            await client.refetchQueries({ include: ["GetProjectsFeed"] });

        } catch (error) {
            toast.error("Erreur lors de l'archivage.");
            console.error(error);
        }
    };

    if (selectedCount === 0) return null;

    const canArchive = userRole === 'ADMIN' || userRole === 'PROPOSAL_MANAGER';

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-foreground text-background px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 border border-border/50">
                <div className="flex items-center gap-3 border-r border-background/20 pr-4 mr-1">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
                        {selectedCount}
                    </span>
                    <span className="text-sm font-medium">Sélectionnés</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 hover:bg-background/20 hover:text-background text-background/80" onClick={clearSelection}>Annuler</Button>

                    {canArchive && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 gap-2 rounded-full px-4 border border-input"
                            onClick={() => setIsArchiveAlertOpen(true)}
                            disabled={archiving || deleting}
                        >
                            {archiving ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconArchive className="w-4 h-4" />}
                            Archiver
                        </Button>
                    )}

                    <Button variant="destructive" size="sm" className="h-8 gap-2 rounded-full px-4" onClick={() => setIsDeleteAlertOpen(true)} disabled={deleting || archiving}>
                        {deleting ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconTrash className="w-4 h-4" />}
                        Supprimer
                    </Button>
                </div>
            </div>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer {selectedCount} projets ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleBulkDelete(); }} className="bg-red-600 hover:bg-red-700" disabled={deleting}>
                            {deleting ? "..." : "Confirmer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isArchiveAlertOpen} onOpenChange={setIsArchiveAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archiver {selectedCount} projets ?</AlertDialogTitle>
                        <AlertDialogDescription>Les projets seront déplacés vers l'onglet "Archives".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={archiving}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleBulkArchive(); }} disabled={archiving}>
                            {archiving ? "..." : "Archiver"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function ProjectListTable({
    data,
    columns,
    userRole,
    title,
    icon: Icon,
    defaultSorting = []
}: {
    data: any[],
    columns: any,
    userRole: string | undefined,
    title: string,
    icon: any,
    defaultSorting?: SortingState
}) {
    const [rowSelection, setRowSelection] = React.useState({});
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [sorting, setSorting] = React.useState<SortingState>(defaultSorting);
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
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

    React.useEffect(() => {
        if (!userRole) return;
        if (userRole === 'PROPOSAL_MANAGER') {
            table.getColumn('project.preparationStatus')?.toggleVisibility(false);
            table.getColumn('project.projectManagers')?.toggleVisibility(false);
            table.getColumn('remainingTime')?.toggleVisibility(false);
        } else if (['FINANCE', 'CREATIVE', '3D_ARTIST'].includes(userRole)) {
            ['doc_cps', 'doc_rc', 'doc_avis', 'doc_bpe'].forEach(col => table.getColumn(col)?.toggleVisibility(false));
        }
    }, [userRole, table]);

    return (
        <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-md"><Icon className="w-5 h-5 text-muted-foreground" /></div>
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                        <p className="text-sm text-muted-foreground">{data.length} projets</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm"><IconLayoutColumns className="mr-2 h-4 w-4" />Colonnes<IconChevronDown className="ml-2 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {table.getAllColumns().filter((c) => typeof c.accessorFn !== "undefined" && c.getCanHide()).map((column) => (
                                <DropdownMenuCheckboxItem key={column.id} className="capitalize" checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                                    {column.id.split(".").pop()}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <BulkDeleteFloatingBar
                table={table}
                selectedCount={Object.keys(rowSelection).length}
                clearSelection={() => setRowSelection({})}
                userRole={userRole}
            />

            <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} colSpan={header.colSpan}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}
                                </TableRow>
                            ))
                        ) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Aucun projet dans cette section.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between px-2">
                <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">{table.getFilteredSelectedRowModel().rows.length} / {table.getFilteredRowModel().rows.length} sélectionné(s).</div>
                <div className="flex w-full items-center gap-6 lg:w-fit">
                    <div className="hidden items-center gap-2 lg:flex">
                        <Label className="text-sm font-medium">Lignes</Label>
                        <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(v) => table.setPageSize(Number(v))}>
                            <SelectTrigger size="sm" className="w-16"><SelectValue placeholder={table.getState().pagination.pageSize} /></SelectTrigger>
                            <SelectContent side="top">{[5, 10, 20, 50].map((p) => <SelectItem key={p} value={`${p}`}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><IconChevronLeft className="h-4 w-4" /></Button>
                        <div className="text-sm font-medium">Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</div>
                        <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><IconChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProjectFeedUpdater({ currentUserId, refetchFeed }: { currentUserId: string; refetchFeed: () => void; }) {
    useSubscription(TASK_CREATED_SUBSCRIPTION, {
        variables: { userId: currentUserId },
        onData: ({ data }) => {
            const task = data.data?.taskCreated;
            if (!task) { refetchFeed(); return; };
            toast.info(`Nouvelle tâche assignée: ${task.description}`);
            refetchFeed();
        }
    });
    useSubscription(TASK_UPDATED_SUBSCRIPTION, { onData: () => refetchFeed() });
    return null;
}

export function DataTable({ data, columnFilters, onColumnFiltersChange }: {
    columns: any;
    data: any[];
    columnFilters: ColumnFiltersState;
    onColumnFiltersChange: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
}) {
    const { data: meData, loading: roleLoading, refetch: refetchFeed } = useQuery(ME_QUERY);
    const userRole = meData?.me.role.name;
    const currentUserId = meData?.me.id;

    // --- LOGIC: SPLIT PROJECTS (ACTIVE vs ARCHIVE/EXPIRED) ---
    const { activeProjects, archivedProjects } = React.useMemo(() => {
        const active: any[] = [];
        const archived: any[] = [];
        const now = new Date();

        console.log("📊 STARTING FILTERING:", data.length, "projects");

        data.forEach((item) => {
            const project = item.project || item;
            if (!project) return;

            // 👇👇👇 LE FIX EST ICI 👇👇👇
            // On vérifie 'generalStatus' ET 'status' (l'alias venant de page.tsx)
            const status = project.generalStatus || project.status;
            // -----------------------------

            const deadlineRaw = project.submissionDeadline;

            // LOGGING pour debug
            // console.log(`👉 Project [${project.title}]: Status = ${status}, Deadline = ${deadlineRaw}`);

            // 1. Vérification Date (Robust)
            let isExpired = false;
            if (deadlineRaw) {
                const isTimestamp = !isNaN(Number(deadlineRaw));
                const deadlineDate = isTimestamp ? new Date(Number(deadlineRaw)) : new Date(deadlineRaw);

                if (isValid(deadlineDate) && deadlineDate.getTime() < now.getTime()) {
                    isExpired = true;
                }
            }

            // 2. Vérification Status
            const isArchivedStatus = status === 'ARCHIVED' || status === 'CANCELLED';

            // LOGIC DECISION
            if (isArchivedStatus || isExpired) {
                archived.push({
                    ...item,
                    _virtualStatus: isExpired && !isArchivedStatus ? 'EXPIRED' : status
                });
            } else {
                active.push(item);
            }
        });

        console.log(`✅ FINISH: Active=${active.length}, Archived=${archived.length}`);

        active.sort((a, b) => {
            const tA = a.project.submissionDeadline ? Number(a.project.submissionDeadline) : Infinity;
            const tB = b.project.submissionDeadline ? Number(b.project.submissionDeadline) : Infinity;
            return tA - tB;
        });

        return { activeProjects: active, archivedProjects: archived };
    }, [data]);

    return (
        <Tabs defaultValue="outline" className="w-full flex-col justify-start gap-6 relative">
            <Toaster position="top-center" richColors />
            {currentUserId && refetchFeed && <ProjectFeedUpdater currentUserId={currentUserId} refetchFeed={refetchFeed} />}

            <div className="flex items-center justify-between px-4 lg:px-6">
                <TabsList className="hidden @4xl/main:flex">
                    <TabsTrigger value="outline">Outline</TabsTrigger>
                    <TabsTrigger value="past-performance">Past Performance <Badge variant="secondary">3</Badge></TabsTrigger>
                    <TabsTrigger value="key-personnel">Key Personnel <Badge variant="secondary">2</Badge></TabsTrigger>
                    <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                    <CreateProjectDrawer />
                </div>
            </div>

            <TabsContent value="outline" className="relative flex flex-col gap-8 overflow-auto px-4 lg:px-6 pb-20">

                {/* --- TABLE 1: EN COURS --- */}
                <ProjectListTable
                    title="Projets En Cours"
                    icon={IconActivity}
                    data={activeProjects}
                    columns={columns}
                    userRole={userRole}
                    defaultSorting={[{ id: 'remainingTime', desc: false }]}
                />

                <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t border-border/60"></div>
                    <span className="flex-shrink-0 mx-4 text-xs font-medium text-muted-foreground uppercase tracking-widest bg-background px-2">
                        Historique & Archives
                    </span>
                    <div className="flex-grow border-t border-border/60"></div>
                </div>

                {/* --- TABLE 2: ARCHIVES --- */}
                <ProjectListTable
                    title="Archives & Délais Dépassés"
                    icon={IconArchive}
                    data={archivedProjects}
                    columns={columns}
                    userRole={userRole}
                    defaultSorting={[{ id: 'createdAt', desc: true }]}
                />

            </TabsContent>

            <TabsContent value="past-performance" className="flex flex-col px-4 lg:px-6"></TabsContent>
            <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6"></TabsContent>
            <TabsContent value="focus-documents" className="flex flex-col px-4 lg:px-6"></TabsContent>
        </Tabs>
    );
}