"use client";
import { useQuery } from "@apollo/client";
import { ME_QUERY } from "@/lib/graphql/projects";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IconDotsVertical } from "@tabler/icons-react";
import { toast } from "sonner";
import { ProjectPreviewPanel } from "./drawers/project-preview";

export function ProjectActionsMenu({ project }: { project: any }) {
    const { data: meData } = useQuery(ME_QUERY);
    const userRole = meData?.me.role.name;

    const handleViewTasks = () => {
        toast.info("Page de tâches en cours de développement.");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0"><IconDotsVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <ProjectPreviewPanel project={project} />
                <DropdownMenuItem onClick={handleViewTasks}>View Tasks</DropdownMenuItem>
                <DropdownMenuSeparator />
                {userRole === 'ADMIN' && <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}