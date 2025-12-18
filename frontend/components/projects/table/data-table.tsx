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
    IconChevronsLeft, IconChevronsRight, IconTrash, IconX, IconLoader
} from "@tabler/icons-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery, useSubscription, useMutation, gql } from "@apollo/client";
import { ME_QUERY, TASK_CREATED_SUBSCRIPTION, TASK_UPDATED_SUBSCRIPTION } from "@/lib/graphql/projects";
import { toast, Toaster } from "sonner";
import { columns } from "./columns";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// --- GRAPHQL ---
const DELETE_PROJECT_MUTATION = gql`
  mutation DeleteProject($projectId: ID!) {
    admin_deleteProject(projectId: $projectId)
  }
`;

const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project { id }
    }
  }
`;

// --- COMPONENT: BULK ACTIONS BAR ---
function BulkDeleteFloatingBar({ table, selectedCount, clearSelection }: { table: any, selectedCount: number, clearSelection: () => void }) {
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);

    // Mutation Delete
    const [deleteProject, { loading: deleting }] = useMutation(DELETE_PROJECT_MUTATION, {
        // On ne refetch pas ici pour éviter X refetch si on supprime 10 items
        // On fera un refetch manuel à la fin
    });

    const { refetch: refetchFeed } = useQuery(GET_PROJECTS_FEED, { skip: true });

    const handleBulkDelete = async () => {
        const selectedRows = table.getSelectedRowModel().rows;
        const idsToDelete = selectedRows.map((row: any) => row.original.project.id);

        if (idsToDelete.length === 0) return;

        try {
            // Execution en parallèle (Promise.all) car le backend n'a pas de "bulkDelete"
            const promises = idsToDelete.map((id: string) =>
                deleteProject({ variables: { projectId: id } })
            );

            await Promise.all(promises);

            toast.success(`${idsToDelete.length} projets supprimés avec succès.`);
            clearSelection();
            setIsAlertOpen(false);

            // Force refresh data
            if (refetchFeed) refetchFeed();
            // Optionnel: window.location.reload() si le cache Apollo ne se met pas à jour

        } catch (error) {
            toast.error("Une erreur est survenue lors de la suppression.");
            console.error(error);
        }
    };

    if (selectedCount === 0) return null;

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
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 hover:bg-background/20 hover:text-background text-background/80"
                        onClick={clearSelection}
                    >
                        Annuler
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 gap-2 rounded-full px-4"
                        onClick={() => setIsAlertOpen(true)}
                    >
                        {deleting ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconTrash className="w-4 h-4" />}
                        Supprimer
                    </Button>
                </div>
            </div>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer {selectedCount} projets ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Ces projets seront définitivement supprimés de la base de données.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleting}
                        >
                            {deleting ? "Suppression en cours..." : "Confirmer la suppression"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// --- SUBSCRIPTION COMPONENT ---
function ProjectFeedUpdater({ currentUserId, refetchFeed }: { currentUserId: string; refetchFeed: () => void; }) {
    useSubscription(TASK_CREATED_SUBSCRIPTION, {
        variables: { userId: currentUserId },
        onData: ({ data }) => {
            const task = data.data?.taskCreated;
            if (!task) return;
            console.log("⚡ Socket: New task!", task);
            toast.info(`Nouvelle tâche assignée: ${task.description}`);
            refetchFeed();
        }
    });
    useSubscription(TASK_UPDATED_SUBSCRIPTION, { onData: () => refetchFeed() });
    return null;
}

// --- MAIN DATATABLE ---
export function DataTable({ data, columnFilters, onColumnFiltersChange }: {
    columns: any;
    data: any[];
    columnFilters: ColumnFiltersState;
    onColumnFiltersChange: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
}) {
    const [rowSelection, setRowSelection] = React.useState({});
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

    const { data: meData, loading: roleLoading, refetch: refetchFeed } = useQuery(ME_QUERY);
    const userRole = meData?.me.role.name;
    const currentUserId = meData?.me.id;

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
        getRowId: (row) => row.project.id,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: onColumnFiltersChange,
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
        if (roleLoading) return;
        if (userRole === 'PROPOSAL_MANAGER') {
            table.getColumn('project.preparationStatus')?.toggleVisibility(false);
            table.getColumn('project.projectManagers')?.toggleVisibility(false);
            table.getColumn('remainingTime')?.toggleVisibility(false);
        }
        else if (userRole === 'FINANCE') {
            ['doc_cps', 'doc_rc', 'doc_avis', 'doc_bpe'].forEach(col => table.getColumn(col)?.toggleVisibility(false));
        }
        else if (['CREATIVE', '3D_ARTIST', 'ASSISTANT_PM'].includes(userRole)) {
            ['doc_cps', 'doc_rc', 'doc_avis', 'doc_bpe'].forEach(col => table.getColumn(col)?.toggleVisibility(false));
        }
    }, [userRole, roleLoading, table]);

    return (
        <Tabs defaultValue="outline" className="w-full flex-col justify-start gap-6 relative">
            <Toaster position="top-center" richColors />
            {currentUserId && refetchFeed && <ProjectFeedUpdater currentUserId={currentUserId} refetchFeed={refetchFeed} />}

            {/* 🔥 LE COMPOSANT BULK DELETE EST ICI 🔥 */}
            <BulkDeleteFloatingBar
                table={table}
                selectedCount={Object.keys(rowSelection).length}
                clearSelection={() => setRowSelection({})}
            />

            <div className="flex items-center justify-between px-4 lg:px-6">
                <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
                    <TabsTrigger value="outline">Outline</TabsTrigger>
                    <TabsTrigger value="past-performance">Past Performance <Badge variant="secondary">3</Badge></TabsTrigger>
                    <TabsTrigger value="key-personnel">Key Personnel <Badge variant="secondary">2</Badge></TabsTrigger>
                    <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm"><IconLayoutColumns className="mr-2 h-4 w-4" /><span className="hidden lg:inline">Colonnes</span><IconChevronDown className="ml-2 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {table.getAllColumns().filter((c) => typeof c.accessorFn !== "undefined" && c.getCanHide()).map((column) => (
                                <DropdownMenuCheckboxItem key={column.id} className="capitalize" checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                                    {column.id.split(".").pop()}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <CreateProjectDrawer />
                </div>
            </div>

            <TabsContent value="outline" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
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
                            ) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Aucun résultat.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-between px-4">
                    <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">{table.getFilteredSelectedRowModel().rows.length} sur {table.getFilteredRowModel().rows.length} ligne(s) sélectionnée(s).</div>
                    <div className="flex w-full items-center gap-8 lg:w-fit">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label className="text-sm font-medium">Lignes par page</Label>
                            <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(v) => table.setPageSize(Number(v))}>
                                <SelectTrigger size="sm" className="w-20"><SelectValue placeholder={table.getState().pagination.pageSize} /></SelectTrigger>
                                <SelectContent side="top">{[10, 20, 30, 40, 50].map((p) => <SelectItem key={p} value={`${p}`}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-fit items-center justify-center text-sm font-medium">Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}</div>
                        <div className="ml-auto flex items-center gap-2 lg:ml-0">
                            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><IconChevronsLeft className="h-4 w-4" /><span className="sr-only">First</span></Button>
                            <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><IconChevronLeft className="h-4 w-4" /><span className="sr-only">Prev</span></Button>
                            <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><IconChevronRight className="h-4 w-4" /><span className="sr-only">Next</span></Button>
                            <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><IconChevronsRight className="h-4 w-4" /><span className="sr-only">Last</span></Button>
                        </div>
                    </div>
                </div>
            </TabsContent>
            {/* Autres TabsContent vides conservés */}
            <TabsContent value="past-performance" className="flex flex-col px-4 lg:px-6"></TabsContent>
            <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6"></TabsContent>
            <TabsContent value="focus-documents" className="flex flex-col px-4 lg:px-6"></TabsContent>
        </Tabs>
    );
}