"use client";

import { useState, useMemo } from "react";
import { useMutation, gql, useQuery } from "@apollo/client";
import { toast } from "sonner";
import {
    IconCurrencyDirham, IconDeviceFloppy, IconLoader, IconArrowLeft,
    IconPrinter, IconFileSpreadsheet, IconCalculator,
    IconBuildingSkyscraper, IconMapPin, IconMail, IconPhone,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Import du Manager
import { PrestationManager } from "./prestation-manager";

// --- GRAPHQL ---

const UPDATE_PROJECT_BUDGET = gql`
  mutation UpdateProjectBudget($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) { id estimatedBudget marketEstimate }
  }
`;

const GET_ESTIMATION_CONTEXT = gql`
  query GetEstimationContext($projectId: ID!) {
    getProjectEstimation(projectId: $projectId) {
      id
      reference
      totalAmount
      createdAt
    }
  }
`;

// Query pour récupérer les items spécifiquement pour l'impression (avec détails)
const GET_INVOICE_ITEMS_FOR_PRINT = gql`
  query GetInvoiceItemsForPrint($invoiceId: ID!) {
    getInvoiceItems(invoiceId: $invoiceId) {
      id
      category
      subCategory
      designation
      description
      quantity
      unit
      unitPrice
      totalPrice
    }
  }
`;

// --- TYPES ---

interface TechnicalDetailsProps {
    projectId: string;
    projectTitle: string;
    initialBudget: number;
    initialMarket: number;
}

// --- COMPONENT ---

export function TechnicalDetails({ projectId, projectTitle, initialBudget, initialMarket }: TechnicalDetailsProps) {
    const router = useRouter();

    // 1. STATE : Données Financières
    const [budgetClient, setBudgetClient] = useState(initialMarket || 0); // Prix de vente
    const [estimatedBudget, setEstimatedBudget] = useState(initialBudget || 0); // Budget cible
    const [technicalCost, setTechnicalCost] = useState(0); // Coût réel (calculé depuis PrestationManager)

    // 2. DATA FETCHING
    const { data: invoiceData, loading: loadingInvoice } = useQuery(GET_ESTIMATION_CONTEXT, {
        variables: { projectId }
    });

    const estimationId = invoiceData?.getProjectEstimation?.id;
    const estimationRef = invoiceData?.getProjectEstimation?.reference || "BROUILLON";
    const estimationDate = invoiceData?.getProjectEstimation?.createdAt;

    // Fetch des items pour le template d'impression (indépendant du manager)
    const { data: itemsData } = useQuery(GET_INVOICE_ITEMS_FOR_PRINT, {
        variables: { invoiceId: estimationId },
        skip: !estimationId,
        fetchPolicy: 'cache-and-network'
    });

    // 3. MUTATIONS
    const [updateBudget, { loading: isSaving }] = useMutation(UPDATE_PROJECT_BUDGET, {
        onCompleted: () => toast.success("Budget mis à jour"),
        onError: (err) => toast.error(err.message)
    });

    // 4. HANDLERS
    const handleSave = async () => {
        await updateBudget({
            variables: {
                id: projectId,
                input: {
                    marketEstimate: parseFloat(budgetClient.toString()),
                    estimatedBudget: parseFloat(estimatedBudget.toString())
                }
            }
        });
    };

    const handlePrint = () => {
        window.print();
    };

    // 5. CALCULS FINANCIERS (Dashboard)
    const margeReelle = budgetClient - technicalCost;
    const margePercent = budgetClient > 0 ? (margeReelle / budgetClient) * 100 : 0;
    const isProfit = margeReelle >= 0;

    // 6. CALCULS POUR IMPRESSION (TVA, TTC)
    const groupedItems = useMemo(() => {
        if (!itemsData?.getInvoiceItems) return {};
        return itemsData.getInvoiceItems.reduce((acc: any, item: any) => {
            const cat = item.category || 'AUTRE';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});
    }, [itemsData]);

    const TVA_RATE = 0.20;
    const totalHT = technicalCost;
    const totalTVA = totalHT * TVA_RATE;
    const totalTTC = totalHT + totalTVA;

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* =====================================================================================
                SECTION ECRAN (Visible seulement sur l'écran, cachée à l'impression)
               ===================================================================================== */}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 rounded-xl border bg-card shadow-sm print:hidden">
                <div className="space-y-1">
                    <Button variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground" onClick={() => router.back()}>
                        <IconArrowLeft className="w-4 h-4 mr-2" /> Retour au projet
                    </Button>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <IconCalculator className="w-6 h-6 text-primary" />
                        Détail Technique & Estimation
                    </h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">{projectTitle}</Badge>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">{estimationRef}</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2" onClick={handlePrint}>
                        <IconPrinter className="w-4 h-4" /> Exporter PDF
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="shadow-lg bg-primary gap-2 text-primary-foreground hover:bg-primary/90">
                        {isSaving ? <IconLoader className="animate-spin w-4 h-4" /> : <IconDeviceFloppy className="w-4 h-4" />}
                        Enregistrer
                    </Button>
                </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 print:hidden">

                {/* GAUCHE: PRESTATION MANAGER */}
                <div className="xl:col-span-8 space-y-6">
                    {loadingInvoice ? (
                        <div className="py-20 text-center"><IconLoader className="animate-spin mx-auto w-8 h-8 text-muted-foreground" /></div>
                    ) : estimationId ? (
                        <PrestationManager
                            projectId={projectId}
                            invoiceId={estimationId}
                            onTotalChange={setTechnicalCost}
                        />
                    ) : (
                        <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground bg-muted/10">
                            <p>L'estimation n'a pas encore été initialisée pour ce projet.</p>
                        </div>
                    )}
                </div>

                {/* DROITE: DASHBOARD FINANCIER */}
                <div className="xl:col-span-4 space-y-6">
                    <Card className={cn("border-2 shadow-lg sticky top-6 transition-colors", isProfit ? "border-green-100 dark:border-green-900 bg-green-50/30" : "border-red-100 bg-red-50/30")}>
                        <CardHeader className="pb-4 border-b bg-background/50 backdrop-blur-sm">
                            <CardTitle className="text-base font-bold uppercase flex items-center gap-2">
                                <IconCurrencyDirham className="w-5 h-5" /> Rentabilité Projet
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-8">

                            {/* Inputs Financiers */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Prix de Vente (Marché)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            className="pl-3 pr-12 text-lg font-bold font-mono bg-background border-primary/20 focus:border-primary shadow-sm"
                                            value={budgetClient}
                                            onChange={e => setBudgetClient(parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">MAD</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5 opacity-80 hover:opacity-100 transition-opacity">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Budget Cible (Interne)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            className="pl-3 pr-12 text-sm font-mono bg-background/50"
                                            value={estimatedBudget}
                                            onChange={e => setEstimatedBudget(parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">MAD</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* KPI Display */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground">Coût Technique (Live)</span>
                                    <span className="text-lg font-bold font-mono">{technicalCost.toLocaleString()} MAD</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold uppercase">Marge Nette</span>
                                        <div className="text-right">
                                            <span className={cn("text-2xl font-black block font-mono", isProfit ? "text-green-600" : "text-red-600")}>
                                                {margeReelle.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span>
                                            </span>
                                        </div>
                                    </div>
                                    <Progress
                                        value={Math.min(Math.max(margePercent, 0), 100)}
                                        className={cn("h-3", isProfit ? "bg-green-200" : "bg-red-200")}
                                        indicatorClassName={isProfit ? "bg-green-600" : "bg-red-600"}
                                    />
                                    <div className="flex justify-end">
                                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded", isProfit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                            {margePercent.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                {technicalCost > estimatedBudget && (
                                    <div className="p-3 bg-red-100 border border-red-200 rounded-md flex items-start gap-2 text-red-800 text-xs animate-pulse">
                                        <IconFileSpreadsheet className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div>
                                            <strong>Alerte Dépassement !</strong>
                                            <p>Le coût technique dépasse le budget interne alloué.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>


            {/* =====================================================================================
                SECTION IMPRESSION (Visible SEULEMENT à l'impression / PDF)
               ===================================================================================== */}

            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0 w-full h-full text-black overflow-visible">
                {/* Conteneur A4 Style */}
                <div className="w-full max-w-[210mm] mx-auto p-10 min-h-screen flex flex-col">

                    {/* Header Facture */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                        <div className="flex items-center gap-5">
                            {/* Logo */}
                            <div className="bg-black text-white flex items-center justify-center">
                                <img
                                    src="/logo/logo-black-urba-events.png"
                                    alt="URBA EVENTS BackOffice"
                                    className="h-12" // Kbrt l-logo chwiya
                                />
                            </div>
                            {/* <div>
                                <h1 className="text-2xl font-black text-black tracking-tight leading-none mb-1">URBA EVENTS</h1>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Agence Événementielle</p>
                                <div className="mt-3 text-[9px] text-gray-500 font-medium space-y-0.5">
                                    <p className="flex items-center gap-1.5"><IconMapPin size={10} /> 123, Boulevard Zerktouni, Casablanca</p>
                                    <p className="flex items-center gap-1.5"><IconMail size={10} /> contact@urbaevents.ma</p>
                                    <p className="flex items-center gap-1.5"><IconPhone size={10} /> +212 5 22 00 00 00</p>
                                </div>
                            </div> */}
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-light text-gray-400 uppercase tracking-wide">ESTIMATION</h2>
                            <div className="mt-3">
                                <div className="inline-block bg-gray-100 rounded px-3 py-1 mb-1">
                                    <span className="text-[10px] uppercase text-gray-500 font-bold mr-2">Référence</span>
                                    <span className="text-sm font-bold font-mono">{estimationRef}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium">
                                    Date: {estimationDate ? new Date(parseInt(estimationDate)).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info Projet */}
                    <div className="mb-8 bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Projet</span>
                                <p className="text-lg font-bold text-gray-900 mt-1">{projectTitle}</p>
                            </div>
                            {/* Placeholder Client */}
                            <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Client</span>
                                <p className="text-sm font-medium text-gray-900 mt-1">Client Confidentiel</p>
                            </div>
                        </div>
                    </div>

                    {/* Tableau des Prestations */}
                    <div className="flex-1">
                        <table className="w-full text-sm">
                            <thead className="border-b-2 border-black">
                                <tr className="text-left text-[10px] uppercase tracking-wider font-bold text-gray-500">
                                    <th className="pb-3 pl-2 w-[45%]">Désignation</th>
                                    <th className="pb-3 text-center w-[10%]">Unité</th>
                                    <th className="pb-3 text-center w-[10%]">Qté</th>
                                    <th className="pb-3 text-right w-[15%]">P.U (HT)</th>
                                    <th className="pb-3 pr-2 text-right w-[20%]">Total (HT)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Object.entries(groupedItems).map(([cat, items]: [string, any]) => (
                                    <>
                                        {/* En-tête de Catégorie */}
                                        <tr key={cat} className="bg-gray-50/80 break-inside-avoid">
                                            <td colSpan={5} className="py-2 px-3 font-bold text-[11px] uppercase tracking-wide text-gray-800 mt-4 border-l-2 border-black">
                                                {cat.replace('_', ' ')}
                                            </td>
                                        </tr>
                                        {/* Items */}
                                        {items.map((item: any) => (
                                            <tr key={item.id} className="group break-inside-avoid">
                                                <td className="py-2.5 pl-2 pr-4 align-top">
                                                    <div className="font-semibold text-gray-900 text-xs">{item.designation}</div>
                                                    {item.description && (
                                                        <div className="text-[9px] text-gray-500 mt-0.5 whitespace-pre-wrap leading-tight">
                                                            {item.description.startsWith('{') ? "Spécifications techniques incluses" : item.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 text-center align-top text-gray-500 text-[10px] uppercase">{item.unit || 'U'}</td>
                                                <td className="py-2.5 text-center align-top font-mono text-xs">{item.quantity}</td>
                                                <td className="py-2.5 text-right align-top font-mono text-xs text-gray-600">{item.unitPrice.toLocaleString('fr-FR')}</td>
                                                <td className="py-2.5 pr-2 text-right align-top font-bold font-mono text-xs">{item.totalPrice.toLocaleString('fr-FR')}</td>
                                            </tr>
                                        ))}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totaux & Footer */}
                    <div className="mt-8 break-inside-avoid">
                        <div className="flex justify-end">
                            <div className="w-1/3 bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-medium">Total HT</span>
                                    <span className="font-bold font-mono">{totalHT.toLocaleString('fr-FR')} MAD</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-medium">TVA (20%)</span>
                                    <span className="font-mono text-gray-600">{totalTVA.toLocaleString('fr-FR')} MAD</span>
                                </div>
                                <Separator className="bg-gray-300 my-2" />
                                <div className="flex justify-between text-base pt-1">
                                    <span className="font-bold text-gray-900">NET À PAYER</span>
                                    <span className="font-black font-mono">{totalTTC.toLocaleString('fr-FR')} MAD</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Legal */}
                        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">
                                URBA EVENTS S.A.R.L - Au capital de 100.000 DHS
                            </p>
                            <p className="text-[8px] text-gray-400 font-mono">
                                RC: 123456 • IF: 12345678 • ICE: 000123456789000 • Patente: 12345678 • CNSS: 1234567
                            </p>
                            <p className="text-[8px] text-gray-300 mt-2">Document généré automatiquement via Urba Manager le {new Date().toLocaleString()}</p>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}