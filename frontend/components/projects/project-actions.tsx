"use client";

import React, { useState } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import { ME_QUERY } from "@/lib/graphql/projects";
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    IconDotsVertical, IconTrash, IconListDetails, IconAlertTriangle, IconEdit
} from "@tabler/icons-react";
import { toast } from "sonner";
import { ProjectPreviewPanel } from "./drawers/project-preview";

// 👇 HNA: Importi ProjectSheet li saybna (bdl l path ila kan mkhbia f dossier akhor)
import { ProjectSheet } from "@/components/create-project-drawer";

// Mutation delete & Query feed
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

export function ProjectActionsMenu({ project }: { project: any }) {
    const { data: meData } = useQuery(ME_QUERY);
    const userRole = meData?.me.role.name;

    // States
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    // 👇 Hada howa state li kayt7km f Sheet dyal modification
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Permissions
    const canEdit = userRole === 'ADMIN' || userRole === 'PROPOSAL_MANAGER';
    const canDelete = userRole === 'ADMIN';

    const [deleteProject, { loading: deleting }] = useMutation(DELETE_PROJECT_MUTATION, {
        onCompleted: () => {
            toast.success("Projet supprimé avec succès.");
            setIsAlertOpen(false);
        },
        onError: (err) => {
            toast.error(err.message);
            setIsAlertOpen(false);
        },
        refetchQueries: [{ query: GET_PROJECTS_FEED }]
    });

    const handleDeleteConfirm = () => {
        deleteProject({ variables: { projectId: project.id } });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted data-[state=open]:bg-muted">
                        <IconDotsVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {/* Preview (Drawer view) */}
                    <ProjectPreviewPanel project={project} />

                    {/* Tasks (Placeholder) */}
                    <DropdownMenuItem onClick={() => toast.info("Bientôt disponible")} className="cursor-pointer">
                        <IconListDetails className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Voir les Tâches</span>
                    </DropdownMenuItem>

                    {/* EDIT ACTION */}
                    {canEdit && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault();
                                // 👇 Hna kan7lo l sheet
                                setIsEditOpen(true);
                            }}
                            className="cursor-pointer"
                        >
                            <IconEdit className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Modifier le Projet</span>
                        </DropdownMenuItem>
                    )}

                    {/* DELETE ACTION (Admin Only) */}
                    {canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsAlertOpen(true);
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                            >
                                <IconTrash className="mr-2 h-4 w-4" />
                                <span>Supprimer le Projet</span>
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* --- SHEET DYAL MODIFICATION (INTEGRATION) --- */}
            {canEdit && (
                <ProjectSheet
                    projectToEdit={project}      // 👈 Hna kan3tiweh l data bach y3mer l inputs
                    open={isEditOpen}            // 👈 Kanrbtouh b state
                    onOpenChange={setIsEditOpen} // 👈 Bach yqder ytsd bo7do
                />
            )}

            {/* --- MODAL DE SUPPRESSION --- */}
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent className="sm:max-w-[425px] gap-6">
                    <AlertDialogHeader className="flex flex-col items-center gap-2 text-center sm:text-left sm:items-start">
                        <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20 mb-2 sm:mb-0">
                            <IconAlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
                        </div>
                        <div className="space-y-1">
                            <AlertDialogTitle className="text-lg font-semibold tracking-tight">
                                Supprimer le projet ?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm text-muted-foreground">
                                Vous êtes sur le point de supprimer <span className="font-medium text-foreground">"{project.title}"</span>.
                                Cette action est irréversible.
                            </AlertDialogDescription>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-between sm:gap-2">
                        <AlertDialogCancel disabled={deleting} className="w-full sm:w-auto mt-2 sm:mt-0">
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleting}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleting ? "Suppression..." : "Confirmer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}