"use client";

import { use } from "react";
import { useQuery, gql } from "@apollo/client";
import { TechnicalDetails } from "@/components/production/technical-details";
import {
    IconLoader,
    IconAlertTriangle,
    IconInfoCircle,
    IconFileInvoice,
    IconBuildingSkyscraper,
    IconArrowRight
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-muted/10">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <IconLoader className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Chargement de l'espace technique...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-6 text-destructive bg-destructive/5 p-6">
                <div className="p-4 rounded-full bg-destructive/10">
                    <IconAlertTriangle className="w-12 h-12" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">Erreur de chargement</h3>
                    <p className="text-sm opacity-90 max-w-md mx-auto">{error.message}</p>
                </div>
                <Button variant="outline" className="border-destructive/30 hover:bg-destructive/10" onClick={() => window.location.reload()}>
                    Réessayer
                </Button>
            </div>
        );
    }

    if (!data?.project) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
                <h3 className="text-lg font-semibold">Projet introuvable</h3>
                <Button onClick={() => router.back()}>Retour</Button>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <SiteHeader />

                {/* Main Content Area */}
                <div className="min-h-screen bg-muted/5 flex flex-col">

                    {/* Breadcrumb & Title Header (Hidden on Print) */}
                    <div className="bg-background border-b px-8 py-5 print:hidden">
                        <div className="max-w-[1600px] mx-auto space-y-4">

                            {/* Breadcrumb */}
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/dashboard/projects">Projets</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="font-medium text-foreground">{data.project.projectCode}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="text-primary font-semibold">Offre Technique</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                                        {data.project.title}
                                        <Badge variant="secondary" className="font-mono font-normal text-xs bg-blue-50 text-blue-700 border-blue-200">
                                            {data.project.projectCode}
                                        </Badge>
                                    </h1>
                                    <p className="text-sm text-muted-foreground">{data.project.object}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="h-8 px-3 gap-1.5 bg-background shadow-sm">
                                        <IconFileInvoice className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-xs font-medium">Mode Édition</span>
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">

                        {/* Context Alert Banner (Hidden on Print) */}
                        <Alert className="bg-blue-50/50 border-blue-200 text-blue-900 print:hidden shadow-sm">
                            <div className="flex gap-4">
                                <div className="p-2 bg-blue-100 rounded-full h-fit mt-1 text-blue-600">
                                    <IconInfoCircle className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                    <AlertTitle className="text-blue-800 font-bold text-sm">Espace de Chiffrage Technique & Financier</AlertTitle>
                                    <AlertDescription className="text-blue-700/80 text-xs leading-relaxed max-w-3xl">
                                        Cette interface centralisée vous permet de construire l'offre technique détaillée.
                                        Les montants saisis ici alimentent directement le budget prévisionnel et le calcul de la marge.
                                        Utilisez le bouton "Exporter" pour générer un document PDF professionnel.
                                    </AlertDescription>
                                </div>
                            </div>
                        </Alert>

                        {/* Technical Details Component */}
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