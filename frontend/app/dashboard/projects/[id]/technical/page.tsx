"use client";

import { use } from "react";
import { useQuery, gql } from "@apollo/client";
import { TechnicalDetails } from "@/components/production/technical-details";
import {
    IconLoader,
    IconAlertTriangle,
    IconInfoCircle,
    IconFileInvoice,
    IconBriefcase
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const GET_PROJECT_CONTEXT = gql`
  query GetProjectContext($id: ID!) {
    project(id: $id) {
      id
      title
      object
      projectCode
      marketEstimate
      estimatedBudget
    }
  }
`;

export default function TechnicalPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const { data, loading, error } = useQuery(GET_PROJECT_CONTEXT, {
        variables: { id }
    });

    // --- LOADING STATE ---
    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-background">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <IconLoader className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Chargement de l'espace technique...</p>
            </div>
        );
    }

    // --- ERROR STATE ---
    if (error) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-6 text-destructive bg-background p-6">
                <div className="p-4 rounded-full bg-destructive/10">
                    <IconAlertTriangle className="w-12 h-12" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">Erreur de chargement</h3>
                    <p className="text-sm opacity-90 max-w-md mx-auto text-muted-foreground">{error.message}</p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    Réessayer
                </Button>
            </div>
        );
    }

    // --- NOT FOUND STATE ---
    if (!data?.project) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-background">
                <h3 className="text-lg font-semibold">Projet introuvable</h3>
                <Button onClick={() => router.back()}>Retour</Button>
            </div>
        );
    }

    // --- SUCCESS STATE ---
    return (
        <SidebarProvider>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />

                {/* Main Content Area */}
                <div className="min-h-screen bg-muted/5 flex flex-col">

                    {/* Breadcrumb & Title Header (Hidden on Print) */}
                    <div className="bg-background border-b px-6 py-5 print:hidden">
                        <div className="max-w-[1600px] mx-auto space-y-4">
                            {/* Breadcrumb Navigation */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => router.push('/dashboard')}>Dashboard</span>
                                <span className="opacity-50">/</span>
                                <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => router.push('/dashboard/projects')}>Projets</span>
                                <span className="opacity-50">/</span>
                                <span className="font-medium text-foreground">{data.project.projectCode}</span>
                                <span className="opacity-50">/</span>
                                <span className="text-primary font-semibold flex items-center gap-1">
                                    <IconFileInvoice className="w-3 h-3" />
                                    Technique & Devis
                                </span>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                                        {data.project.title}
                                        <Badge variant="outline" className="font-mono font-normal text-xs border-primary/20 text-primary bg-primary/5">
                                            {data.project.projectCode}
                                        </Badge>
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <IconBriefcase className="w-4 h-4 opacity-70" />
                                        <span>{data.project.object}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="h-8 px-3 gap-1.5 bg-secondary/50 text-secondary-foreground">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        <span className="text-xs font-medium">Mode Édition Actif</span>
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">

                        {/* Context Alert Banner (Adapté Dark Mode) */}
                        <Alert className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 print:hidden shadow-sm">
                            <div className="flex gap-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full h-fit mt-1 text-blue-600 dark:text-blue-400">
                                    <IconInfoCircle className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                    <AlertTitle className="text-blue-800 dark:text-blue-300 font-bold text-sm">Espace de Chiffrage Technique & Financier</AlertTitle>
                                    <AlertDescription className="text-blue-700/80 dark:text-blue-300/70 text-xs leading-relaxed max-w-3xl">
                                        Cette interface centralisée vous permet de construire l'offre technique détaillée.
                                        Les montants saisis ici alimentent directement le budget prévisionnel et le calcul de la marge.
                                        Utilisez le bouton "Exporter PDF" pour générer un document officiel.
                                    </AlertDescription>
                                </div>
                            </div>
                        </Alert>

                        <Separator className="bg-border/50 print:hidden" />

                        {/* Technical Details Component (Contient le Template d'impression) */}
                        <div className="print:m-0 print:p-0">
                            <TechnicalDetails
                                projectId={data.project.id}
                                projectTitle={`${data.project.projectCode} - ${data.project.title}`}
                                initialBudget={data.project.estimatedBudget}
                                initialMarket={data.project.marketEstimate}
                            />
                        </div>

                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}