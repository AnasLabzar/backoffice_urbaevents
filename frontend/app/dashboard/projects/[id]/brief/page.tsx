"use client";

import React, { useEffect } from "react";
import { useQuery, gql } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";

// Components
import { BriefForm } from "@/components/production/brief-form"; // Vérifier le chemin exact
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

// ✅ CORRECTION DU QUERY : Ajout de 'id' et 'constraints'
const GET_PROJECT_BRIEF_PAGE = gql`
  query GetProjectBriefPage($id: ID!) {
    project(id: $id) {
      id
      title
      object
      projectCode
      preparationStatus 
      
      stages {
        administrative {
          documents { id fileName fileUrl originalFileName }
        }
        technical {
          documents { id fileName fileUrl originalFileName }
        }
      }

      brief {
        id              # ⚠️ TRES IMPORTANT : Pour que le formulaire sache qu'il existe déjà
        clientNature
        eventFormat
        toneStyle
        location
        locationType
        visitorsCount
        startDate
        endDate
        estimatedBudget
        eventGoal       # Array
        targetAudience  # Array
        mainObjective
        history
        constraints     # ⚠️ ETAIT MANQUANT : C'est le champ 'Conditions & Contraintes'
        requirements {
          logistics
          audiovisual
          accommodation
          catering
          transport
          digital
          hr
          animation
        }
        updatedAt
      }
    }
  }
`;

export default function ProjectBriefPage() {
    const params = useParams();
    const projectId = params.id as string;
    const router = useRouter();

    // On utilise network-only pour être sûr d'avoir la dernière version de la DB
    const { data, loading, error, refetch } = useQuery(GET_PROJECT_BRIEF_PAGE, {
        variables: { id: projectId },
        fetchPolicy: "network-only"
    });

    if (loading) return <BriefLoadingLayout />;
    if (error) return <BriefErrorLayout message={error.message} onBack={() => router.back()} />;

    const project = data?.project;

    // DEBUG : Voir si le brief arrive bien
    // console.log("Project Data:", project);
    // console.log("Brief Data:", project?.brief);

    const projectDocuments = [
        ...(project.stages?.administrative?.documents || []),
        ...(project.stages?.technical?.documents || [])
    ];

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties}
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />

                <main className="flex-1 flex flex-col bg-[#F9FAFB] dark:bg-background min-h-screen">

                    {/* --- HEADER --- */}
                    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b px-6 py-4">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.back()}
                                    className="gap-2 text-muted-foreground hover:text-foreground pl-0"
                                >
                                    <IconArrowLeft className="h-4 w-4" />
                                    Retour
                                </Button>
                                <div className="h-4 w-px bg-border hidden sm:block" />
                                <div className="flex items-center gap-2">
                                    <h1 className="text-sm font-semibold text-foreground">
                                        Brief & Stratégie
                                    </h1>
                                    <Badge variant="secondary" className="font-mono text-[10px]">
                                        {project.projectCode}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- MAIN CONTENT --- */}
                    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                        {/* On passe project.brief comme initialData. 
                            Si c'est null, le formulaire sera vide (mode création).
                            Si c'est rempli, le useEffect du formulaire remplira les champs. 
                        */}
                        <BriefForm
                            projectId={projectId}
                            projectTitle={project.title}
                            projectObject={project.object}
                            initialData={project.brief}
                            documents={projectDocuments}
                            onSave={() => refetch()}
                        />
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}

// --- LOADING STATE ---
function BriefLoadingLayout() {
    return (
        <SidebarProvider>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex-1 p-8 space-y-8 bg-[#F9FAFB] dark:bg-background">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="flex justify-between">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <Skeleton className="h-64 w-full rounded-xl" />
                                <Skeleton className="h-96 w-full rounded-xl" />
                            </div>
                            <div className="space-y-6">
                                <Skeleton className="h-40 w-full rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

function BriefErrorLayout({ message, onBack }: { message: string, onBack: () => void }) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-4 gap-4">
            <p className="text-red-500 font-medium">Erreur de chargement: {message}</p>
            <Button onClick={onBack} variant="outline">Retour au projet</Button>
        </div>
    );
}