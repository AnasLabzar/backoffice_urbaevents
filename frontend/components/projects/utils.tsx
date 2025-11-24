import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IconClock, IconLoader, IconCircleCheck } from "@tabler/icons-react";

// --- DATE HELPERS ---

export function parseDate(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    if (/^\d+$/.test(dateString)) return new Date(parseInt(dateString, 10));
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

export function formatDate(date: Date | null, formatStr: string = "PPP p") {
    if (!date) return "N/A";
    try { return format(date, formatStr, { locale: fr }); }
    catch { return "Date Invalide"; }
}

export function calculateRemainingDays(dateString: string) {
    const deadline = parseDate(dateString);
    if (!deadline) return { text: "N/A", color: "text-muted-foreground" };
    const today = new Date();
    const daysLeft = differenceInDays(deadline, today);

    if (daysLeft < 0) return { text: "Dépassé", color: "text-red-500 font-bold" };
    if (daysLeft === 0) return { text: "Auj.", color: "text-yellow-500 font-bold" };
    if (daysLeft <= 7) return { text: `${daysLeft} Jours`, color: "text-yellow-500" };
    return { text: `${daysLeft} Jours`, color: "text-green-500" };
}

// --- PROJECT STATUS PILL ---

const PROJECT_STATUS_MAP: { [key: string]: { label: string; className: string } } = {
    DRAFT: { label: "Brouillon", className: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200" },
    TO_CONFIRM: { label: "À Confirmer", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300" },
    TO_PREPARE: { label: "À Préparer", className: "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300" },
    FEASIBILITY_PENDING: { label: "Faisabilité", className: "bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300" },
    CAUTION_PENDING: { label: "Caution", className: "bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300" },
    IN_PRODUCTION: { label: "En Production", className: "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300" },
    DONE: { label: "Terminé", className: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-100" },
    CANCELED: { label: "Annulé", className: "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300" },
    NO: { label: "Refusé", className: "bg-red-200 text-red-900 dark:bg-red-700 dark:text-red-100" },
    UNKNOWN: { label: "Inconnu", className: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
};

export function ProjectStatusPill({ status }: { status: string }) {
    const statusInfo = PROJECT_STATUS_MAP[status] || PROJECT_STATUS_MAP["UNKNOWN"];
    return <Badge className={cn("text-xs font-semibold border-0", statusInfo.className)}>{statusInfo.label}</Badge>;
}

// Alias pour la compatibilité avec le Dashboard
export { ProjectStatusPill as NewProjectStatusPill };

export function calculateProjectStats(projects: any[]) {
    if (!projects || projects.length === 0) {
        return { total: 0, inProgress: 0, completed: 0, pending: 0 };
    }

    return {
        total: projects.length,
        inProgress: projects.filter((p: any) =>
            p.preparationStatus === 'IN_PRODUCTION' ||
            p.preparationStatus === 'TO_PREPARE'
        ).length,
        completed: projects.filter((p: any) =>
            p.preparationStatus === 'DONE'
        ).length,
        pending: projects.filter((p: any) =>
            ['TO_CONFIRM', 'FEASIBILITY_PENDING', 'CAUTION_PENDING'].includes(p.preparationStatus)
        ).length,
    };
}

// --- TASK STATUS PILL ---

const TASK_STATUS_MAP: { [key: string]: { label: string; className: string; icon: React.ElementType } } = {
    TODO: { label: "À Faire", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300", icon: IconClock },
    IN_PROGRESS: { label: "En Cours", className: "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300", icon: IconLoader },
    DONE: { label: "Terminé", className: "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300", icon: IconCircleCheck },
};

export function TaskStatusPill({ status }: { status: string }) {
    const statusInfo = TASK_STATUS_MAP[status] || TASK_STATUS_MAP["TODO"];
    const Icon = statusInfo.icon;
    return (
        <Badge variant="outline" className={cn("text-xs font-medium border-0", statusInfo.className)}>
            <Icon className={cn("h-3 w-3 mr-1.5", status === 'IN_PROGRESS' && 'animate-spin')} />
            {statusInfo.label}
        </Badge>
    );
}