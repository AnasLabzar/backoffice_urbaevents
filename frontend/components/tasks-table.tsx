"use client";

import * as React from "react";
// Import all necessary items from the main data-table.tsx
import {
    // IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronsLeft,
    // IconChevronsRight, IconLayoutColumns, IconListCheck,
    // IconChevronsUpDown, IconFile, IconUsers, IconList,
} from "@tabler/icons-react"; // Removed Tabler imports, will use inline SVGs
import { gql, useQuery } from "@apollo/client";
import {
    ColumnDef, ColumnFiltersState, SortingState, VisibilityState, flexRender,
    getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable
} from "@tanstack/react-table";
import { toast } from "sonner";
import { z } from "zod";
// import { useIsMobile } from "@/hooks/use-mobile"; // Inlining this hook
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
    DropdownMenuTrigger
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
import { Skeleton } from "@/components/ui/skeleton";
// import { cn } from "@/lib/utils"; // Inlining this function
// Assuming these are exported from data-table.tsx or are in scope
// We remove TaskChecklistPanel from here because we will define it in this file
// import { ProjectFeedItem, Project, TaskStatusPill, ProjectStatusPill } from "@/components/data-table"; // Inlining types and components

// --- INLINE SVGS for @tabler/icons-react ---
// We define basic SVG components here to remove the @tabler/icons-react dependency
const IconChevronDown = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6" /></svg>
);
const IconChevronLeft = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m15 18-6-6 6-6" /></svg>
);
const IconChevronRight = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6" /></svg>
);
const IconChevronsLeft = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
);
const IconChevronsRight = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" /></svg>
);
const IconLayoutColumns = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /></svg>
);
const IconListCheck = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 6h11" /><path d="M8 12h11" /><path d="M8 18h11" /><path d="M4 6.2v.01" /><path d="M4 12.2v.01" /><path d="M4 18.2v.01" /></svg>
);
const IconChevronsUpDown = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
);
const IconFile = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
);
const IconUsers = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const IconList = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
);
// --- END INLINE SVGS ---

// --- INLINED DEPENDENCIES ---
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Inlined from @/lib/utils
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Inlined from @/hooks/use-mobile
const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        // Check if window is defined (for SSR)
        if (typeof window === 'undefined') {
            return;
        }
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [breakpoint]);
    return isMobile;
};

// Inlined Types from @/components/data-table (based on GQL query)
type User = {
    id: string;
    name: string;
};
type Document = {
    id: string;
    fileName: string;
    fileUrl: string;
    originalFileName: string;
};
export type Project = {
    id: string;
    title: string;
    object: string;
    status: string;
    preparationStatus: string;
    projectManagers: User[];
    stages: {
        administrative: { documents: Document[] };
        technical: { documents: Document[] };
    };
    submissionDeadline: string;
    cautionRequestDate: string;
    feasibilityChecks: {
        administrative: boolean;
        technical: boolean;
        financial: boolean;
    };
    caution: { status: string };
    team: {
        infographistes: User[];
        team3D: User[];
        assistants: User[];
    };
};
export type ProjectFeedItem = {
    project: Project;
    latestTask: {
        id: string;
        description: string;
        status: string;
        createdAt: string;
    };
};

// Inlined Mock Components from @/components/data-table
// (You should replace these with your actual component definitions if they are more complex)
export const TaskStatusPill = ({ status }: { status: string | undefined | null }) => {
    const s = status || 'N/A';
    const statusClass = s === 'COMPLETED' ? 'bg-green-500/20 text-green-700' :
        s === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-700' :
            s === 'PENDING' ? 'bg-yellow-500/20 text-yellow-700' :
                'bg-gray-500/20 text-gray-700';
    return (
        <Badge className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", statusClass)}>
            {s.replace('_', ' ')}
        </Badge>
    );
};
export const ProjectStatusPill = ({ status }: { status: string | undefined | null }) => {
    const s = status || 'N/A';
    const statusClass = s === 'IN_PRODUCTION' ? 'bg-blue-500/20 text-blue-700' :
        s === 'DELIVERED' ? 'bg-green-500/20 text-green-700' :
            'bg-gray-500/20 text-gray-700';
    return (
        <Badge className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", statusClass)}>
            {s.replace('_', ' ')}
        </Badge>
    );
};
// --- END INLINED DEPENDENCIES ---

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
          administrative { documents { id fileName fileUrl originalFileName } } 
          technical { documents { id fileName fileUrl originalFileName } } 
        }
        submissionDeadline
        cautionRequestDate
        feasibilityChecks { administrative technical financial }
        caution { status }
        team { 
          infographistes { id name } 
          team3D { id name } 
          assistants { id name } 
        }
      }
      latestTask { id description status createdAt }
    }
  }
`;

const ME_QUERY = gql` query Me { me { id role { name permissions } } }`;

// --- NOUVELLE QUERY POUR LES TÂCHES SPÉCIFIQUES DU PROJET ---
// On suppose ce schéma. Vous devrez peut-être l'adapter à votre API.
const GET_PROJECT_TASKS = gql`
  query GetProjectTasks($projectId: ID!) {
    tasks(projectId: $projectId) {
      id
      description
      status
    }
  }
`;

// --- NOUVELLE IMPLÉMENTATION DE TASKCHECKLISTPANEL ---

/**
 * Affiche un bouton qui ouvre un modal (Dialog) avec la checklist des tâches,
 * l'équipe assignée, et les documents du projet.
 */
function TaskChecklistPanel({ project }: { project: Project }) {
    const { data, loading, error } = useQuery(GET_PROJECT_TASKS, {
        variables: { projectId: project.id },
        skip: !project.id, // Ne pas exécuter la query si l'ID n'est pas là
    });

    const allTeam = [
        ...(project.team.infographistes?.map(u => ({ ...u, role: 'Infographiste' })) || []),
        ...(project.team.team3D?.map(u => ({ ...u, role: 'Artiste 3D' })) || []),
        ...(project.team.assistants?.map(u => ({ ...u, role: 'Assistant' })) || []),
    ];

    const allDocuments = [
        ...(project.stages.administrative?.documents || []),
        ...(project.stages.technical?.documents || []),
    ];

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <IconListCheck className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Ouvrir la checklist</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Checklist Tâches: {project.title}</DialogTitle>
                    <DialogDescription>
                        Suivi des tâches, de l'équipe et des documents pour le dossier {project.object}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto pr-4 space-y-6">
                    {/* Section des Tâches */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <IconList className="mr-2 h-5 w-5" />
                            Tâches
                        </h3>
                        {loading && <Skeleton className="h-20 w-full" />}
                        {error && <p className="text-red-500">Erreur de chargement des tâches.</p>}
                        {data && data.tasks.length > 0 ? (
                            <ul className="space-y-2">
                                {data.tasks.map((task: any) => (
                                    <li key={task.id} className="flex justify-between items-center p-2 rounded-md border bg-muted/50">
                                        <span>{task.description}</span>
                                        <TaskStatusPill status={task.status || 'N/A'} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            !loading && <p className="text-muted-foreground text-sm">Aucune tâche trouvée pour ce projet.</p>
                        )}
                    </div>

                    {/* Section de l'Équipe Assignée */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <IconUsers className="mr-2 h-5 w-5" />
                            Équipe Assignée
                        </h3>
                        {allTeam.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {allTeam.map(user => (
                                    <Badge key={user.id} variant="secondary" className="text-sm">
                                        {user.name} <span className="text-muted-foreground ml-1.5">({user.role})</span>
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">Aucune équipe assignée à ce projet.</p>
                        )}
                    </div>

                    {/* Section des Documents */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <IconFile className="mr-2 h-5 w-5" />
                            Documents du Projet
                        </h3>
                        {allDocuments.length > 0 ? (
                            <ul className="space-y-1">
                                {allDocuments.map(doc => (
                                    <li key={doc.id}>
                                        <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline flex items-center"
                                        >
                                            <IconFile className="mr-1.5 h-4 w-4 flex-shrink-0" />
                                            {doc.fileName || doc.originalFileName || 'Document sans nom'}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">Aucun document téléversé pour ce projet.</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => (document.querySelector('[data-state="open"] [aria-label="Close"]') as HTMLElement)?.click()}>
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
// --- FIN DE L'IMPLÉMENTATION DE TASKCHECKLISTPANEL ---


// --- NEW COLUMNS FOR TEAM VIEW ---
export const tasksColumns: ColumnDef<ProjectFeedItem>[] = [
    {
        accessorKey: "project.object",
        header: "Dossier",
    },
    {
        accessorKey: "project.title",
        header: "Client"
    },
    {
        accessorKey: "latestTask.description",
        header: "Dernière Tâche",
        cell: ({ row }) => (
            <span className="text-muted-foreground">{row.original.latestTask?.description || "N/A"}</span>
        ),
    },
    {
        accessorKey: "latestTask.status",
        header: "Status Tâche",
        cell: ({ row }) => (
            <TaskStatusPill status={row.original.latestTask?.status || 'N/A'} />
        ),
    },
    {
        id: 'tasks_checklist',
        header: 'Checklist',
        cell: ({ row }) => {
            // On utilise le nouveau composant défini dans ce fichier
            return <TaskChecklistPanel project={row.original.project} />;
        }
    },
];

/**
 * Hada howa L-Component l-Jdid dyal Team Task Tables
 * @param role The role to filter tasks for (e.g., 'CREATIVE', '3D_ARTIST', 'ASSISTANT_PM')
 */
export function TasksDataTable({ role }: { role: 'CREATIVE' | '3D_ARTIST' | 'ASSISTANT_PM' }) {
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const { data: meData, loading: roleLoading } = useQuery(ME_QUERY);
    const currentUserId = meData?.me.id;

    const { data: projectsData, loading: projectsLoading } = useQuery(GET_PROJECTS_FEED);

    // --- L-LOGIC L-JDID DYAL L-FILTER ---
    const filteredData = React.useMemo(() => {
        if (projectsLoading || !projectsData || !currentUserId) return [];

        // N-filteriw 3la projects li fihom had l-user f l-team dyal l-role l-mo7addad
        return projectsData.projects_feed.filter((item: ProjectFeedItem) => {
            const project = item.project;

            switch (role) {
                case 'CREATIVE':
                    return project.team.infographistes.some(u => u.id === currentUserId);
                case '3D_ARTIST':
                    return project.team.team3D.some(u => u.id === currentUserId);
                case 'ASSISTANT_PM':
                    return project.team.assistants.some(u => u.id === currentUserId);
                default:
                    return false;
            }
        });
    }, [projectsData, projectsLoading, currentUserId, role]);
    // ------------------------------------

    const table = useReactTable({
        data: filteredData as ProjectFeedItem[],
        columns: tasksColumns,
        state: {
            sorting, columnVisibility, columnFilters, pagination,
        },
        getRowId: (row) => row.project.id,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (projectsLoading || roleLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    // N-extractiw had l-UI mn l-Component l-Asli
    const tabsList = (
        <TabsList className="data-[slot=badge]:bg-muted-foreground/30 hidden data-[slot=badge]:size-5 data-[slot=badge]:rounded-full data-[slot=badge]:px-1 @4xl/main:flex">
            <TabsTrigger value="outline">Mes Tâches</TabsTrigger>
            {/* N9edro nzidou hna des Tabs akhrin ila 7tajinahom */}
        </TabsList>
    );

    const columnToggle = (
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
    );

    return (
        <Tabs defaultValue="outline" className="w-full flex-col justify-start gap-6">
            <div className="flex items-center justify-between px-4 lg:px-6">
                {tabsList}
                <div className="flex items-center gap-2">
                    {columnToggle}
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
                                    <TableRow key={row.id}>
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
                                    <TableCell colSpan={tasksColumns.length} className="h-24 text-center">
                                        Aucun projet assigné en tant que {role.toLowerCase().replace('_', ' ')}.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-4">
                    <div className="flex w-full items-center gap-8 lg:w-fit">
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
        </Tabs>
    );
}

// Re-export necessary types/components from the original data-table for use in this file
// NOTE: You must ensure ProjectFeedItem, Project, TaskStatusPill, ProjectStatusPill 
// are correctly imported/defined/available in your project structure for this to work.
// For the system to assume they are available, I've added a mock import above.e