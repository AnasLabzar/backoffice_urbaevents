"use client";

import * as React from "react";
import { useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AIAssistantButton } from "@/components/projects/ai-assistant-button";

// Icons
import {
    IconCheck, IconFileText, IconUpload, IconDownload, IconAlertCircle, IconLoader,
    IconChartPie, IconTrendingUp, IconTrendingDown, IconCalculator, IconBuildingBank,
    IconUserShield, IconFileDescription, IconArrowRight,
    IconX, IconPlus, IconTrash, IconFileSpreadsheet, IconSparkles
} from "@tabler/icons-react";


import {
    ME_QUERY, GET_PROJECT_MANAGERS, GET_TEAM_MEMBERS, GET_TASKS_BY_PROJECT_QUERY, GET_PROJECTS_FEED,
    UPDATE_PROJECT_MUTATION, UPLOAD_DOCUMENT_MUTATION, SUBMIT_REVIEW_MUTATION,
    ADMIN_ASSIGN_PROJECT_MUTATION, CP_UPLOAD_ESTIMATE_MUTATION, ADMIN_RUN_FEASIBILITY_MUTATION,
    ADMIN_LAUNCH_PROJECT_MUTATION, FINANCE_REQUEST_CAUTION_MUTATION, CP_ASSIGN_TEAM_MUTATION,
    PM_CREATE_TASK_MUTATION, PM_UPDATE_TASK_STATUS_MUTATION, CP_UPLOAD_ASSET_MUTATION,
    GIVE_PROPOSAL_AVIS_MUTATION,
    GET_ALL_USERS,
    GET_ESTIMATION
} from "@/lib/graphql/projects";
import { ProductionManager } from "./production-manager";

// --- HELPERS ---

const uploadFileWithProgress = (file: File, url: string, onProgress: (percent: number) => void): Promise<any> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);

        xhr.open('POST', url, true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (e) {
                    reject(new Error("Erreur de parsing réponse serveur"));
                }
            } else {
                reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network Error'));
        xhr.send(formData);
    });
};

const getFileUrl = (filePath: string) => {
    if (!filePath) return "#";
    const baseUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5002'
        : 'https://backoffice.urbagroupe.ma';

    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    if (filePath.startsWith('http')) return filePath;
    return `${baseUrl}/${cleanPath}`;
};

// --- MULTI-DOCUMENT ROW ---
function DocumentRow({ label, type, existingDocs, files, setFiles, progress, isOptional = false, maxFiles = 10 }: any) {
    const isUploading = progress > 0 && progress < 100;

    const relevantDocs = Array.isArray(existingDocs)
        ? existingDocs.filter((d: any) => d.fileName === type || d.originalFileName?.includes(type))
        : [];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            if (files.length + newFiles.length > maxFiles) {
                toast.error(`Maximum ${maxFiles} fichiers autorisés.`);
                return;
            }
            if (typeof setFiles === 'function') {
                setFiles((prev: File[]) => {
                    const safePrev = Array.isArray(prev) ? prev : [];
                    return [...safePrev, ...newFiles];
                });
            }
        }
        e.target.value = '';
    };

    const removePendingFile = (indexToRemove: number) => {
        setFiles((prev: File[]) => prev.filter((_, i) => i !== indexToRemove));
    };

    return (
        <div className="flex flex-col gap-2 p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors group relative overflow-hidden">
            {isUploading && <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />}

            <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{label}</span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {relevantDocs.length} en ligne
                    </Badge>
                </div>

                <div className="relative">
                    <Button variant={files.length > 0 ? "default" : "secondary"} size="sm" className="h-7 text-xs relative pointer-events-none">
                        {isUploading ? <IconLoader className="animate-spin h-3 w-3" /> : <><IconPlus size={12} className="mr-1" /> Ajouter</>}
                    </Button>
                    <input
                        type="file"
                        id={`upload-${type}`}
                        disabled={isUploading}
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 disabled:cursor-not-allowed"
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            {files.length > 0 && (
                <div className="mt-2 space-y-1 bg-blue-50/50 p-2 rounded border border-blue-100">
                    <p className="text-[10px] font-semibold text-blue-700 mb-1">En attente d'envoi ({files.length}) :</p>
                    {files.map((file: File, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-blue-800 bg-white/60 p-1.5 rounded">
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <button
                                onClick={() => removePendingFile(idx)}
                                className="text-red-500 hover:bg-red-100 p-0.5 rounded transition-colors"
                            >
                                <IconX size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {relevantDocs.length > 0 ? (
                <div className="mt-2 space-y-1">
                    {relevantDocs.map((doc: any, index: number) => (
                        <div key={doc.id || index} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded border border-transparent hover:border-border transition-colors">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <IconFileText size={14} className="text-muted-foreground flex-shrink-0" />
                                <span className="truncate max-w-[200px]" title={doc.originalFileName}>{doc.originalFileName || "Document sans nom"}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</span>
                            </div>
                            <a href={getFileUrl(doc.fileUrl)} target="_blank" className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1 rounded transition-colors" title="Télécharger">
                                <IconDownload size={14} />
                            </a>
                        </div>
                    ))}
                </div>
            ) : (
                files.length === 0 && <div className="mt-1 text-xs text-muted-foreground italic pl-1">Aucun document.</div>
            )}
        </div>
    );
}

// Updated MarginCalculator Component to support inputs
function MarginCalculator({
    marketPrice,
    costPrice,
    onMarketPriceChange,
    onTargetMarginChange
}: {
    marketPrice: number,
    costPrice: number,
    onMarketPriceChange?: (val: number) => void,
    onTargetMarginChange?: (val: number) => void
}) {
    const market = Number(marketPrice) || 0;
    const cost = Number(costPrice) || 0;
    const margin = market - cost;
    const marginPercent = market > 0 ? (margin / market) * 100 : 0;

    const [targetMargin, setTargetMargin] = React.useState(0);

    React.useEffect(() => {
        if (market > 0) {
            setTargetMargin(parseFloat(((market - cost) / market * 100).toFixed(2)));
        }
    }, [market, cost]);

    const handleMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMargin = parseFloat(e.target.value) || 0;
        setTargetMargin(newMargin);
        if (onTargetMarginChange) onTargetMarginChange(newMargin);
    };

    let colorClass = "bg-red-500"; let textClass = "text-red-600";
    if (marginPercent >= 20) { colorClass = "bg-green-500"; textClass = "text-green-600"; }
    else if (marginPercent >= 10) { colorClass = "bg-yellow-500"; textClass = "text-yellow-600"; }

    return (
        <div className="p-4 rounded-lg bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-md text-primary"><IconCalculator size={18} /></div>
                    <span className="text-sm font-semibold">Analyse Financière</span>
                </div>
                <div className={cn("flex items-center gap-1 text-sm font-bold", textClass)}>
                    {marginPercent > 0 ? <IconTrendingUp size={16} /> : <IconTrendingDown size={16} />}
                    {marginPercent.toFixed(1)}%
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2">
                <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Marché (Vente)</Label>
                    {onMarketPriceChange ? (
                        <div className="relative">
                            <Input
                                type="number"
                                value={market}
                                onChange={(e) => onMarketPriceChange(parseFloat(e.target.value))}
                                className="h-8 text-sm font-mono mt-1"
                            />
                            <span className="absolute right-2 top-2 text-xs text-muted-foreground">DH</span>
                        </div>
                    ) : (
                        <div className="text-sm font-mono font-medium mt-1">{market.toLocaleString('fr-FR')} MAD</div>
                    )}
                </div>
                <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Marge Cible (%)</Label>
                    {onTargetMarginChange ? (
                        <div className="relative">
                            <Input
                                type="number"
                                value={targetMargin}
                                onChange={handleMarginChange}
                                className="h-8 text-sm font-mono mt-1"
                            />
                            <span className="absolute right-2 top-2 text-xs text-muted-foreground">%</span>
                        </div>
                    ) : (
                        <div className="text-sm font-mono font-medium text-right mt-1">{marginPercent.toFixed(1)}%</div>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                <span className="text-xs font-semibold">Budget Cible (Interne)</span>
                <span className="text-sm font-mono font-bold">
                    {(market * (1 - (targetMargin / 100))).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD
                </span>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Coût Réel (Technique)</span>
                    <span className={cn("font-bold", cost > (market * (1 - (targetMargin / 100))) ? "text-red-500" : "text-foreground")}>
                        {cost.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                    </span>
                </div>
            </div>
        </div>
    );
}

// --- MAIN COMPONENT ---
export function ProjectEditDrawer({ item }: { item: any }) {
    const router = useRouter();
    const isMobile = useIsMobile();
    const { data: meData } = useQuery(ME_QUERY);
    const userRole = meData?.me.role.name;
    const userPermissions = meData?.me.role.permissions || [];

    const administrativeDocs = item.stages?.administrative?.documents || [];
    const technicalDocs = item.stages?.technical?.documents || [];
    const isAssignedPM = item.projectManagers?.some((pm: any) => pm.id === meData?.me?.id);

    // States
    const [filesCPS, setFilesCPS] = React.useState<File[]>([]);
    const [filesRC, setFilesRC] = React.useState<File[]>([]);
    const [filesAvis, setFilesAvis] = React.useState<File[]>([]);
    const [filesBPE, setFilesBPE] = React.useState<File[]>([]);
    const [filesTech, setFilesTech] = React.useState<File[]>([]);

    const [fileEstimate, setFileEstimate] = React.useState<File | null>(null);
    const [fileAsset, setFileAsset] = React.useState<File | null>(null);

    const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});

    const [adminFormData, setAdminFormData] = React.useState({ status: item.preparationStatus, projectManagerId: item.projectManagers[0]?.id || '' });
    const [feasibilityData, setFeasibilityData] = React.useState({ administrative: item.feasibilityChecks.administrative, technical: item.feasibilityChecks.technical, financial: item.feasibilityChecks.financial });
    const [teamData, setTeamData] = React.useState({ infographisteIds: item.team.infographistes.map((u: any) => u.id), team3DIds: item.team.team3D.map((u: any) => u.id), assistantIds: item.team.coordinators.map((u: any) => u.id) });

    const [formData, setFormData] = React.useState({
        title: item.title || "",
        object: item.object || "",
        marketEstimate: item.marketEstimate || "",
        estimatedBudget: item.estimatedBudget || "",
    });

    const [avisData, setAvisData] = React.useState({ status: '', reason: '' });

    // Mutations
    const [updateProject, { loading: loadingUpdate }] = useMutation(UPDATE_PROJECT_MUTATION, { onCompleted: () => toast.success("Projet mis à jour!"), onError: (err) => toast.error(err.message), refetchQueries: [GET_PROJECTS_FEED] });
    const [uploadDocument, { loading: loadingUpload }] = useMutation(UPLOAD_DOCUMENT_MUTATION);
    const [submitForReview, { loading: loadingSubmit }] = useMutation(SUBMIT_REVIEW_MUTATION, { onCompleted: () => toast.success("Projet soumis avec succès!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [adminAssignProject, { loading: loadingAssign }] = useMutation(ADMIN_ASSIGN_PROJECT_MUTATION, { onCompleted: () => toast.success("Projet assigné!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [cpUploadEstimate, { loading: loadingEstimate }] = useMutation(CP_UPLOAD_ESTIMATE_MUTATION, { onCompleted: () => toast.success("Estimation uploadée!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [adminRunFeasibility, { loading: loadingFeasibility }] = useMutation(ADMIN_RUN_FEASIBILITY_MUTATION, { onCompleted: () => toast.info("Faisabilité mise à jour."), refetchQueries: [GET_PROJECTS_FEED] });
    const [adminLaunchProject, { loading: loadingLaunch }] = useMutation(ADMIN_LAUNCH_PROJECT_MUTATION, { onCompleted: () => toast.success("Projet lancé!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [financeRequestCaution, { loading: loadingCaution }] = useMutation(FINANCE_REQUEST_CAUTION_MUTATION, { onCompleted: () => toast.success("Caution demandée!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [cpAssignTeam, { loading: loadingTeam }] = useMutation(CP_ASSIGN_TEAM_MUTATION, { onCompleted: () => toast.success("Équipe assignée!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [giveProposalAvis, { loading: loadingAvis }] = useMutation(GIVE_PROPOSAL_AVIS_MUTATION, { onCompleted: () => { toast.success("Avis enregistré!"); setAvisData({ status: '', reason: '' }); }, refetchQueries: [{ query: GET_PROJECTS_FEED }] });
    const [cpUploadAsset, { loading: loadingAsset }] = useMutation(CP_UPLOAD_ASSET_MUTATION, { onCompleted: () => { toast.success("Asset uploadé!"); setFileAsset(null); }, refetchQueries: [{ query: GET_PROJECTS_FEED }] });

    const { data: allUsersData, loading: loadingUsers } = useQuery(GET_ALL_USERS, { skip: userRole !== 'ADMIN' });

    const existingDocs = item.stages?.administrative?.documents || [];
    const existingTechDocs = item.stages?.technical?.documents || [];

    const getTechDoc = (type: string) => {
        return existingTechDocs.find((d: any) => d.fileName === type || d.originalFileName?.includes(type));
    };

    // --- FINANCIAL DATA FETCHING ---
    const { data: estimationData } = useQuery(GET_ESTIMATION, {
        variables: { projectId: item.id },
        fetchPolicy: "cache-and-network",
        pollInterval: 3000
    });

    const realCostPrice = estimationData?.getProjectEstimation?.totalAmount || item.estimatedBudget || 0;

    // --- HANDLERS FOR MARGIN CALCULATOR ---
    const handleMarketPriceChange = (val: number) => {
        setFormData((prev: any) => ({ ...prev, marketEstimate: val }));
    };

    const handleTargetMarginChange = (marginPercent: number) => {
        const market = Number(formData.marketEstimate) || 0;
        const newEstimatedBudget = market * (1 - (marginPercent / 100));
        setFormData((prev: any) => ({ ...prev, estimatedBudget: newEstimatedBudget }));
    };

    const handleAvisFormChange = (field: string, value: string) => { setAvisData(prev => ({ ...prev, [field]: value })); };
    const handleSubmitAvis = () => { if (!avisData.status) return toast.error("Décision requise"); giveProposalAvis({ variables: { projectId: item.id, status: avisData.status, reason: avisData.reason || null } }); };
    const handleAdminFormChange = (id: string, value: string) => { setAdminFormData(prev => ({ ...prev, [id]: value })); };
    const handleAdminSubmit = (e: React.FormEvent) => { e.preventDefault(); adminAssignProject({ variables: { input: { projectId: item.id, projectManagerIds: [adminFormData.projectManagerId], status: adminFormData.status } } }); };
    const handleFeasibilityChange = (checkType: string, value: string) => { adminRunFeasibility({ variables: { input: { projectId: item.id, checkType, status: value } } }); setFeasibilityData(prev => ({ ...prev, [checkType]: value })); };
    const handleLaunchProject = () => { adminLaunchProject({ variables: { projectId: item.id } }); };
    const handleRequestCaution = () => { financeRequestCaution({ variables: { projectId: item.id } }); };
    const handleAssignTeam = () => { cpAssignTeam({ variables: { input: { projectId: item.id, ...teamData } } }); };

    // UPLOAD LOGIC
    const handleFileUploadAndMutate = async (file: File | null, mutation: Function, docType: string, stageName?: string) => {
        if (!file) return true;
        setUploadProgress(prev => ({ ...prev, [docType]: 1 }));

        try {
            let apiBaseUrl = 'https://backoffice.urbagroupe.ma';
            if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                apiBaseUrl = 'http://localhost:5002';
            }

            const uploadUrl = `${apiBaseUrl}/api/upload/${item.id}`;

            const result = await uploadFileWithProgress(
                file,
                uploadUrl,
                (percent) => { setUploadProgress(prev => ({ ...prev, [docType]: percent })); }
            );

            await mutation({
                variables: {
                    projectId: item.id,
                    stageName,
                    docType,
                    originalFileName: file.name,
                    fileUrl: result.fileUrl
                }
            });

            setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
            return true;

        } catch (err: any) {
            console.error(`Upload error for ${docType}:`, err);
            setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
            toast.error(`Erreur upload ${docType}: ${err.message}`);
            return false;
        }
    };

    const hasDocType = (docs: any[], type: string) => {
        return docs.some((d: any) => d.fileName === type || d.originalFileName?.includes(type));
    };

    const handleBulkUpload = async (files: File[], docType: string, stageName: string) => {
        if (files.length === 0) return true;
        let successCount = 0;
        for (const file of files) {
            const success = await handleFileUploadAndMutate(file, uploadDocument, docType, stageName);
            if (success) successCount++;
        }
        return successCount === files.length;
    };

    const handleSubmitForReview = async () => {
        const isDraft = item.preparationStatus === 'DRAFT';
        const hasCPS = filesCPS.length > 0 || hasDocType(existingDocs, 'CPS');
        const hasRC = filesRC.length > 0 || hasDocType(existingDocs, 'RC');
        const hasAvis = filesAvis.length > 0 || hasDocType(existingDocs, 'Avis');

        if (isDraft && (!hasCPS || !hasRC || !hasAvis)) {
            toast.error("Documents requis manquants (CPS, RC, ou Avis).");
            return;
        }

        toast.info("Envoi des fichiers en cours...");
        await handleBulkUpload(filesCPS, 'CPS', 'administrative');
        await handleBulkUpload(filesRC, 'RC', 'administrative');
        await handleBulkUpload(filesAvis, 'Avis', 'administrative');
        await handleBulkUpload(filesBPE, 'BPE', 'administrative');
        await handleBulkUpload(filesTech, 'Fichier Technique', 'technical');

        setFilesCPS([]); setFilesRC([]); setFilesAvis([]); setFilesBPE([]); setFilesTech([]);

        if (isDraft) submitForReview({ variables: { projectId: item.id } });
        else toast.success("Documents mis à jour.");
    };

    const handleSubmitEstimate = () => { handleFileUploadAndMutate(fileEstimate, cpUploadEstimate, 'CP_ESTIMATE', 'technical'); };

    React.useEffect(() => { setFormData({ ...item }); }, [item]);

    const isUploadingFiles = Object.values(uploadProgress).some(p => p > 0 && p < 100);
    const loading = loadingUpdate || loadingUpload || loadingSubmit || loadingAssign || loadingEstimate || loadingFeasibility || loadingLaunch || loadingCaution || loadingTeam || isUploadingFiles;

    const isDraft = item.preparationStatus === 'DRAFT';
    const isPendingAdminReview = item.preparationStatus === 'TO_CONFIRM';
    const isToPrepare = item.preparationStatus === 'TO_PREPARE';
    const isFeasibilityPending = item.preparationStatus === 'FEASIBILITY_PENDING';
    const isCautionPending = item.preparationStatus === 'CAUTION_PENDING';
    const isInProduction = item.preparationStatus === 'IN_PRODUCTION';

    const renderPanelContent = () => {
        if (userRole === 'PROPOSAL_MANAGER' || (userRole === 'ADMIN' && isDraft)) {
            return (
                <div className="flex flex-col gap-6">
                    <div className={cn("p-3 rounded-md text-sm font-medium flex items-center gap-2 border", isDraft ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-green-50 text-green-700 border-green-200")}>
                        <IconAlertCircle size={20} />{isDraft ? "Dossier en constitution." : "Dossier soumis."}
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Documents Requis</h4>
                            <div className="flex gap-2">
                                <AIAssistantButton 
                                    projectId={item.id} 
                                    documents={administrativeDocs.length > 0 ? administrativeDocs : existingDocs} 
                                />
                            </div>
                        </div>
                        <DocumentRow label="Cahier des Charges (CPS)" type="CPS" existingDocs={administrativeDocs} files={filesCPS} setFiles={setFilesCPS} progress={uploadProgress['CPS'] || 0} />
                        <DocumentRow label="Règlement Consultation (RC)" type="RC" existingDocs={administrativeDocs} files={filesRC} setFiles={setFilesRC} progress={uploadProgress['RC'] || 0} />
                        <DocumentRow label="Avis de Marché" type="Avis" existingDocs={administrativeDocs} files={filesAvis} setFiles={setFilesAvis} progress={uploadProgress['Avis'] || 0} />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Documents Optionnels</h4>
                        <DocumentRow label="Bordereau Prix (BPE)" type="BPE" existingDocs={administrativeDocs} files={filesBPE} setFiles={setFilesBPE} progress={uploadProgress['BPE'] || 0} isOptional />
                        <DocumentRow label="Dossier Technique" type="Fichier Technique" existingDocs={technicalDocs} files={filesTech} setFiles={setFilesTech} progress={uploadProgress['Fichier Technique'] || 0} isOptional />
                    </div>
                </div>
            );
        }

        if (userRole === 'ADMIN' && isPendingAdminReview) {
            return (
                <form id="admin-assign-form" className="flex flex-col gap-6" onSubmit={handleAdminSubmit}>
                    <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <IconUserShield size={20} /><span>Espace Validation</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-xs text-muted-foreground uppercase">Client</span><p className="font-medium">{item.title}</p></div>
                            <div><span className="text-xs text-muted-foreground uppercase">Date Limite</span><p className="font-medium">{new Date(parseInt(item.submissionDeadline)).toLocaleDateString('fr-FR')}</p></div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Décision Administrative</h4>
                        <Select value={adminFormData.status} onValueChange={(v) => handleAdminFormChange("status", v)}>
                            <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="TO_PREPARE">✅ Valider (Passer à Préparer)</SelectItem><SelectItem value="NO">❌ Refuser le Projet</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assignation Chef de Projet</h4>
                        {loadingUsers ? <Skeleton className="h-10" /> : (
                            <Select value={adminFormData.projectManagerId} onValueChange={(v) => handleAdminFormChange("projectManagerId", v)}>
                                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Sélectionner un responsable..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup><SelectLabel>Chefs de Projet</SelectLabel>
                                        {allUsersData?.users.filter((u: any) => ['PROJECT_MANAGER', 'DIRECTOR_EVENT', 'ADMIN'].includes(u.role.name)).map((pm: any) => (<SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>))}</SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </form>
            );
        }

        if ((userPermissions.includes('manage_assigned_projects') || isAssignedPM) && isToPrepare) {
            return (
                <div className="flex flex-col gap-6 w-full">
                    <div className="bg-blue-50/50 border border-blue-100 text-blue-900 p-4 rounded-lg flex gap-3 items-start dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                        <div className="p-2 bg-blue-100 rounded-full shrink-0 dark:bg-blue-800"><IconChartPie size={20} className="text-blue-700 dark:text-blue-300" /></div>
                        <div>
                            <h4 className="font-semibold text-sm">Phase de Préparation</h4>
                            <p className="text-xs mt-1 opacity-90">Préparez l'estimation financière détaillée et validez la faisabilité.</p>
                        </div>
                    </div>

                    <Button onClick={() => router.push(`/dashboard/projects/${item.id}/technical`)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm py-6 transition-all hover:scale-[1.01]">
                        <IconFileDescription className="w-5 h-5 mr-2" />Accéder au Détail Technique & Devis
                    </Button>

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Calcul Financier (Live)</h4>
                        <MarginCalculator
                            marketPrice={Number(formData.marketEstimate) || 0}
                            costPrice={realCostPrice}
                            onMarketPriceChange={handleMarketPriceChange}
                            onTargetMarginChange={handleTargetMarginChange}
                        />
                    </div>

                    <div className="bg-card border rounded-lg p-4 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <div className="bg-green-100 text-green-700 p-1.5 rounded dark:bg-green-900/30 dark:text-green-400">
                                <IconFileSpreadsheet size={18} />
                            </div>
                            <h4 className="font-semibold text-sm">Estimation & Budget</h4>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-md space-y-3">
                            <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Document Technique (Excel)</Label>
                            <DocumentRow
                                label="Fichier Excel"
                                type="CP_ESTIMATE"
                                existingDocs={technicalDocs}
                                files={fileEstimate ? [fileEstimate] : []}
                                setFiles={(action: any) => {
                                    const currentFiles = fileEstimate ? [fileEstimate] : [];
                                    let nextFiles: File[] = [];
                                    if (typeof action === 'function') nextFiles = action(currentFiles);
                                    else if (Array.isArray(action)) nextFiles = action;
                                    setFileEstimate(nextFiles.length > 0 ? nextFiles[0] : null);
                                }}
                                progress={uploadProgress['CP_ESTIMATE'] || 0}
                                isOptional={true}
                                maxFiles={1}
                            />
                            {fileEstimate && !uploadProgress['CP_ESTIMATE'] && (
                                <Button size="sm" onClick={handleSubmitEstimate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 transition-colors">
                                    <IconUpload className="w-4 h-4 mr-2" />
                                    {isUploadingFiles ? "Envoi en cours..." : "Confirmer l'upload"}
                                </Button>
                            )}
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Décision Chef de Projet</h4>
                        <Select value={avisData.status} onValueChange={(v) => handleAvisFormChange("status", v)}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner une décision..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ACCEPTED" className="text-green-700 font-medium dark:text-green-400">✅ Valider (Prêt pour Faisabilité)</SelectItem>
                                <SelectItem value="NOT_ACCEPTED" className="text-red-700 font-medium dark:text-red-400">❌ Refuser (Non Faisable)</SelectItem>
                            </SelectContent>
                        </Select>

                        {avisData.status === 'NOT_ACCEPTED' && (
                            <Textarea
                                placeholder="Motif du refus..."
                                className="resize-none"
                                value={avisData.reason}
                                onChange={(e) => handleAvisFormChange("reason", e.target.value)}
                            />
                        )}

                        <Button
                            onClick={handleSubmitAvis}
                            disabled={loadingAvis || !avisData.status}
                            className={cn("w-full transition-colors", avisData.status === 'NOT_ACCEPTED' ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700")}
                        >
                            {loadingAvis ? <IconLoader className="animate-spin mr-2" /> : <IconCheck className="mr-2 w-4 h-4" />}
                            Confirmer la décision
                        </Button>
                    </div>
                </div>
            );
        }

        if (userRole === 'ADMIN' && isFeasibilityPending) {
            const estimateDoc = getTechDoc('CP_ESTIMATE');

            return (
                <div className="flex flex-col gap-6">
                    <div className="rounded-lg border bg-card p-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">Analyse Financière</h4>
                        <MarginCalculator
                            marketPrice={Number(formData.marketEstimate) || 0}
                            costPrice={realCostPrice}
                            onMarketPriceChange={handleMarketPriceChange}
                            onTargetMarginChange={handleTargetMarginChange}
                        />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Documents de Référence</h4>
                        {estimateDoc ? (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 border-green-100 dark:bg-green-900/20 dark:border-green-800">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center dark:bg-green-900 dark:text-green-400"><IconFileSpreadsheet size={16} /></div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium text-green-900 dark:text-green-300">Estimation Détaillée (Excel)</span>
                                        <span className="text-xs text-green-700 dark:text-green-400 truncate max-w-[150px]" title={estimateDoc.originalFileName}>{estimateDoc.originalFileName}</span>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="h-8 bg-white border-green-200 text-green-700 hover:bg-green-100 dark:bg-transparent dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/50" asChild>
                                    <a href={getFileUrl(estimateDoc.fileUrl)} target="_blank" download>
                                        <IconDownload size={14} className="mr-2" /> Télécharger
                                    </a>
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground bg-muted/20">
                                ⚠️ Aucune estimation Excel n'a été uploadée par le CP.
                            </div>
                        )}
                    </div>
                    <Separator />

                    <div className="space-y-4"><h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Validation des Critères</h4>{['administrative', 'technical', 'financial'].map(type => (<div key={type} className="flex items-center justify-between p-3 border rounded-md bg-card"><div className="flex items-center gap-3"><IconBuildingBank className="text-muted-foreground" size={20} /><Label className="font-medium capitalize">Faisabilité {type}</Label></div><Select value={(feasibilityData as any)[type]} onValueChange={(v) => handleFeasibilityChange(type, v)}><SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING">En cours</SelectItem><SelectItem value="PASS">✅ Valider</SelectItem><SelectItem value="FAIL">❌ Rejeter</SelectItem></SelectContent></Select></div>))}</div>
                </div>
            );
        }

        if (isInProduction) return <ProductionManager projectId={item.id} initialTeam={{ infographisteIds: item.team?.infographistes?.map((u: any) => u.id) || [], team3DIds: item.team?.team3D?.map((u: any) => u.id) || [], coordinatorIds: item.team?.coordinators?.map((u: any) => u.id) || [], pmJuniorIds: item.team?.pmJuniors?.map((u: any) => u.id) || [] }} onSave={() => toast.success("Production mise à jour")} />;

        return <p>Accès standard.</p>;
    };

    const renderPanelFooter = () => {
        if ((userRole === 'PROPOSAL_MANAGER' || (userRole === 'ADMIN' && isDraft)) && (isDraft || isPendingAdminReview)) {
            const hasNewUploads = filesCPS.length > 0 || filesRC.length > 0 || filesAvis.length > 0 || filesBPE.length > 0 || filesTech.length > 0;
            return <Button onClick={handleSubmitForReview} disabled={loading} className={cn("w-full transition-all", !isDraft ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700")}>{isUploadingFiles ? "Upload en cours..." : !isDraft ? (hasNewUploads ? "Mettre à jour" : "Sélectionner un fichier") : "Valider et Soumettre"}</Button>;
        }
        if (userRole === 'ADMIN' && isFeasibilityPending) {
            const canLaunch = feasibilityData.administrative === 'PASS' && feasibilityData.technical === 'PASS' && feasibilityData.financial === 'PASS';
            return <Button onClick={handleLaunchProject} disabled={loading || !canLaunch} className="bg-green-600 hover:bg-green-700 w-full">Lancer le Projet</Button>;
        }
        if (userRole === 'ADMIN' && isPendingAdminReview) return <Button form="admin-assign-form" type="submit" disabled={loading} className="w-full">Confirmer l'Assignation</Button>;
        if (userPermissions.includes('manage_cautions') && isCautionPending) return <Button onClick={handleRequestCaution} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full">Confirmer Caution</Button>;
        return <Button variant="outline" className="w-full">Fermer</Button>;
    };

    return (
        <Drawer direction={isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild><Button variant="link" className="text-foreground px-0 text-left h-auto block"><span className="block truncate max-w-[200px] md:max-w-[350px]" title={item.object}>{item.object}</span></Button></DrawerTrigger>
            <DrawerContent className={cn("p-4", "width-[40em]", isMobile ? "h-[90vh]" : "sm:max-w-2xl")}>
                <DrawerHeader className="gap-1 px-0 pt-0"><DrawerTitle className="truncate pr-4" title={item.object}>{item.object}</DrawerTitle><DrawerDescription>Gestion des documents.</DrawerDescription></DrawerHeader>
                <div className="flex-grow overflow-y-auto pr-2 -mr-4 py-4">{renderPanelContent()}</div>
                <DrawerFooter className="px-0 pb-0">{renderPanelFooter()}<DrawerClose asChild><Button variant="ghost" className="mt-2" disabled={loading}>Annuler</Button></DrawerClose></DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}