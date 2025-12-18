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

// Icons
import {
    IconCheck, IconFileText, IconUpload, IconDownload, IconAlertCircle, IconLoader,
    IconChartPie, IconTrendingUp, IconTrendingDown, IconCalculator, IconBuildingBank,
    IconUserShield, IconFileDescription, IconArrowRight,
    IconX
} from "@tabler/icons-react";

// Import du composant "Panier" Production qu'on a créé
import { ProductionManager } from "./production-manager";

import {
    ME_QUERY, GET_PROJECT_MANAGERS, GET_TEAM_MEMBERS, GET_TASKS_BY_PROJECT_QUERY, GET_PROJECTS_FEED,
    UPDATE_PROJECT_MUTATION, UPLOAD_DOCUMENT_MUTATION, SUBMIT_REVIEW_MUTATION,
    ADMIN_ASSIGN_PROJECT_MUTATION, CP_UPLOAD_ESTIMATE_MUTATION, ADMIN_RUN_FEASIBILITY_MUTATION,
    ADMIN_LAUNCH_PROJECT_MUTATION, FINANCE_REQUEST_CAUTION_MUTATION, CP_ASSIGN_TEAM_MUTATION,
    PM_CREATE_TASK_MUTATION, PM_UPDATE_TASK_STATUS_MUTATION, CP_UPLOAD_ASSET_MUTATION,
    GIVE_PROPOSAL_AVIS_MUTATION,
    GET_ALL_USERS
} from "@/lib/graphql/projects";

interface ProductionManagerProps {
    projectId: string;
    initialTeam?: {
        infographisteIds: string[];
        team3DIds: string[];
        coordinatorIds: string[];
        pmJuniorIds: string[];
    };
    onSave?: () => void;
}

// --- HELPER UPLOAD ---
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
            if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
            else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Network Error'));
        xhr.send(formData);
    });
};

const getFileUrl = (filePath: string) => {
    if (!filePath) return "#";

    // Logic: Use localhost:5002 if we are developing locally, otherwise use the production domain
    const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:5002'
        : 'https://backoffice.urbagroupe.ma';

    // Prevent double slashes if filePath already starts with /
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

    return `${baseUrl}/${cleanPath}`;
};

// --- DOCUMENT ROW ---
// --- MULTI-DOCUMENT ROW ---
function DocumentRow({ label, type, existingDocs, file, setFile, progress, isOptional = false }: any) {
    const isSelected = !!file;
    const isUploading = progress > 0 && progress < 100;

    // Filter documents matching this type (e.g., "CPS", "RC")
    // This allows multiple files to be listed under one category
    const relevantDocs = Array.isArray(existingDocs)
        ? existingDocs.filter((d: any) => d.fileName === type || d.originalFileName?.includes(type))
        : [];

    return (
        <div className="flex flex-col gap-2 p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors group relative overflow-hidden">
            {isUploading && <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />}

            {/* Header: Label & Upload Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{label}</span>
                    {isOptional && <Badge variant="outline" className="text-[10px] h-5 px-1.5">Optionnel</Badge>}
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{relevantDocs.length} fichier(s)</Badge>
                </div>

                <div className="relative">
                    <input
                        type="file"
                        id={`upload-${type}`}
                        disabled={isUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                        onChange={(e) => { if (e.target.files && e.target.files[0]) setFile(e.target.files[0]); }}
                    />
                    <Button variant={isSelected ? "default" : "secondary"} size="sm" disabled={isUploading} className="h-7 text-xs">
                        {isUploading ? <IconLoader className="animate-spin h-3 w-3" /> : isSelected ? "Fichier sélectionné" : <><IconUpload size={12} className="mr-1" /> Ajouter</>}
                    </Button>
                </div>
            </div>

            {/* Selected File Preview (Pending Upload) */}
            {isSelected && (
                <div className="text-xs bg-blue-50 text-blue-700 p-2 rounded flex justify-between items-center mt-1">
                    <span>Prêt à envoyer: <strong>{file.name}</strong></span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-blue-100 rounded-full" onClick={(e) => { e.preventDefault(); setFile(null); }}>
                        <IconX size={14} />
                    </Button>
                </div>
            )}

            {/* List of Existing Files */}
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
                <div className="mt-1 text-xs text-muted-foreground italic pl-1">Aucun document disponible.</div>
            )}
        </div>
    );
}

// --- MARGIN CALCULATOR ---
function MarginCalculator({ marketPrice, costPrice }: { marketPrice: number, costPrice: number }) {
    const market = Number(marketPrice) || 0; const cost = Number(costPrice) || 0; const margin = market - cost;
    const marginPercent = market > 0 ? (margin / market) * 100 : 0;
    let colorClass = "bg-red-500"; let textClass = "text-red-600";
    if (marginPercent >= 20) { colorClass = "bg-green-500"; textClass = "text-green-600"; } else if (marginPercent >= 10) { colorClass = "bg-yellow-500"; textClass = "text-yellow-600"; }
    return (
        <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="p-2 bg-primary/10 rounded-md text-primary"><IconCalculator size={18} /></div><span className="text-sm font-semibold">Analyse Financière</span></div><div className={cn("flex items-center gap-1 text-sm font-bold", textClass)}>{marginPercent > 0 ? <IconTrendingUp size={16} /> : <IconTrendingDown size={16} />}{marginPercent.toFixed(1)}%</div></div>
            <div className="grid grid-cols-2 gap-4 py-2"><div><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Marché</span><div className="text-sm font-mono font-medium">{market.toLocaleString('fr-FR')} MAD</div></div><div className="text-right"><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Coût Est.</span><div className="text-sm font-mono font-medium">{cost.toLocaleString('fr-FR')} MAD</div></div></div>
            <div className="space-y-1.5"><div className="flex justify-between text-xs text-muted-foreground"><span>Marge Nette</span><span className={cn("font-bold", textClass)}>{margin.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span></div><div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className={cn("h-full transition-all duration-500 ease-out rounded-full", colorClass)} style={{ width: `${Math.max(0, Math.min(100, marginPercent))}%` }} /></div></div>
        </div>
    );
}



// --- MAIN COMPONENT ---
export function ProjectEditDrawer({ item }: { item: any }) {
    const isMobile = useIsMobile();
    const router = useRouter();
    const { data: meData } = useQuery(ME_QUERY);
    const userRole = meData?.me.role.name;
    const userPermissions = meData?.me.role.permissions || [];

    // Get ALL documents for specific stages
    const administrativeDocs = item.stages?.administrative?.documents || [];
    const technicalDocs = item.stages?.technical?.documents || [];

    // ✅ Check PM Assignment
    const isAssignedPM = item.projectManagers?.some((pm: any) => pm.id === meData?.me?.id);

    // State
    const [fileCPS, setFileCPS] = React.useState<File | null>(null);
    const [fileRC, setFileRC] = React.useState<File | null>(null);
    const [fileAvis, setFileAvis] = React.useState<File | null>(null);
    const [fileBPE, setFileBPE] = React.useState<File | null>(null);
    const [fileTech, setFileTech] = React.useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});

    const [fileEstimate, setFileEstimate] = React.useState<File | null>(null);
    const [fileAsset, setFileAsset] = React.useState<File | null>(null);

    const [adminFormData, setAdminFormData] = React.useState({ status: item.preparationStatus, projectManagerId: item.projectManagers[0]?.id || '' });
    const [feasibilityData, setFeasibilityData] = React.useState({ administrative: item.feasibilityChecks.administrative, technical: item.feasibilityChecks.technical, financial: item.feasibilityChecks.financial });
    const [teamData, setTeamData] = React.useState({ infographisteIds: item.team.infographistes.map((u: any) => u.id), team3DIds: item.team.team3D.map((u: any) => u.id), assistantIds: item.team.coordinators.map((u: any) => u.id) });

    const [formData, setFormData] = React.useState({
        ...item,
        marketEstimate: item.marketEstimate || 0,
        estimatedBudget: item.estimatedBudget || 0
    });

    const [newTaskDesc, setNewTaskDesc] = React.useState("");
    const [newTaskAssignee, setNewTaskAssignee] = React.useState("");
    const [newTaskDept, setNewTaskDept] = React.useState("");
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
    const [createTask, { loading: loadingTaskCreate }] = useMutation(PM_CREATE_TASK_MUTATION, { onCompleted: () => { toast.success("Tâche créée!"); setNewTaskDesc(""); setNewTaskAssignee(""); setNewTaskDept(""); }, onError: (err) => toast.error(err.message), refetchQueries: [{ query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: item.id } }, { query: GET_PROJECTS_FEED }] });
    const [giveProposalAvis, { loading: loadingAvis }] = useMutation(GIVE_PROPOSAL_AVIS_MUTATION, { onCompleted: () => { toast.success("Avis enregistré!"); setAvisData({ status: '', reason: '' }); }, refetchQueries: [{ query: GET_PROJECTS_FEED }] });
    const [updateTaskStatus] = useMutation(PM_UPDATE_TASK_STATUS_MUTATION, { onCompleted: () => toast.success("Status MAJ!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [cpUploadAsset, { loading: loadingAsset }] = useMutation(CP_UPLOAD_ASSET_MUTATION, { onCompleted: () => { toast.success("Asset uploadé!"); setFileAsset(null); }, refetchQueries: [{ query: GET_PROJECTS_FEED }] });

    // Queries
    const { data: allUsersData, loading: loadingUsers } = useQuery(GET_ALL_USERS, { skip: userRole !== 'ADMIN' });
    const { data: pmData, loading: loadingPMs } = useQuery(GET_PROJECT_MANAGERS, { skip: userRole !== 'ADMIN' });
    const { data: teamMembers, loading: loadingTeamMembers } = useQuery(GET_TEAM_MEMBERS, { skip: !(userRole === 'ADMIN' || userPermissions.includes('assign_creative_tasks')) });

    const existingDocs = item.stages?.administrative?.documents || [];
    const getDoc = (type: string) => existingDocs.find((d: any) => d.fileName === type);
    const existingTechDocs = item.stages?.technical?.documents || [];
    const getTechDoc = (type: string) => existingTechDocs.find((d: any) => d.fileName === type);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData({ ...formData, [e.target.id]: e.target.value }); };
    const handleSelectChange = (id: string, value: string) => { setFormData({ ...formData, [id]: value }); };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProject({
            variables: {
                id: item.id,
                input: {
                    title: formData.title,
                    object: formData.object,
                    status: formData.status,
                    marketEstimate: parseFloat(formData.marketEstimate),
                    estimatedBudget: parseFloat(formData.estimatedBudget)
                }
            }
        });
    };

    const handleAvisFormChange = (field: string, value: string) => { setAvisData(prev => ({ ...prev, [field]: value })); };
    const handleSubmitAvis = () => { if (!avisData.status) return toast.error("Décision requise"); giveProposalAvis({ variables: { projectId: item.id, status: avisData.status, reason: avisData.reason || null } }); };
    const handleAdminFormChange = (id: string, value: string) => { setAdminFormData(prev => ({ ...prev, [id]: value })); };
    const handleAdminSubmit = (e: React.FormEvent) => { e.preventDefault(); adminAssignProject({ variables: { input: { projectId: item.id, projectManagerIds: [adminFormData.projectManagerId], status: adminFormData.status } } }); };
    const handleFeasibilityChange = (checkType: string, value: string) => { adminRunFeasibility({ variables: { input: { projectId: item.id, checkType, status: value } } }); setFeasibilityData(prev => ({ ...prev, [checkType]: value })); };
    const handleLaunchProject = () => { adminLaunchProject({ variables: { projectId: item.id } }); };
    const handleRequestCaution = () => { financeRequestCaution({ variables: { projectId: item.id } }); };
    const handleAssignTeam = () => { cpAssignTeam({ variables: { input: { projectId: item.id, ...teamData } } }); };
    const handleSubmitAsset = () => { handleFileUploadAndMutate(fileAsset, cpUploadAsset, 'ASSET', 'technical'); };
    const handleSubmitEstimate = () => { handleFileUploadAndMutate(fileEstimate, cpUploadEstimate, 'CP_ESTIMATE', 'technical'); };

    const handleFileUploadAndMutate = async (file: File | null, mutation: Function, docType: string, stageName?: string) => {
        if (!file) return true;
        setUploadProgress(prev => ({ ...prev, [docType]: 1 }));

        try {
            // 1. Determine the Base URL (Local vs Prod)
            let apiBaseUrl = 'https://backoffice.urbagroupe.ma'; // Default to production

            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                apiBaseUrl = 'http://localhost:5002'; // Use local backend port
            }

            // 2. Construct the full upload endpoint
            const uploadUrl = `${apiBaseUrl}/api/upload/${item.id}`;

            // 3. Perform Upload
            const result = await uploadFileWithProgress(
                file,
                uploadUrl,
                (percent) => { setUploadProgress(prev => ({ ...prev, [docType]: percent })); }
            );

            // 4. Run Mutation
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
            setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
            toast.error(`Erreur upload ${docType}: ${err.message}`);
            return false;
        }
    };

    // Helper to check if AT LEAST ONE document exists
    const hasDocType = (docs: any[], type: string) => {
        return docs.some((d: any) => d.fileName === type || d.originalFileName?.includes(type));
    };

    // Update handleSubmitForReview
    const handleSubmitForReview = async () => {
        const isDraft = item.preparationStatus === 'DRAFT';

        // Check if file is selected OR if it exists in the list
        const hasCPS = fileCPS || hasDocType(existingDocs, 'CPS');
        const hasRC = fileRC || hasDocType(existingDocs, 'RC');
        const hasAvis = fileAvis || hasDocType(existingDocs, 'Avis');

        if (isDraft && (!hasCPS || !hasRC || !hasAvis)) {
            toast.error("Documents requis manquants (CPS, RC, ou Avis).");
            return;
        }
        if (fileCPS) await handleFileUploadAndMutate(fileCPS, uploadDocument, 'CPS', 'administrative');
        if (fileRC) await handleFileUploadAndMutate(fileRC, uploadDocument, 'RC', 'administrative');
        if (fileAvis) await handleFileUploadAndMutate(fileAvis, uploadDocument, 'Avis', 'administrative');
        if (fileBPE) await handleFileUploadAndMutate(fileBPE, uploadDocument, 'BPE', 'administrative');
        if (fileTech) await handleFileUploadAndMutate(fileTech, uploadDocument, 'Fichier Technique', 'technical');
        setFileCPS(null); setFileRC(null); setFileAvis(null); setFileBPE(null); setFileTech(null);
        if (isDraft) submitForReview({ variables: { projectId: item.id } });
        else toast.success("Documents mis à jour.");
    };

    const handleTeamChange = (type: 'infographisteIds' | 'team3DIds' | 'assistantIds', userId: string, isChecked: boolean) => {
        setTeamData(prev => {
            const currentIds = prev[type] || [];
            const newIds = isChecked ? [...currentIds, userId] : currentIds.filter((id: string) => id !== userId);
            return { ...prev, [type]: newIds };
        });
    };

    const handleCreateTask = () => {
        if (!newTaskDesc || !newTaskAssignee || !newTaskDept) { toast.error("Champs requis."); return; }
        createTask({ variables: { input: { projectId: item.id, description: newTaskDesc, assignedToId: newTaskAssignee, department: newTaskDept } } });
    };

    React.useEffect(() => { setFormData({ ...item }); }, [item]);

    const isUploadingFiles = Object.values(uploadProgress).some(p => p > 0 && p < 100);
    const loading = loadingUpdate || loadingUpload || loadingSubmit || loadingAssign || loadingEstimate || loadingFeasibility || loadingLaunch || loadingCaution || loadingTeam || loadingTaskCreate || isUploadingFiles;

    const isDraft = item.preparationStatus === 'DRAFT';
    const isPendingAdminReview = item.preparationStatus === 'TO_CONFIRM';
    const isToPrepare = item.preparationStatus === 'TO_PREPARE';
    const isFeasibilityPending = item.preparationStatus === 'FEASIBILITY_PENDING';
    const isCautionPending = item.preparationStatus === 'CAUTION_PENDING';
    // ✅ STATUS PRODUCTION
    const isInProduction = item.preparationStatus === 'IN_PRODUCTION';

    const renderPanelContent = () => {
        if (userRole === 'PROPOSAL_MANAGER') {
            return (
                <div className="flex flex-col gap-6">
                    <div className={cn("p-3 rounded-md text-sm font-medium flex items-center gap-2 border", isDraft ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-green-50 text-green-700 border-green-200")}>
                        <IconAlertCircle size={20} />{isDraft ? "Dossier en constitution." : "Dossier soumis."}
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Documents Requis</h4>
                        {/* 👇 CHANGE HERE: Pass existingDocs array instead of single getDoc() */}
                        <DocumentRow
                            label="Cahier des Charges (CPS)"
                            type="CPS"
                            existingDocs={administrativeDocs} // Pass full array
                            file={fileCPS}
                            setFile={setFileCPS}
                            progress={uploadProgress['CPS'] || 0}
                        />
                        <DocumentRow
                            label="Règlement Consultation (RC)"
                            type="RC"
                            existingDocs={administrativeDocs}
                            file={fileRC}
                            setFile={setFileRC}
                            progress={uploadProgress['RC'] || 0}
                        />
                        <DocumentRow
                            label="Avis de Marché"
                            type="Avis"
                            existingDocs={administrativeDocs}
                            file={fileAvis}
                            setFile={setFileAvis}
                            progress={uploadProgress['Avis'] || 0}
                        />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Documents Optionnels</h4>
                        <DocumentRow
                            label="Bordereau Prix (BPE)"
                            type="BPE"
                            existingDocs={administrativeDocs}
                            file={fileBPE}
                            setFile={setFileBPE}
                            progress={uploadProgress['BPE'] || 0}
                            isOptional
                        />
                        <DocumentRow
                            label="Dossier Technique"
                            type="Fichier Technique" // Ensure this matches your docType string
                            existingDocs={technicalDocs} // Note: Technical docs come from technical stage
                            file={fileTech}
                            setFile={setFileTech}
                            progress={uploadProgress['Fichier Technique'] || 0}
                            isOptional
                        />
                    </div>
                </div>
            );
        }

        // ✅ VUE ADMIN: Panneau de Validation Professionnel
        if (userRole === 'ADMIN' && isPendingAdminReview) {
            return (
                <form id="admin-assign-form" className="flex flex-col gap-6" onSubmit={handleAdminSubmit}>
                    <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <IconUserShield size={20} />
                            <span>Espace Validation</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-xs text-muted-foreground uppercase">Client</span><p className="font-medium">{item.title}</p></div>
                            <div><span className="text-xs text-muted-foreground uppercase">Date Limite</span><p className="font-medium">{new Date(parseInt(item.submissionDeadline)).toLocaleDateString('fr-FR')}</p></div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Décision Administrative</h4>
                        <div className="flex flex-col gap-3">
                            <Select value={adminFormData.status} onValueChange={(v) => handleAdminFormChange("status", v)}>
                                <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TO_PREPARE">✅ Valider (Passer à Préparer)</SelectItem>
                                    <SelectItem value="NO">❌ Refuser le Projet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assignation Chef de Projet</h4>
                        {loadingUsers ? <Skeleton className="h-10" /> : (
                            <Select
                                value={adminFormData.projectManagerId}
                                onValueChange={(v) => handleAdminFormChange("projectManagerId", v)}
                            >
                                <SelectTrigger className="h-10 bg-background">
                                    <SelectValue placeholder="Sélectionner un responsable..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Chefs de Projet & Directeurs</SelectLabel>
                                        {allUsersData?.users
                                            .filter((u: any) => ['PROJECT_MANAGER', 'DIRECTOR_EVENT', 'ADMIN'].includes(u.role.name))
                                            .map((pm: any) => (
                                                <SelectItem key={pm.id} value={pm.id}>
                                                    {pm.name} <span className="text-muted-foreground text-xs ml-2">({pm.role.name})</span>
                                                </SelectItem>
                                            ))}
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel>Autres Utilisateurs</SelectLabel>
                                        {allUsersData?.users
                                            .filter((u: any) => !['PROJECT_MANAGER', 'DIRECTOR_EVENT', 'ADMIN'].includes(u.role.name))
                                            .map((pm: any) => (
                                                <SelectItem key={pm.id} value={pm.id}>
                                                    {pm.name} <span className="text-muted-foreground text-xs ml-2">({pm.role.name})</span>
                                                </SelectItem>
                                            ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                        <p className="text-[10px] text-muted-foreground">Vous pouvez assigner n'importe quel utilisateur comme responsable principal.</p>
                    </div>
                </form>
            );
        }

        // ✅ MODIFICATION DEMANDEE: Suppression des inputs financiers, Ajout du bouton, Summary
        if ((userPermissions.includes('manage_assigned_projects') || isAssignedPM) && isToPrepare) {
            return (
                <div className="flex flex-col gap-6 w-full">
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm flex items-center gap-2"><IconChartPie size={18} />Préparer l'estimation financière.</div>

                    {/* ✅ 1. BOUTON VERS DETAIL TECHNIQUE & DEVIS */}
                    <Button
                        onClick={() => router.push(`/dashboard/projects/${item.id}/technical`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md py-6"
                    >
                        <IconFileDescription className="w-5 h-5 mr-2" />
                        Accéder au Détail Technique & Devis
                        <IconArrowRight className="w-4 h-4 ml-2 opacity-70" />
                    </Button>

                    {/* ✅ 2. RESUME FINANCIER (READ ONLY) */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Résumé Financier (Live)</h4>
                        <MarginCalculator
                            marketPrice={Number(item.marketEstimate) || 0}
                            costPrice={Number(item.estimatedBudget) || 0}
                        />
                    </div>

                    <Separator />

                    {/* ✅ 3. UPLOAD OPTIONNEL */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fichiers Techniques (Optionnel)</h4>
                        </div>
                        <DocumentRow
                            label="Estimation Excel (CPS)"
                            type="CP_ESTIMATE"
                            existingDoc={getTechDoc('CP_ESTIMATE')}
                            file={fileEstimate}
                            setFile={setFileEstimate}
                            progress={uploadProgress['CP_ESTIMATE'] || 0}
                            isOptional={true}
                        />
                        {/* Instant Upload Button for this file if selected */}
                        {fileEstimate && !uploadProgress['CP_ESTIMATE'] && (
                            <Button
                                size="sm"
                                onClick={handleSubmitEstimate}
                                disabled={loading}
                                className="w-full mt-1 bg-blue-600 hover:bg-blue-700"
                            >
                                {isUploadingFiles ? "Upload..." : "Uploader le fichier maintenant"}
                            </Button>
                        )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Décision</h4>
                        <Select value={avisData.status} onValueChange={(v) => handleAvisFormChange("status", v)}><SelectTrigger><SelectValue placeholder="Sélectionner une décision..." /></SelectTrigger><SelectContent><SelectItem value="ACCEPTED">✅ Valider (Prêt pour Faisabilité)</SelectItem><SelectItem value="NOT_ACCEPTED">❌ Refuser (Non Faisable)</SelectItem></SelectContent></Select>
                        {avisData.status === 'NOT_ACCEPTED' && <Textarea placeholder="Motif..." value={avisData.reason} onChange={(e) => handleAvisFormChange("reason", e.target.value)} />}
                        <Button onClick={handleSubmitAvis} disabled={loadingAvis || !avisData.status} className="w-full bg-green-600 hover:bg-green-700">{loadingAvis ? <IconLoader className="animate-spin" /> : "Confirmer la décision"}</Button>
                    </div>
                </div>
            );
        }

        if (userRole === 'ADMIN' && isFeasibilityPending) {
            return (
                <div className="flex flex-col gap-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><IconChartPie className="h-4 w-4 text-blue-500" />Analyse Financière (Données CP)</h4>
                        <MarginCalculator marketPrice={Number(formData.marketEstimate) || 0} costPrice={Number(formData.estimatedBudget) || 0} />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Documents de Référence</h4>
                        {getTechDoc('CP_ESTIMATE') ? (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><IconFileText size={16} /></div><div className="flex flex-col"><span className="text-sm font-medium">Estimation Détaillée (Excel)</span><span className="text-xs text-muted-foreground">Uploadé par le CP</span></div></div>
                                <Button variant="outline" size="sm" asChild><a href={`https://backoffice.urbagroupe.ma/${getTechDoc('CP_ESTIMATE').fileUrl}`} target="_blank"><IconDownload size={14} className="mr-2" /> Télécharger</a></Button>
                            </div>
                        ) : <div className="p-3 border border-dashed rounded-lg text-center text-sm text-muted-foreground">⚠️ Aucune estimation Excel.</div>}
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Validation des Critères</h4>
                        {['administrative', 'technical', 'financial'].map(type => (
                            <div key={type} className="flex items-center justify-between p-3 border rounded-md bg-card">
                                <div className="flex items-center gap-3"><IconBuildingBank className="text-muted-foreground" size={20} /><Label className="font-medium capitalize">Faisabilité {type}</Label></div>
                                <Select value={(feasibilityData as any)[type]} onValueChange={(v) => handleFeasibilityChange(type, v)}>
                                    <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="PENDING">En cours</SelectItem><SelectItem value="PASS">✅ Valider</SelectItem><SelectItem value="FAIL">❌ Rejeter</SelectItem></SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (userPermissions.includes('manage_cautions') && isCautionPending) return <div className="p-4 border rounded-lg"><h4 className="font-semibold">Demande de Caution</h4><p className="text-muted-foreground text-sm">Veuillez confirmer la demande.</p></div>;

        // ✅ INTEGRATION DU PRODUCTION MANAGER (PANIER)
        if ((userPermissions.includes('assign_creative_tasks') || userRole === 'ADMIN' || isAssignedPM) && isInProduction) {
            return (
                // ✅ LA CORRECTION
                <ProductionManager
                    projectId={item.id}
                    initialTeam={{ // On passe un objet structuré
                        infographisteIds: item.team?.infographistes?.map((u: any) => u.id) || [],
                        team3DIds: item.team?.team3D?.map((u: any) => u.id) || [],
                        coordinatorIds: item.team?.coordinators?.map((u: any) => u.id) || [],
                        pmJuniorIds: item.team?.pmJuniors?.map((u: any) => u.id) || [] // Ajouté si présent dans votre modèle
                    }}
                    onSave={() => {
                        toast.success("Production mise à jour");
                    }}
                />
            );
        }

        if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER') return <form id="update-dossier-form" className="flex flex-col gap-4" onSubmit={handleSubmit}><div className="flex flex-col gap-3"><Label>Nom Projet</Label><Input id="object" value={formData.object} onChange={handleChange} /></div></form>;

        return <p>Accès standard.</p>;
    };

    const renderPanelFooter = () => {
        if (userRole === 'PROPOSAL_MANAGER' && (isDraft || isPendingAdminReview)) {
            const hasMandatory = (fileCPS || getDoc('CPS')) && (fileRC || getDoc('RC')) && (fileAvis || getDoc('Avis'));
            const hasNewUploads = fileCPS || fileRC || fileAvis || fileBPE || fileTech;
            return <Button onClick={handleSubmitForReview} disabled={loading || (!hasNewUploads && !isDraft) || (isDraft && !hasMandatory)} className={cn("w-full transition-all", !isDraft ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700")}>{isUploadingFiles ? "Upload en cours..." : !isDraft ? (hasNewUploads ? "Mettre à jour" : "Sélectionner un fichier") : "Valider et Soumettre"}</Button>;
        }

        if ((userPermissions.includes('manage_assigned_projects') || isAssignedPM) && isToPrepare) {
            // ✅ Clean footer since actions are inside
            return <Button variant="outline" className="w-full">Fermer</Button>;
        }

        if (userRole === 'ADMIN' && isFeasibilityPending) {
            const canLaunch = feasibilityData.administrative === 'PASS' && feasibilityData.technical === 'PASS' && feasibilityData.financial === 'PASS';
            return <Button onClick={handleLaunchProject} disabled={loading || !canLaunch} className="bg-green-600 hover:bg-green-700 w-full">Lancer le Projet</Button>;
        }

        if (userRole === 'ADMIN' && isPendingAdminReview) return <Button form="admin-assign-form" type="submit" disabled={loading} className="w-full">Confirmer l'Assignation</Button>;
        if (userPermissions.includes('manage_cautions') && isCautionPending) return <Button onClick={handleRequestCaution} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full">Confirmer Caution</Button>;

        // ✅ 4. MODIFICATION ICI : BOUTON VERS LA PAGE BRIEF
        if (isInProduction) {
            return (
                <div className="flex flex-col gap-3 w-full">
                    {/* Le Bouton Principal qui redirige vers la nouvelle page */}
                    <Button
                        onClick={() => router.push(`/dashboard/projects/${item.id}/brief`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 shadow-md"
                    >
                        <IconFileDescription className="w-5 h-5 mr-2" />
                        Accéder au Brief & Détails
                        <IconArrowRight className="w-4 h-4 ml-2 opacity-70" />
                    </Button>

                    <Button variant="outline" className="w-full">Fermer</Button>
                </div>
            );
        }
        if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER') return <Button form="update-dossier-form" type="submit" disabled={loading} className="w-full">Sauvegarder</Button>;
        return <Button variant="outline" className="w-full">Fermer</Button>;
    };

    return (
        <Drawer direction={isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild><Button variant="link" className="text-foreground px-0 text-left h-auto block"><span className="block truncate max-w-[200px] md:max-w-[350px]" title={item.object}>{item.object}</span></Button></DrawerTrigger>
            <DrawerContent className={cn("p-4", "width-[40em]", isMobile ? "h-[90vh]" : "sm:max-w-2xl")}>
                <DrawerHeader className="gap-1 px-0 pt-0"><DrawerTitle>{item.object}</DrawerTitle><DrawerDescription>Gestion des documents.</DrawerDescription></DrawerHeader>
                <div className="flex-grow overflow-y-auto pr-2 -mr-4 py-4">{renderPanelContent()}</div>
                <DrawerFooter className="px-0 pb-0">{renderPanelFooter()}<DrawerClose asChild><Button variant="ghost" className="mt-2" disabled={loading}>Annuler</Button></DrawerClose></DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}