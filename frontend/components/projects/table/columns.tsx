"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectEditDrawer } from "../drawers/project-edit";
import { TaskChecklistPanel } from "../drawers/task-checklist";
import { ProjectActionsMenu } from "../project-actions";
import { FileStatusCell } from "./file-status";
import { ProjectStatusPill, calculateRemainingDays } from "../utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge"; // Make sure to import Badge if used, or use a span

export type ProjectFeedItem = any;

export const columns: ColumnDef<ProjectFeedItem>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="Select all" />
        ),
        cell: ({ row }) => (
            <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "project.object",
        header: "Dossier",
        cell: ({ row }) => <ProjectEditDrawer item={row.original.project} />,
    },
    { accessorKey: "project.title", header: "Client" },
    { id: 'doc_cps', header: 'CPS', cell: ({ row }) => <FileStatusCell row={row} docType="CPS" />, enableHiding: true },
    { id: 'doc_rc', header: 'RC', cell: ({ row }) => <FileStatusCell row={row} docType="RC" />, enableHiding: true },
    { id: 'doc_avis', header: 'Avis', cell: ({ row }) => <FileStatusCell row={row} docType="Avis" />, enableHiding: true },
    {
        id: 'doc_bpe',
        header: 'BPE',
        cell: ({ row }) => <FileStatusCell row={row} docType="BPE" />,
        enableHiding: true
    },
    {
        accessorKey: "project.preparationStatus",
        header: "Status Préparation",
        cell: ({ row }) => <ProjectStatusPill status={row.original.project.preparationStatus} />,
    },
    {
        id: 'remainingTime',
        // ✅ ADDED: accessorFn allows sorting by date while displaying the calculated text
        accessorFn: (row) => row.project.submissionDeadline,
        header: 'Délai Restant',
        cell: ({ row }) => {
            const project = row.original.project;
            if (!project.submissionDeadline) {
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
    {
        id: 'tasks_checklist',
        header: 'Checklist Tâches',
        cell: ({ row }) => <TaskChecklistPanel project={row.original.project} />
    },
    {
        id: "latestTaskDesc",
        accessorFn: (row) => row.latestTask?.description,
        header: "Dernière Tâche",
        size: 200,
        cell: ({ row }) => {
            const description = row.original.latestTask?.description;
            if (!description) return <span className="text-muted-foreground">--</span>;
            return <div className="truncate max-w-[180px] md:max-w-[250px] font-medium text-sm" title={description}>{description}</div>;
        }
    },
    // ✅ FIXED: Safe accessor for status to prevent "undefined" errors
    {
        id: "latestTaskStatus",
        header: "Status Tâche",
        accessorFn: (row) => row.latestTask?.status || "N/A",
        cell: ({ row }) => {
            const status = row.original.latestTask?.status;
            return status ? <span>{status}</span> : <span className="text-muted-foreground">-</span>;
        }
    },
    { id: "actions", cell: ({ row }) => <ProjectActionsMenu project={row.original.project} /> },
];