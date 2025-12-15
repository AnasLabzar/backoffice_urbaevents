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
        // Flatten list for this specific invoice template which is a simple list
        // If grouping is needed later, logic can be adjusted.
        // For now, let's keep it as a flat list sorted by category or creation if needed, 
        // but the PDF example shows a numbered list.
        return itemsData.getInvoiceItems;
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
                    <Card className={cn(
                        "shadow-lg sticky top-6 transition-all duration-300 border-2",
                        isProfit 
                            ? "border-green-100 dark:border-green-900/50 bg-gradient-to-b from-green-50/50 to-transparent dark:from-green-950/10" 
                            : "border-red-100 dark:border-red-900/50 bg-gradient-to-b from-red-50/50 to-transparent dark:from-red-950/10"
                    )}>
                        <CardHeader className="pb-4 border-b bg-background/40 backdrop-blur-md">
                            <CardTitle className="text-base font-bold uppercase flex items-center gap-2">
                                <div className={cn("p-1.5 rounded-md", isProfit ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                                    <IconCurrencyDirham className="w-5 h-5" />
                                </div>
                                Rentabilité Projet
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-8">

                            {/* Inputs Financiers */}
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Prix de Vente (Marché)</Label>
                                    <div className="relative group">
                                        <Input
                                            type="number"
                                            className="pl-4 pr-12 h-12 text-xl font-bold font-mono bg-background border-input hover:border-primary/50 focus:border-primary transition-colors shadow-sm"
                                            value={budgetClient}
                                            onChange={e => setBudgetClient(parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">MAD</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Budget Cible (Interne)</Label>
                                    <div className="relative group">
                                        <Input
                                            type="number"
                                            className="pl-4 pr-12 h-10 text-sm font-mono bg-background/50 border-input hover:border-primary/30 focus:border-primary/50 transition-colors"
                                            value={estimatedBudget}
                                            onChange={e => setEstimatedBudget(parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">MAD</span>
                                    </div>
                                </div>
                            </div>

                            <Separator className="bg-border/50" />

                            {/* KPI Display */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center p-3 rounded-lg bg-background/50 border border-border/50">
                                    <span className="text-sm font-medium text-muted-foreground">Coût Technique (Live)</span>
                                    <span className="text-lg font-bold font-mono">{technicalCost.toLocaleString()} MAD</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold uppercase text-muted-foreground">Marge Nette</span>
                                        <div className="text-right">
                                            <span className={cn("text-3xl font-black block font-mono tracking-tight", isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                                {margeReelle.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">MAD</span>
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="relative pt-1">
                                    <Progress
                                        value={Math.min(Math.max(margePercent, 0), 100)}
                                        className={cn("h-2.5", isProfit ? "bg-green-100 dark:bg-green-950/30" : "bg-red-100 dark:bg-red-950/30")}
                                        indicatorClassName={isProfit ? "bg-green-500 dark:bg-green-400" : "bg-red-500 dark:bg-red-400"}
                                    />
                                    </div>

                                    <div className="flex justify-end">
                                        <Badge variant="outline" className={cn("font-mono text-xs border-0", isProfit ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300")}>
                                            {margePercent.toFixed(1)}% de marge
                                        </Badge>
                                    </div>
                                </div>

                                {technicalCost > estimatedBudget && (
                                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg flex items-start gap-3 text-red-800 dark:text-red-300 text-sm animate-in fade-in slide-in-from-bottom-2">
                                        <IconFileSpreadsheet className="w-5 h-5 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <strong className="block font-semibold">Alerte Dépassement !</strong>
                                            <p className="opacity-90">Le coût technique dépasse le budget interne alloué.</p>
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

            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0 w-full h-full text-black font-sans leading-normal">
                {/* Conteneur A4 Style (Padding ajusté pour impression) */}
                <div className="w-full h-full p-8 flex flex-col justify-between relative">

                    {/* --- HEADER --- */}
                    <div className="mb-8">
                        {/* Top Row: Logo & Facture Title */}
                        <div className="flex justify-between items-start mb-6">
                            {/* Logo */}
                            <div className="w-1/3">
                                {/* Using the updated logo image file if available, or fallback to text/icon */}
                                <img src="/logo/logo-dark-urba-events.png" alt="URBA EVENTS INTERNATIONAL" className="h-16 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                {/* Fallback text if image fails or for SEO */}
                                <div className="mt-2">
                                    <img
                                        src="/logo/logo-dark-urba-events.png"
                                        alt="URBA EVENTS BackOffice"
                                        className="h-16" // Kbrt l-logo chwiya
                                    />
                                </div>
                            </div>

                            {/* Facture Box */}
                            <div className="w-1/3 text-right">
                                <div className="border-2 border-gray-800 p-2 inline-block min-w-[200px] text-center">
                                    <h2 className="text-xl font-bold uppercase">DEVIS Estimer</h2>
                                </div>
                            </div>
                        </div>

                        {/* Middle Row: Details & Client */}
                        <div className="flex justify-between items-start text-xs">
                            {/* Left: Invoice Details */}
                            <div className="w-[45%] border border-gray-300 p-3 rounded-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="font-bold">N° Facture:</span>
                                    <span>{estimationRef}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold">Date:</span>
                                    <span>{estimationDate ? new Date(parseInt(estimationDate)).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold">Référence:</span>
                                    <span className="text-align: right; justify-content: end;">{projectTitle}</span> {/* Using project title as reference context */}
                                </div>
                            </div>

                            {/* Right: Client Details */}
                            <div className="w-[45%] border border-gray-300 p-3 rounded-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="font-bold">Client:</span>
                                    <span>Casablanca Events et Animation</span> {/* Placeholder or Dynamic */}
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold">ICE:</span>
                                    <span>001630800000095</span> {/* Placeholder or Dynamic */}
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="font-bold">Adresse:</span>
                                    <span className="text-right max-w-[150px]">105 Boulevard Anfa, 1 ère étage Casablanca-Maroc</span>
                                </div>
                            </div>
                        </div>

                        {/* Object */}
                        <div className="mt-6 border border-gray-300 p-3 rounded-sm text-xs">
                            <span className="font-bold underline mb-1 block">Objet:</span>
                            <p>Supplément de l'Aménagement Et équipements des espaces relatifs à l'organisation de la course du 10 KM International By Wecasablanca</p>
                        </div>
                    </div>

                    {/* --- TABLE --- */}
                    <div className="flex-1">
                        <table className="w-full text-xs border-collapse border border-gray-800">
                            <thead>
                                <tr className="bg-gray-100 text-center font-bold">
                                    <th className="border border-gray-600 p-2 w-[5%]">N°</th>
                                    <th className="border border-gray-600 p-2 w-[50%] text-left">DÉSIGNATION</th>
                                    <th className="border border-gray-600 p-2 w-[10%]">U</th>
                                    <th className="border border-gray-600 p-2 w-[10%]">QTE</th>
                                    <th className="border border-gray-600 p-2 w-[12%]">P.U DH. HT</th>
                                    <th className="border border-gray-600 p-2 w-[13%]">P.T DH HT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(groupedItems) && groupedItems.map((item: any, index: number) => (
                                    <tr key={item.id} className="text-center">
                                        <td className="border border-gray-600 p-2">{index + 1}</td>
                                        <td className="border border-gray-600 p-2 text-left font-medium">
                                            {item.designation}
                                            {item.description && <div className="text-[9px] text-gray-500 font-normal mt-0.5">{item.description}</div>}
                                        </td>
                                        <td className="border border-gray-600 p-2">{item.unit || 'U'}</td>
                                        <td className="border border-gray-600 p-2 font-bold">{item.quantity}</td>
                                        <td className="border border-gray-600 p-2 text-right">{item.unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                                        <td className="border border-gray-600 p-2 text-right font-bold">{item.totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                                {/* Empty rows filler if needed for styling consistency */}
                            </tbody>
                        </table>
                    </div>

                    {/* --- TOTALS & SIGNATURE --- */}
                    <div className="mt-4 flex justify-between items-start text-xs">

                        {/* Signature Box */}
                        <div className="w-[40%]">
                            <div className="mb-2 font-bold underline">URBA EVENTS INTERNATIONAL</div>
                            <div className="h-24 border border-gray-300 rounded-sm p-2 text-gray-400 text-[10px] italic">
                                Signature et cachet du concurrent
                            </div>
                        </div>

                        {/* Totals Table */}
                        <div className="w-[40%]">
                            <table className="w-full border-collapse border border-gray-800 font-bold">
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-600 p-2 bg-gray-50">Total HT</td>
                                        <td className="border border-gray-600 p-2 text-right">{totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-600 p-2 bg-gray-50">Tva 20%</td>
                                        <td className="border border-gray-600 p-2 text-right">{totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr className="text-sm bg-gray-100">
                                        <td className="border border-gray-600 p-2">Total TTC</td>
                                        <td className="border border-gray-600 p-2 text-right">{totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* --- FOOTER --- */}
                    <div className="mt-auto pt-6 text-center text-[9px] text-gray-500 font-medium">
                        <div className="mb-1 font-bold text-[#c2185b] uppercase tracking-wider text-[10px]">
                            URBA EVENTS INTERNATIONAL • COMMUNICATION • EVENEMENTIEL
                        </div>
                        <p>
                            Adresse: Boulevard Allal El Fassi, Complexe Professionnel du Habous, Tranche 2, Imm B. 2eme étage, Appt N° 11 - MARRAKECH
                        </p>
                        <p className="mt-0.5">
                            GSM: 06 61 24 25 91 • FIXE: 05 24 44 91 15 • Email: contact@urbaevents.com • Site web: www.urbaevents.com
                        </p>
                        <p className="mt-0.5 font-mono">
                            RC: 80897 • IF: 20764643 • CNSS: 5442489 • TP: 45301437 • ICE: 001892739000012 • C.B: N° 007 450 0002043000000501 61
                        </p>
                    </div>

                </div>
            </div>

        </div>
    );
}