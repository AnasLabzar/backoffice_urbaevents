"use client";
import * as React from "react";
import { useLazyQuery } from "@apollo/client";
import { GET_LOGS_QUERY } from "@/lib/graphql/projects";
import { useIsMobile } from "@/hooks/use-mobile";
import { subDays } from "date-fns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, DrawerTrigger } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { IconEye, IconClock, IconUsers, IconActivity } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { parseDate, formatDate, ProjectStatusPill } from "../utils";

export function ProjectPreviewPanel({ project }: { project: any }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = React.useState(false);
    const [getLogs, { data: logData, loading: logLoading }] = useLazyQuery(GET_LOGS_QUERY);

    const handleTriggerClick = () => {
        setIsOpen(true);
        if (!logData) {
            getLogs({ variables: { projectId: project.id } });
        }
    };

    const submissionDate = parseDate(project.submissionDeadline);
    const cautionDate = submissionDate ? subDays(submissionDate, 7) : null;

    const content = (
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
            {/* Details */}
            <div className="flex flex-col gap-3 rounded-lg border p-4">
                <h4 className="font-semibold">Détails du Projet</h4>
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Client:</span><span className="font-medium">{project.title}</span>
                    <span className="text-muted-foreground">Projet:</span><span className="font-medium">{project.object}</span>
                    <span className="text-muted-foreground">Status:</span><span><ProjectStatusPill status={project.preparationStatus} /></span>
                    <span className="text-muted-foreground">Chef de Projet:</span><span className="font-medium">{project.projectManagers[0]?.name || "N/A"}</span>
                </div>
            </div>
            {/* Dates */}
            <div className="flex flex-col gap-3 rounded-lg border p-4">
                <h4 className="font-semibold flex items-center gap-2"><IconClock className="h-4 w-4" /> Dates Clés</h4>
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Demande Caution (Calc.):</span><span className="font-medium">{formatDate(cautionDate, "PPP")}</span>
                    <span className="text-muted-foreground">Date de Dépôt:</span><span className="font-medium text-red-500">{formatDate(submissionDate, "PPP p")}</span>
                </div>
            </div>
            {/* Team */}
            <div className="flex flex-col gap-3 rounded-lg border p-4">
                <h4 className="font-semibold flex items-center gap-2"><IconUsers className="h-4 w-4" /> Équipe Assignée</h4>
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Infographistes:</span>
                    <div className="flex flex-col">{project.team.infographistes.length > 0 ? project.team.infographistes.map((u: any) => <span key={u.id} className="font-medium">{u.name}</span>) : <span className="font-medium text-muted-foreground">N/A</span>}</div>
                    <span className="text-muted-foreground">Équipe 3D:</span>
                    <div className="flex flex-col">{project.team.team3D.length > 0 ? project.team.team3D.map((u: any) => <span key={u.id} className="font-medium">{u.name}</span>) : <span className="font-medium text-muted-foreground">N/A</span>}</div>
                    <span className="text-muted-foreground">Assistants:</span>
                    <div className="flex flex-col">{project.team.assistants.length > 0 ? project.team.assistants.map((u: any) => <span key={u.id} className="font-medium">{u.name}</span>) : <span className="font-medium text-muted-foreground">N/A</span>}</div>
                </div>
            </div>
            {/* Logs */}
            <div className="flex flex-col gap-3 rounded-lg border p-4">
                <h4 className="font-semibold flex items-center gap-2"><IconActivity className="h-4 w-4" /> Traçabilité (Logs)</h4>
                <div className="max-h-48 overflow-y-auto">
                    {logLoading && <Skeleton className="h-8 w-full" />}
                    {logData && logData.logs.length === 0 && <p className="text-muted-foreground">Aucune activité.</p>}
                    <ul className="list-none space-y-2">
                        {logData?.logs.map((log: any) => (
                            <li key={log.id} className="text-xs">
                                <span className="font-medium">{log.user.name}</span><span className="text-muted-foreground">: {log.details}</span><br />
                                <span className="text-muted-foreground/70">{formatDate(parseDate(log.createdAt))}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );

    const trigger = (
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleTriggerClick(); }}>
            <IconEye className="mr-2 h-4 w-4" /> Preview
        </DropdownMenuItem>
    );
    const footer = (<Button variant="outline">Done</Button>);

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerTrigger asChild>{trigger}</DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader className="gap-1"><DrawerTitle>{project.object}</DrawerTitle><DrawerDescription>Aperçu du dossier (Read-Only).</DrawerDescription></DrawerHeader>
                    {content}
                    <DrawerFooter><DrawerClose asChild>{footer}</DrawerClose></DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent className="sm:max-w-xl">
                <SheetHeader className="gap-1"><SheetTitle>{project.object}</SheetTitle><SheetDescription>Aperçu du dossier (Read-Only).</SheetDescription></SheetHeader>
                {content}
                <SheetFooter><SheetClose asChild>{footer}</SheetClose></SheetFooter>
            </SheetContent>
        </Sheet>
    );
}