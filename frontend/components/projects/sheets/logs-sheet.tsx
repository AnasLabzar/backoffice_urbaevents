"use client";
import * as React from "react";
import { useLazyQuery } from "@apollo/client";
import { GET_LOGS_QUERY } from "@/lib/graphql/projects";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate, parseDate } from "../utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconClipboardList, IconActivity } from "@tabler/icons-react";

export function ProjectLogsSheet({ project }: { project: any }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = React.useState(false);
    const [getLogs, { data: logData, loading: logLoading }] = useLazyQuery(GET_LOGS_QUERY);

    const handleTriggerClick = () => {
        setIsOpen(true);
        getLogs({ variables: { projectId: project.id } });
    };

    const logs = logData?.logs || [];

    const content = (
        <div className="flex flex-col gap-4 overflow-y-auto p-4 text-sm h-full">
            {logLoading && <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}
            {!logLoading && logs.length === 0 && <p className="text-muted-foreground text-center py-10">Aucune activité.</p>}
            {!logLoading && logs.length > 0 && (
                <ul className="flex flex-col">
                    {logs.map((log: any, index: number) => (
                        <li key={log.id} className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted"><IconActivity className="h-4 w-4 text-muted-foreground" /></span>
                                {index < logs.length - 1 && <div className="h-full w-px flex-1 bg-border my-1" />}
                            </div>
                            <div className="pb-6 flex-grow min-w-0">
                                <p className="text-sm font-medium text-foreground">{log.user?.name || 'Système'}</p>
                                <p className="text-sm text-muted-foreground">{log.details}</p>
                                <p className="text-xs text-muted-foreground/80 mt-1">{formatDate(parseDate(log.createdAt), "PPP p")}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    const trigger = (<Button variant="outline" size="icon" className="mt-1" onClick={handleTriggerClick} title="Voir Logs"><IconClipboardList className="h-4 w-4" /></Button>);
    const footer = (<Button variant="outline">Fermer</Button>);

    if (isMobile) {
        return <Drawer open={isOpen} onOpenChange={setIsOpen}><DrawerTrigger asChild>{trigger}</DrawerTrigger><DrawerContent className="h-[90vh]"><DrawerHeader className="gap-1"><DrawerTitle>Logs: {project.object}</DrawerTitle></DrawerHeader><div className="overflow-y-auto">{content}</div><DrawerFooter><DrawerClose asChild>{footer}</DrawerClose></DrawerFooter></DrawerContent></Drawer>;
    }
    return <Sheet open={isOpen} onOpenChange={setIsOpen}><SheetTrigger asChild>{trigger}</SheetTrigger><SheetContent className="sm:max-w-lg flex flex-col"><SheetHeader className="gap-1"><SheetTitle>Logs: {project.object}</SheetTitle></SheetHeader><div className="overflow-y-auto flex-1">{content}</div><SheetFooter><SheetClose asChild>{footer}</SheetClose></SheetFooter></SheetContent></Sheet>;
}