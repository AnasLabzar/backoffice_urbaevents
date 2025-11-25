"use client";

import * as React from "react";
import { useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/ui/file-upload";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
// Icons
import {
    IconCheck, IconFileText, IconUpload, IconDownload, IconAlertCircle, IconLoader,
    IconChartPie, IconTrendingUp, IconTrendingDown, IconCalculator, IconBuildingBank, IconTools, IconFiles,
    IconUserShield, IconCalendar, IconBuilding
} from "@tabler/icons-react";

import { MultiSelectPopover } from "../team-selector";
import {
    ME_QUERY, GET_PROJECT_MANAGERS, GET_TEAM_MEMBERS, GET_TASKS_BY_PROJECT_QUERY, GET_PROJECTS_FEED,
    UPDATE_PROJECT_MUTATION, UPLOAD_DOCUMENT_MUTATION, SUBMIT_REVIEW_MUTATION,
    ADMIN_ASSIGN_PROJECT_MUTATION, CP_UPLOAD_ESTIMATE_MUTATION, ADMIN_RUN_FEASIBILITY_MUTATION,
    ADMIN_LAUNCH_PROJECT_MUTATION, FINANCE_REQUEST_CAUTION_MUTATION, CP_ASSIGN_TEAM_MUTATION,
    PM_CREATE_TASK_MUTATION, PM_UPDATE_TASK_STATUS_MUTATION, CP_UPLOAD_ASSET_MUTATION,
    GIVE_PROPOSAL_AVIS_MUTATION,
    GET_ALL_USERS // <--- N'OUBLIE PAS D'IMPORTER ÇA
} from "@/lib/graphql/projects";

// ... (Garder uploadFileWithProgress et DocumentRow et MarginCalculator inchangés ...)
// Je remets juste DocumentRow et MarginCalculator pour la complétude, mais si tu les as déjà, tu peux garder les tiens.

const uploadFileWithProgress = (file: File, url: string, onProgress: (percent: number) => void): Promise<any> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        xhr.open('POST', url, true);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) { const percentComplete = (e.loaded / e.total) * 100; onProgress(percentComplete); }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText)); else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Network Error'));
        xhr.send(formData);
    });
};

function DocumentRow({ label, type, existingDoc, file, setFile, progress, isOptional = false }: any) {
    const isUploaded = !!existingDoc; const isSelected = !!file; const isUploading = progress > 0 && progress < 100;
    return (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors group relative overflow-hidden">
            {isUploading && <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />}
            <div className="flex items-center gap-3 overflow-hidden z-10">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors border", isUploaded ? "bg-green-50 text-green-600 border-green-200" : isUploading ? "bg-blue-50 text-blue-600 border-blue-200" : isSelected ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-muted text-muted-foreground border-transparent")}>
                    {isUploading ? <span className="text-[10px] font-bold">{Math.round(progress)}%</span> : isUploaded ? <IconCheck size={20} /> : isSelected ? <IconUpload size={20} /> : <IconFileText size={20} />}
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium text-sm truncate text-foreground">{label}</span>{isOptional && <Badge variant="outline" className="text-[10px] h-5 px-1.5">Optionnel</Badge>}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{isUploading ? <span className="text-blue-600 font-medium animate-pulse">Upload en cours...</span> : file ? <span className="text-blue-600 font-medium">Prêt: {file.name}</span> : isUploaded ? <a href={`https://backoffice.urbagroupe.ma/${existingDoc.fileUrl}`} target="_blank" className="hover:underline flex items-center gap-1 text-green-600">{existingDoc.originalFileName || existingDoc.fileName} <IconDownload size={12} /></a> : <span>Non uploadé</span>}</div>
                </div>
            </div>
            <div className="flex-shrink-0 ml-2 z-10"><div className="relative"><input type="file" id={`upload-${type}`} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" onChange={(e) => { if (e.target.files && e.target.files[0]) setFile(e.target.files[0]); }} /><Button variant={isUploaded || isSelected ? "outline" : "secondary"} size="sm" disabled={isUploading} className={cn("pointer-events-none h-8 text-xs", isUploaded && "border-green-200 text-green-700 hover:bg-green-50")}>{isUploading ? <IconLoader className="animate-spin h-3 w-3" /> : isUploaded ? "Remplacer" : isSelected ? "Changer" : "Choisir"}</Button></div></div>
        </div>
    );
}

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

// --- 3. MAIN COMPONENT ---
export function ProjectEditDrawer({ item }: { item: any }) {
    const isMobile = useIsMobile();
    const { data: meData } = useQuery(ME_QUERY);
    const userRole = meData?.me.role.name;
    const userPermissions = meData?.me.role.permissions || [];

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
    const [teamData, setTeamData] = React.useState({ infographisteIds: item.team.infographistes.map((u: any) => u.id), team3DIds: item.team.team3D.map((u: any) => u.id), assistantIds: item.team.assistants.map((u: any) => u.id) });

    // FORM DATA
    const [formData, setFormData] = React.useState({
        ...item,
        marketEstimate: item.marketEstimate || 0,
        estimatedBudget: item.estimatedBudget || 0
    });

    const [newTaskDesc, setNewTaskDesc] = React.useState("");
    const [newTaskAssignee, setNewTaskAssignee] = React.useState("");
    const [newTaskDept, setNewTaskDept] = React.useState("");
    const [avisData, setAvisData] = React.useState({ status: '', reason: '' });

    // Mutations (garder les vôtres, pas de changement)
    const [updateProject, { loading: loadingUpdate }] = useMutation(UPDATE_PROJECT_MUTATION, { onCompleted: () => toast.success("Projet mis à jour!"), onError: (err) => toast.error(err.message), refetchQueries: [GET_PROJECTS_FEED] });
    const [uploadDocument, { loading: loadingUpload }] = useMutation(UPLOAD_DOCUMENT_MUTATION);
    const [submitForReview, { loading: loadingSubmit }] = useMutation(SUBMIT_REVIEW_MUTATION, { onCompleted: () => toast.success("Projet soumis avec succès!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [adminAssignProject, { loading: loadingAssign }] = useMutation(ADMIN_ASSIGN_PROJECT_MUTATION, { onCompleted: () => toast.success("Projet assigné!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [cpUploadEstimate, { loading: loadingEstimate }] = useMutation(CP_UPLOAD_ESTIMATE_MUTATION, { refetchQueries: [GET_PROJECTS_FEED] });
    const [adminRunFeasibility, { loading: loadingFeasibility }] = useMutation(ADMIN_RUN_FEASIBILITY_MUTATION, { onCompleted: () => toast.info("Faisabilité mise à jour."), refetchQueries: [GET_PROJECTS_FEED] });
    const [adminLaunchProject, { loading: loadingLaunch }] = useMutation(ADMIN_LAUNCH_PROJECT_MUTATION, { onCompleted: () => toast.success("Projet lancé!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [financeRequestCaution, { loading: loadingCaution }] = useMutation(FINANCE_REQUEST_CAUTION_MUTATION, { onCompleted: () => toast.success("Caution demandée!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [cpAssignTeam, { loading: loadingTeam }] = useMutation(CP_ASSIGN_TEAM_MUTATION, { onCompleted: () => toast.success("Équipe assignée!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [createTask, { loading: loadingTaskCreate }] = useMutation(PM_CREATE_TASK_MUTATION, { onCompleted: () => { toast.success("Tâche créée!"); setNewTaskDesc(""); setNewTaskAssignee(""); setNewTaskDept(""); }, onError: (err) => toast.error(err.message), refetchQueries: [{ query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: item.id } }, { query: GET_PROJECTS_FEED }] });
    const [giveProposalAvis, { loading: loadingAvis }] = useMutation(GIVE_PROPOSAL_AVIS_MUTATION, { onCompleted: () => { toast.success("Avis enregistré!"); setAvisData({ status: '', reason: '' }); }, refetchQueries: [{ query: GET_PROJECTS_FEED }] });
    const [updateTaskStatus] = useMutation(PM_UPDATE_TASK_STATUS_MUTATION, { onCompleted: () => toast.success("Status MAJ!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [cpUploadAsset, { loading: loadingAsset }] = useMutation(CP_UPLOAD_ASSET_MUTATION, { onCompleted: () => { toast.success("Asset uploadé!"); setFileAsset(null); }, refetchQueries: [{ query: GET_PROJECTS_FEED }] });

    // --- ✅ CHANGEMENT ICI : ON RÉCUPÈRE TOUS LES USERS ---
    const { data: allUsersData, loading: loadingUsers } = useQuery(GET_ALL_USERS, { skip: userRole !== 'ADMIN' });
    const { data: teamMembers, loading: loadingTeamMembers } = useQuery(GET_TEAM_MEMBERS, { skip: !(userRole === 'ADMIN' || userPermissions.includes('assign_creative_tasks')) });

    const existingDocs = item.stages?.administrative?.documents || [];
    const getDoc = (type: string) => existingDocs.find((d: any) => d.fileName === type);
    const existingTechDocs = item.stages?.technical?.documents || [];
    const getTechDoc = (type: string) => existingTechDocs.find((d: any) => d.fileName === type);

    // Handlers
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
            let uploadBaseUrl = 'http://localhost:5001';
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                if (hostname !== 'localhost' && hostname !== '127.0.0.1') { uploadBaseUrl = 'https://backoffice.urbagroupe.ma'; }
            }
            const result = await uploadFileWithProgress(file, `${uploadBaseUrl}/api/upload/${item.id}`, (percent) => { setUploadProgress(prev => ({ ...prev, [docType]: percent })); });
            await mutation({ variables: { projectId: item.id, stageName, docType, originalFileName: file.name, fileUrl: result.fileUrl } });
            setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
            return true;
        } catch (err: any) {
            setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
            toast.error(`Erreur upload ${docType}: ${err.message}`);
            return false;
        }
    };

    const handleSubmitForReview = async () => {
        const isDraft = item.preparationStatus === 'DRAFT';
        const hasCPS = fileCPS || getDoc('CPS');
        const hasRC = fileRC || getDoc('RC');
        const hasAvis = fileAvis || getDoc('Avis');

        if (isDraft && (!hasCPS || !hasRC || !hasAvis)) { toast.error("Documents requis manquants."); return; }
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
                        <DocumentRow label="Cahier des Charges (CPS)" type="CPS" existingDoc={getDoc('CPS')} file={fileCPS} setFile={setFileCPS} progress={uploadProgress['CPS'] || 0} />
                        <DocumentRow label="Règlement Consultation (RC)" type="RC" existingDoc={getDoc('RC')} file={fileRC} setFile={setFileRC} progress={uploadProgress['RC'] || 0} />
                        <DocumentRow label="Avis de Marché" type="Avis" existingDoc={getDoc('Avis')} file={fileAvis} setFile={setFileAvis} progress={uploadProgress['Avis'] || 0} />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Documents Optionnels</h4>
                        <DocumentRow label="Bordereau Prix (BPE)" type="BPE" existingDoc={getDoc('BPE')} file={fileBPE} setFile={setFileBPE} progress={uploadProgress['BPE'] || 0} isOptional />
                        <DocumentRow label="Dossier Technique" type="Tech" existingDoc={getDoc('Fichier Technique')} file={fileTech} setFile={setFileTech} progress={uploadProgress['Fichier Technique'] || 0} isOptional />
                    </div>
                </div>
            );
        }

        // --- VUE ADMIN (VALIDATION ASSIGNATION) ---
        if (userRole === 'ADMIN' && isPendingAdminReview) {
            return (
                <form id="admin-assign-form" className="flex flex-col gap-4" onSubmit={handleAdminSubmit}>
                    <h4 className="font-semibold">Validation Administrative</h4>
                    <Select value={adminFormData.status} onValueChange={(v) => handleAdminFormChange("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TO_PREPARE">Valider (À Préparer)</SelectItem><SelectItem value="NO">Refuser</SelectItem></SelectContent></Select>
                    <Label>Assigner Chef de Projet</Label>
                    {loadingPMs ? <Skeleton className="h-10" /> : <Select value={adminFormData.projectManagerId} onValueChange={(v) => handleAdminFormChange("projectManagerId", v)}><SelectTrigger><SelectValue placeholder="Choisir CP..." /></SelectTrigger><SelectContent>{pmData?.users.map((pm: any) => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent></Select>}
                </form>
            );
        }

        // --- VUE CP (PREPARATION ESTIMATION) ---
        if (userPermissions.includes('manage_assigned_projects') && isToPrepare) {
            return (
                <div className="flex flex-col gap-6 w-full">
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm flex items-center gap-2"><IconChartPie size={18} />Préparer l'estimation financière.</div>
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Données Financières</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><Label>Montant Marché (DH)</Label><Input type="number" id="marketEstimate" value={formData.marketEstimate} onChange={handleChange} placeholder="ex: 100000" className="font-mono" /></div>
                            <div className="space-y-1.5"><Label>Coût Estimé (DH)</Label><Input type="number" id="estimatedBudget" value={formData.estimatedBudget} onChange={handleChange} placeholder="ex: 80000" className="font-mono" /></div>
                        </div>
                        <MarginCalculator marketPrice={Number(formData.marketEstimate) || 0} costPrice={Number(formData.estimatedBudget) || 0} />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fichiers Techniques</h4>
                        <DocumentRow label="Estimation Excel (CPS)" type="CP_ESTIMATE" existingDoc={getTechDoc('CP_ESTIMATE')} file={fileEstimate} setFile={setFileEstimate} progress={uploadProgress['CP_ESTIMATE'] || 0} />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Décision</h4>
                        <Select value={avisData.status} onValueChange={(v) => handleAvisFormChange("status", v)}><SelectTrigger><SelectValue placeholder="Sélectionner une décision..." /></SelectTrigger><SelectContent><SelectItem value="ACCEPTED">✅ Valider (Prêt pour Faisabilité)</SelectItem><SelectItem value="NOT_ACCEPTED">❌ Refuser (Non Faisable)</SelectItem></SelectContent></Select>
                        {avisData.status === 'NOT_ACCEPTED' && <Textarea placeholder="Motif..." value={avisData.reason} onChange={(e) => handleAvisFormChange("reason", e.target.value)} />}
                        <Button onClick={handleSubmitAvis} disabled={loadingAvis} className="w-full">{loadingAvis ? <IconLoader className="animate-spin" /> : "Confirmer la décision"}</Button>
                    </div>
                </div>
            );
        }

        // --- ✅ FIX: VUE ADMIN (FEASIBILITY DASHBOARD) ---
        if (userRole === 'ADMIN' && isFeasibilityPending) {
            return (
                <div className="flex flex-col gap-6">
                    {/* 1. Carte Financière */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <IconChartPie className="h-4 w-4 text-blue-500" />
                            Analyse Financière (Données CP)
                        </h4>

                        {/* ✅ FIX: Ajout de || 0 pour éviter le NaN */}
                        <MarginCalculator
                            marketPrice={Number(formData.marketEstimate) || 0}
                            costPrice={Number(formData.estimatedBudget) || 0}
                        />
                    </div>

                    {/* 2. Téléchargement Estimation */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Documents de Référence</h4>
                        {getTechDoc('CP_ESTIMATE') ? (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                        <IconFileText size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">Estimation Détaillée (Excel)</span>
                                        <span className="text-xs text-muted-foreground">Uploadé par le CP</span>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <a href={`https://backoffice.urbagroupe.ma/${getTechDoc('CP_ESTIMATE').fileUrl}`} target="_blank">
                                        <IconDownload size={14} className="mr-2" /> Télécharger
                                    </a>
                                </Button>
                            </div>
                        ) : (
                            <div className="p-3 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                                ⚠️ Aucune estimation Excel n'a été uploadée par le CP.
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* 3. Contrôles de Validation */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Validation des Critères</h4>
                        {/* Administrative */}
                        <div className="flex items-center justify-between p-3 border rounded-md bg-card">
                            <div className="flex items-center gap-3">
                                <IconFiles className="text-muted-foreground" size={20} />
                                <Label className="font-medium">Faisabilité Administrative</Label>
                            </div>
                            <Select value={feasibilityData.administrative} onValueChange={(v) => handleFeasibilityChange('administrative', v)}>
                                <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="PENDING">En cours</SelectItem><SelectItem value="PASS">✅ Valider</SelectItem><SelectItem value="FAIL">❌ Rejeter</SelectItem></SelectContent>
                            </Select>
                        </div>
                        {/* Technical */}
                        <div className="flex items-center justify-between p-3 border rounded-md bg-card">
                            <div className="flex items-center gap-3">
                                <IconTools className="text-muted-foreground" size={20} />
                                <Label className="font-medium">Faisabilité Technique</Label>
                            </div>
                            <Select value={feasibilityData.technical} onValueChange={(v) => handleFeasibilityChange('technical', v)}>
                                <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="PENDING">En cours</SelectItem><SelectItem value="PASS">✅ Valider</SelectItem><SelectItem value="FAIL">❌ Rejeter</SelectItem></SelectContent>
                            </Select>
                        </div>
                        {/* Financial */}
                        <div className="flex items-center justify-between p-3 border rounded-md bg-card">
                            <div className="flex items-center gap-3">
                                <IconBuildingBank className="text-muted-foreground" size={20} />
                                <Label className="font-medium">Faisabilité Financière</Label>
                            </div>
                            <Select value={feasibilityData.financial} onValueChange={(v) => handleFeasibilityChange('financial', v)}>
                                <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="PENDING">En cours</SelectItem><SelectItem value="PASS">✅ Valider</SelectItem><SelectItem value="FAIL">❌ Rejeter</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            );
        }

        if (userPermissions.includes('manage_cautions') && isCautionPending) return <div className="p-4 border rounded-lg"><h4 className="font-semibold">Demande de Caution</h4><p className="text-muted-foreground text-sm">Veuillez confirmer la demande.</p></div>;
        if ((userPermissions.includes('assign_creative_tasks') || userRole === 'ADMIN') && isInProduction) { /* ... Code Production inchangé ... */ return <div>...Production...</div>; }
        if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER') return <form id="update-dossier-form" className="flex flex-col gap-4" onSubmit={handleSubmit}><div className="flex flex-col gap-3"><Label>Nom Projet</Label><Input id="object" value={formData.object} onChange={handleChange} /></div></form>;

        return <p>Accès standard.</p>;
    };

    const renderPanelFooter = () => {
        if (userRole === 'PROPOSAL_MANAGER' && (isDraft || isPendingAdminReview)) {
            const hasMandatory = (fileCPS || getDoc('CPS')) && (fileRC || getDoc('RC')) && (fileAvis || getDoc('Avis'));
            const hasNewUploads = fileCPS || fileRC || fileAvis || fileBPE || fileTech;
            return <Button onClick={handleSubmitForReview} disabled={loading || (!hasNewUploads && !isDraft) || (isDraft && !hasMandatory)} className={cn("w-full transition-all", !isDraft ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700")}>{isUploadingFiles ? "Upload en cours..." : !isDraft ? (hasNewUploads ? "Mettre à jour" : "Sélectionner un fichier") : "Valider et Soumettre"}</Button>;
        }

        if (userPermissions.includes('manage_assigned_projects') && isToPrepare) {
            return <div className="flex gap-2 w-full"><Button onClick={(e) => { if (fileEstimate) handleSubmitEstimate(); handleSubmit(e); }} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">{isUploadingFiles ? "Upload..." : "Sauvegarder Données"}</Button></div>;
        }

        if (userRole === 'ADMIN' && isFeasibilityPending) {
            const canLaunch = feasibilityData.administrative === 'PASS' && feasibilityData.technical === 'PASS' && feasibilityData.financial === 'PASS';
            return <Button onClick={handleLaunchProject} disabled={loading || !canLaunch} className="bg-green-600 hover:bg-green-700 w-full">Lancer le Projet</Button>;
        }

        if (userRole === 'ADMIN' && isPendingAdminReview) return <Button form="admin-assign-form" type="submit" disabled={loading} className="w-full">Confirmer l'Assignation</Button>;
        if (userPermissions.includes('manage_cautions') && isCautionPending) return <Button onClick={handleRequestCaution} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full">Confirmer Caution</Button>;
        if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER') return <Button form="update-dossier-form" type="submit" disabled={loading} className="w-full">Sauvegarder</Button>;
        return <Button variant="outline" className="w-full">Fermer</Button>;
    };

    return (
        <Drawer direction={isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild><Button variant="link" className="text-foreground px-0 text-left h-auto block"><span className="block truncate max-w-[200px] md:max-w-[350px]" title={item.object}>{item.object}</span></Button></DrawerTrigger>
            <DrawerContent className={cn("p-4", isMobile ? "h-[90vh]" : "sm:max-w-2xl")}>
                <DrawerHeader className="gap-1 px-0 pt-0"><DrawerTitle>{item.object}</DrawerTitle><DrawerDescription>Gestion des documents.</DrawerDescription></DrawerHeader>
                <div className="flex-grow overflow-y-auto pr-2 -mr-4 py-4">{renderPanelContent()}</div>
                <DrawerFooter className="px-0 pb-0">{renderPanelFooter()}<DrawerClose asChild><Button variant="ghost" className="mt-2" disabled={loading}>Annuler</Button></DrawerClose></DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}