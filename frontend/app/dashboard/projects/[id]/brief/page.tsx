"use client";

import React from "react";
import { useQuery, gql } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import { IconArrowLeft, IconLayoutDashboard } from "@tabler/icons-react";

// Components
import { BriefForm } from "@/components/production/brief-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

// GraphQL Query : On récupère aussi les documents pour le ZIP
const GET_PROJECT_BRIEF_PAGE = gql`
  query GetProjectBriefPage($id: ID!) {
    project(id: $id) {
      id
      title
      object # C'est souvent ici qu'est le nom du client ou l'objet
      projectCode
      preparationStatus 
      
      # Récupération des documents pour la section téléchargement
      stages {
        administrative {
          documents { id fileName fileUrl originalFileName }
        }
        technical {
          documents { id fileName fileUrl originalFileName }
        }
      }

      brief {
        # On ne récupère plus clientName/projectName ici car on utilise ceux du projet parent
        clientNature
        eventFormat
        toneStyle
        location
        locationType
        visitorsCount
        startDate
        endDate
        estimatedBudget
        eventGoal
        targetAudience
        mainObjective
        history
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

    const { data, loading, error, refetch } = useQuery(GET_PROJECT_BRIEF_PAGE, {
        variables: { id: projectId },
        fetchPolicy: "network-only"
    });

    if (loading) return <BriefLoadingLayout />;
    if (error) return <BriefErrorLayout message={error.message} onBack={() => router.back()} />;

    const project = data?.project;

    // Consolidation des documents pour le composant BriefForm
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

                    {/* --- HEADER ÉPURÉ --- */}
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
                        <BriefForm
                            projectId={projectId}
                            projectTitle={project.title}
                            projectObject={project.object}
                            initialData={project.brief}
                            documents={projectDocuments} // On passe les docs pour le téléchargement
                            onSave={() => refetch()}
                        />
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}

// --- LOADING STATE (Minimalist) ---
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
        <div className="h-screen w-full flex flex-col items-center justify-center p-4">
            <p className="text-red-500 mb-4">{message}</p>
            <Button onClick={onBack}>Retour</Button>
        </div>
    );
}