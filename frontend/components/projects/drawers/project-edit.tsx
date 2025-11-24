"use client";
import * as React from "react";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/ui/file-upload";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconPlus } from "@tabler/icons-react";

import { TaskStatusPill } from "../utils";
import { MultiSelectPopover } from "../team-selector";
import {
    ME_QUERY, GET_PROJECT_MANAGERS, GET_TEAM_MEMBERS, GET_TASKS_BY_PROJECT_QUERY, GET_PROJECTS_FEED,
    UPDATE_PROJECT_MUTATION, UPLOAD_DOCUMENT_MUTATION, SUBMIT_REVIEW_MUTATION,
    ADMIN_ASSIGN_PROJECT_MUTATION, CP_UPLOAD_ESTIMATE_MUTATION, ADMIN_RUN_FEASIBILITY_MUTATION,
    ADMIN_LAUNCH_PROJECT_MUTATION, FINANCE_REQUEST_CAUTION_MUTATION, CP_ASSIGN_TEAM_MUTATION,
    PM_CREATE_TASK_MUTATION, PM_UPDATE_TASK_STATUS_MUTATION, CP_UPLOAD_ASSET_MUTATION,
    GIVE_PROPOSAL_AVIS_MUTATION
} from "@/lib/graphql/projects";

export function ProjectEditDrawer({ item }: { item: any }) {
    const isMobile = useIsMobile();
    const { data: meData } = useQuery(ME_QUERY);
    const userRole = meData?.me.role.name;
    const userPermissions = meData?.me.role.permissions || [];

    // State
    const [fileCPS, setFileCPS] = React.useState<File | null>(null);
    const [fileRC, setFileRC] = React.useState<File | null>(null);
    const [fileAvis, setFileAvis] = React.useState<File | null>(null);
    const [fileTech, setFileTech] = React.useState<File | null>(null);
    const [fileEstimate, setFileEstimate] = React.useState<File | null>(null);
    const [fileAsset, setFileAsset] = React.useState<File | null>(null);

    const [adminFormData, setAdminFormData] = React.useState({ status: item.preparationStatus, projectManagerId: item.projectManagers[0]?.id || '' });
    const [feasibilityData, setFeasibilityData] = React.useState({ administrative: item.feasibilityChecks.administrative, technical: item.feasibilityChecks.technical, financial: item.feasibilityChecks.financial });
    const [teamData, setTeamData] = React.useState({ infographisteIds: item.team.infographistes.map((u: any) => u.id), team3DIds: item.team.team3D.map((u: any) => u.id), assistantIds: item.team.assistants.map((u: any) => u.id) });
    const [formData, setFormData] = React.useState({ ...item });
    const [newTaskDesc, setNewTaskDesc] = React.useState("");
    const [newTaskAssignee, setNewTaskAssignee] = React.useState("");
    const [newTaskDept, setNewTaskDept] = React.useState("");
    const [avisData, setAvisData] = React.useState({ status: '', reason: '' });

    // Mutations
    const [updateProject, { loading: loadingUpdate }] = useMutation(UPDATE_PROJECT_MUTATION, { onCompleted: () => toast.success("Projet mis à jour!"), onError: (err) => toast.error(err.message), refetchQueries: [GET_PROJECTS_FEED] });
    const [uploadDocument, { loading: loadingUpload }] = useMutation(UPLOAD_DOCUMENT_MUTATION);
    const [submitForReview, { loading: loadingSubmit }] = useMutation(SUBMIT_REVIEW_MUTATION, { onCompleted: () => toast.success("Projet soumis!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [adminAssignProject, { loading: loadingAssign }] = useMutation(ADMIN_ASSIGN_PROJECT_MUTATION, { onCompleted: () => toast.success("Projet assigné!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [cpUploadEstimate, { loading: loadingEstimate }] = useMutation(CP_UPLOAD_ESTIMATE_MUTATION, { refetchQueries: [GET_PROJECTS_FEED] });
    const [adminRunFeasibility, { loading: loadingFeasibility }] = useMutation(ADMIN_RUN_FEASIBILITY_MUTATION, { onCompleted: () => toast.info("Feasibility update."), refetchQueries: [GET_PROJECTS_FEED] });
    const [adminLaunchProject, { loading: loadingLaunch }] = useMutation(ADMIN_LAUNCH_PROJECT_MUTATION, { onCompleted: () => toast.success("Projet lancé!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [financeRequestCaution, { loading: loadingCaution }] = useMutation(FINANCE_REQUEST_CAUTION_MUTATION, { onCompleted: () => toast.success("Caution demandée!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [cpAssignTeam, { loading: loadingTeam }] = useMutation(CP_ASSIGN_TEAM_MUTATION, { onCompleted: () => toast.success("Équipe assignée!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [createTask, { loading: loadingTaskCreate }] = useMutation(PM_CREATE_TASK_MUTATION, { onCompleted: () => { toast.success("Tâche créée!"); setNewTaskDesc(""); setNewTaskAssignee(""); setNewTaskDept(""); }, onError: (err) => toast.error(err.message), refetchQueries: [{ query: GET_TASKS_BY_PROJECT_QUERY, variables: { projectId: item.id } }, { query: GET_PROJECTS_FEED }] });
    const [giveProposalAvis, { loading: loadingAvis }] = useMutation(GIVE_PROPOSAL_AVIS_MUTATION, { onCompleted: () => { toast.success("Avis enregistré!"); setAvisData({ status: '', reason: '' }); }, refetchQueries: [{ query: GET_PROJECTS_FEED }] });
    const [updateTaskStatus] = useMutation(PM_UPDATE_TASK_STATUS_MUTATION, { onCompleted: () => toast.success("Status MAJ!"), refetchQueries: [GET_PROJECTS_FEED] });
    const [cpUploadAsset, { loading: loadingAsset }] = useMutation(CP_UPLOAD_ASSET_MUTATION, { onCompleted: () => { toast.success("Asset uploadé!"); setFileAsset(null); }, refetchQueries: [{ query: GET_PROJECTS_FEED }] });

    // Queries
    const { data: pmData, loading: loadingPMs } = useQuery(GET_PROJECT_MANAGERS, { skip: userRole !== 'ADMIN' });
    const { data: teamMembers, loading: loadingTeamMembers } = useQuery(GET_TEAM_MEMBERS, { skip: !(userRole === 'ADMIN' || userPermissions.includes('assign_creative_tasks')) });
    const { data: taskData, loading: taskLoading } = useQuery(GET_TASKS_BY_PROJECT_QUERY, { variables: { projectId: item.id }, skip: !item.id });

    // Handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData({ ...formData, [e.target.id]: e.target.value }); };
    const handleSelectChange = (id: string, value: string) => { setFormData({ ...formData, [id]: value }); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); updateProject({ variables: { id: item.id, input: { title: formData.title, object: formData.object, status: formData.status } } }); };

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
        if (!file) { toast.error(`Aucun fichier ${docType}`); return false; }
        const formDataRest = new FormData(); formDataRest.append('file', file);
        try {
            toast.loading(`Uploading ${file.name}...`);
            const response = await fetch(`https://backoffice.urbagroupe.ma/api/upload/${item.id}`, { method: 'POST', body: formDataRest });
            if (!response.ok) throw new Error('Upload failed');
            const result = await response.json(); toast.dismiss();
            await mutation({ variables: { projectId: item.id, stageName, docType, originalFileName: file.name, fileUrl: result.fileUrl } });
            toast.success(`Upload réussi!`); return true;
        } catch (err: any) { toast.dismiss(); toast.error(err.message); return false; }
    };

    const handleSubmitForReview = async () => {
        if (!fileCPS || !fileRC || !fileAvis) { toast.error("Les 3 fichiers sont requis."); return; }
        await handleFileUploadAndMutate(fileCPS, uploadDocument, 'CPS', 'administrative');
        await handleFileUploadAndMutate(fileRC, uploadDocument, 'RC', 'administrative');
        await handleFileUploadAndMutate(fileAvis, uploadDocument, 'Avis', 'administrative');
        if (fileTech) await handleFileUploadAndMutate(fileTech, uploadDocument, 'Fichier Technique', 'technical');
        submitForReview({ variables: { projectId: item.id } });
    };

    const handleTeamChange = (type: 'infographisteIds' | 'team3DIds' | 'assistantIds', userId: string, isChecked: boolean) => {
        setTeamData(prev => {
            const currentIds = prev[type] || [];
            const newIds = isChecked ? [...currentIds, userId] : currentIds.filter(id => id !== userId);
            return { ...prev, [type]: newIds };
        });
    };

    const handleCreateTask = () => {
        if (!newTaskDesc || !newTaskAssignee || !newTaskDept) { toast.error("Champs requis."); return; }
        createTask({ variables: { input: { projectId: item.id, description: newTaskDesc, assignedToId: newTaskAssignee, department: newTaskDept } } });
    };

    React.useEffect(() => { setFormData({ ...item }); }, [item]);
    const loading = loadingUpdate || loadingUpload || loadingSubmit || loadingAssign || loadingEstimate || loadingFeasibility || loadingLaunch || loadingCaution || loadingTeam || loadingTaskCreate;

    const existingAdminDocs = item.stages?.administrative?.documents || [];
    const isDraft = item.preparationStatus === 'DRAFT';
    const isPendingAdminReview = item.preparationStatus === 'TO_CONFIRM';
    const isToPrepare = item.preparationStatus === 'TO_PREPARE';
    const isFeasibilityPending = item.preparationStatus === 'FEASIBILITY_PENDING';
    const isCautionPending = item.preparationStatus === 'CAUTION_PENDING';
    const isInProduction = item.preparationStatus === 'IN_PRODUCTION';

    const renderPanelContent = () => {
        if (userRole === 'PROPOSAL_MANAGER') {
            return (
                <div className="flex flex-col gap-4 rounded-lg border p-4">
                    {isDraft ? (
                        <>
                            <h4 className="font-semibold">Dossier Administratif (Requis)</h4>
                            <FileUpload label="CPS (Requis)" onFileSelect={setFileCPS} />
                            <FileUpload label="RC (Requis)" onFileSelect={setFileRC} />
                            <FileUpload label="Avis de Marché (Requis)" onFileSelect={setFileAvis} />
                            <Separator />
                            <h4 className="font-semibold mt-2">Dossier Technique</h4>
                            <FileUpload label="Fichier Technique" onFileSelect={setFileTech} />
                        </>
                    ) : <h4 className="font-semibold text-green-600">Projet soumis.</h4>}
                    {existingAdminDocs.length > 0 && (
                        <div className="mt-2"><Label>Fichiers:</Label><ul className="list-disc pl-5 text-muted-foreground">{existingAdminDocs.map((doc: any) => <li key={doc.id}>{doc.fileName}</li>)}</ul></div>
                    )}
                </div>
            );
        }
        if (userRole === 'ADMIN' && isPendingAdminReview) {
            return (
                <form id="admin-assign-form" className="flex flex-col gap-4" onSubmit={handleAdminSubmit}>
                    <h4 className="font-semibold">Validation</h4>
                    <Select value={adminFormData.status} onValueChange={(v) => handleAdminFormChange("status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="TO_PREPARE">Oui</SelectItem><SelectItem value="NO">Non</SelectItem></SelectContent>
                    </Select>
                    <Label>Assigner CP</Label>
                    {loadingPMs ? <Skeleton className="h-10" /> : (
                        <Select value={adminFormData.projectManagerId} onValueChange={(v) => handleAdminFormChange("projectManagerId", v)}>
                            <SelectTrigger><SelectValue placeholder="Choisir CP..." /></SelectTrigger>
                            <SelectContent>{pmData?.users.map((pm: any) => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                </form>
            );
        }
        if (userPermissions.includes('manage_assigned_projects') && isToPrepare) {
            return (
                <div className="flex flex-col gap-6 w-full">
                    <div className="flex flex-col gap-4 rounded-lg border p-4">
                        <h4 className="font-semibold">Estimation</h4>
                        <FileUpload label="Excel" onFileSelect={setFileEstimate} />
                        <Button onClick={handleSubmitEstimate} disabled={loadingEstimate || !fileEstimate} size="sm" className="mt-2 w-fit self-end">Uploader</Button>
                    </div>
                    <div className="flex flex-col gap-4 rounded-lg border p-4">
                        <h4 className="font-semibold">Avis</h4>
                        <Select value={avisData.status} onValueChange={(v) => handleAvisFormChange("status", v)}>
                            <SelectTrigger><SelectValue placeholder="Décision..." /></SelectTrigger>
                            <SelectContent><SelectItem value="ACCEPTED">Accepté</SelectItem><SelectItem value="NOT_ACCEPTED">Refusé</SelectItem></SelectContent>
                        </Select>
                        {avisData.status === 'NOT_ACCEPTED' && <Textarea placeholder="Raison..." value={avisData.reason} onChange={(e) => handleAvisFormChange("reason", e.target.value)} />}
                        <Button onClick={handleSubmitAvis} disabled={loadingAvis} size="sm" className="mt-2 w-fit self-end">Enregistrer Avis</Button>
                    </div>
                </div>
            );
        }
        if (userRole === 'ADMIN' && isFeasibilityPending) {
            return (
                <div className="flex flex-col gap-4 rounded-lg border p-4">
                    <h4 className="font-semibold">Feasibility Checks</h4>
                    {['administrative', 'technical', 'financial'].map(type => (
                        <div key={type} className="flex flex-col gap-2">
                            <Label className="capitalize">{type}</Label>
                            <Select value={(feasibilityData as any)[type]} onValueChange={(v) => handleFeasibilityChange(type, v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="PASS">Pass</SelectItem><SelectItem value="FAIL">Fail</SelectItem></SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            );
        }
        if (userPermissions.includes('manage_cautions') && isCautionPending) {
            return <div className="p-4 border rounded-lg"><h4 className="font-semibold">Demande de Caution</h4><p className="text-muted-foreground text-sm">Veuillez confirmer la demande.</p></div>;
        }
        if ((userPermissions.includes('assign_creative_tasks') || userRole === 'ADMIN') && isInProduction) {
            if (loadingTeamMembers) return <Skeleton className="h-40" />;
            const allTeamMembers = [
                ...(teamMembers?.infographistes.map((u: any) => ({ ...u, dept: 'CREATIVE' })) || []),
                ...(teamMembers?.team3D.map((u: any) => ({ ...u, dept: '3D_ARTIST' })) || []),
                ...(teamMembers?.assistants.map((u: any) => ({ ...u, dept: 'ASSISTANT_PM' })) || [])
            ];
            const assignedTeamMembers = allTeamMembers.filter(m => teamData.infographisteIds.includes(m.id) || teamData.team3DIds.includes(m.id) || teamData.assistantIds.includes(m.id));

            return (
                <div className="flex flex-col gap-6 w-full">
                    <div className="flex flex-col gap-4 rounded-lg border p-4">
                        <h4 className="font-semibold">Assignation Équipe</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col gap-2"><Label>Infographistes</Label><MultiSelectPopover title="Choisir..." options={teamMembers?.infographistes || []} selectedIds={teamData.infographisteIds} onChange={(id, c) => handleTeamChange('infographisteIds', id, c)} /></div>
                            <div className="flex flex-col gap-2"><Label>3D</Label><MultiSelectPopover title="Choisir..." options={teamMembers?.team3D || []} selectedIds={teamData.team3DIds} onChange={(id, c) => handleTeamChange('team3DIds', id, c)} /></div>
                            <div className="flex flex-col gap-2"><Label>Assistants</Label><MultiSelectPopover title="Choisir..." options={teamMembers?.assistants || []} selectedIds={teamData.assistantIds} onChange={(id, c) => handleTeamChange('assistantIds', id, c)} /></div>
                        </div>
                        <Button onClick={handleAssignTeam} disabled={loadingTeam} size="sm" className="mt-2 w-fit self-end">Enregistrer Équipe</Button>
                    </div>
                    <div className="flex flex-col gap-4 rounded-lg border p-4">
                        <h4 className="font-semibold">Assets</h4>
                        <FileUpload label="Asset" onFileSelect={setFileAsset} />
                        <Button onClick={handleSubmitAsset} disabled={loadingAsset || !fileAsset} size="sm" className="mt-2 w-fit self-end">Uploader Asset</Button>
                    </div>
                    <Separator />
                    <div className="flex flex-col gap-4 rounded-lg border p-4">
                        <h4 className="font-semibold">Gestion Tâches</h4>
                        <div className="flex items-end gap-2">
                            <div className="flex-grow flex flex-col gap-2"><Label>Tâche</Label><Input value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} placeholder="Description..." /></div>
                            <div className="flex flex-col gap-2"><Label>Assigner à</Label>
                                <Select value={newTaskAssignee} onValueChange={(v) => { setNewTaskAssignee(v); setNewTaskDept(allTeamMembers.find(m => m.id === v)?.dept || ''); }}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Membre..." /></SelectTrigger>
                                    <SelectContent>{assignedTeamMembers.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleCreateTask} disabled={loadingTaskCreate} size="icon"><IconPlus className="h-4 w-4" /></Button>
                        </div>
                        <Separator className="my-2" />
                        <div className="max-h-48 overflow-y-auto border rounded-lg">
                            <Table>
                                <TableHeader><TableRow><TableHead>Tâche</TableHead><TableHead>Assigné à</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {taskLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-8" /></TableCell></TableRow>}
                                    {taskData?.tasksByProject.map((task: any) => (
                                        <TableRow key={task.id}><TableCell>{task.description}</TableCell><TableCell>{task.assignedTo.name}</TableCell><TableCell><TaskStatusPill status={task.status} /></TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            );
        }
        if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER') {
            return (
                <form id="update-dossier-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-3"><Label>Nom Projet</Label><Input id="object" value={formData.object} onChange={handleChange} /></div>
                    <div className="flex flex-col gap-3"><Label>Client</Label><Input id="title" value={formData.title} onChange={handleChange} /></div>
                    <div className="flex flex-col gap-3"><Label>Status</Label>
                        <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="IN_PROGRESS">In Progress</SelectItem><SelectItem value="DONE">Done</SelectItem><SelectItem value="CANCELED">Canceled</SelectItem></SelectContent>
                        </Select>
                    </div>
                </form>
            );
        }
        return <p>Accès refusé.</p>;
    };

    const renderPanelFooter = () => {
        if (userRole === 'PROPOSAL_MANAGER' && isDraft) return <Button onClick={handleSubmitForReview} disabled={loading} className="bg-green-600 hover:bg-green-700">Soumettre</Button>;
        if (userRole === 'ADMIN' && isPendingAdminReview) return <Button form="admin-assign-form" type="submit" disabled={loading}>Valider</Button>;
        if (userRole === 'ADMIN' && isFeasibilityPending) {
            const canLaunch = feasibilityData.administrative === 'PASS' && feasibilityData.technical === 'PASS' && feasibilityData.financial === 'PASS';
            return <Button onClick={handleLaunchProject} disabled={loading || !canLaunch} className="bg-green-600 hover:bg-green-700">Lancer</Button>;
        }
        if (userPermissions.includes('manage_cautions') && isCautionPending) return <Button onClick={handleRequestCaution} disabled={loading} className="bg-blue-600 hover:bg-blue-700">Confirmer Caution</Button>;
        if (userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER') return <Button form="update-dossier-form" type="submit" disabled={loading}>Sauvegarder</Button>;
        return null;
    };

    return (
        <Drawer direction={isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild>
                <Button variant="link" className="text-foreground px-0 text-left h-auto block">
                    <span className="block truncate max-w-[200px] md:max-w-[350px]" title={item.object}>{item.object}</span>
                </Button>
            </DrawerTrigger>
            <DrawerContent className={cn("p-4", isMobile ? "h-[90vh]" : "sm:max-w-4xl")}>
                <DrawerHeader className="gap-1 px-0 pt-0"><DrawerTitle>{item.object}</DrawerTitle><DrawerDescription>Modifier les informations.</DrawerDescription></DrawerHeader>
                <div className="flex-grow overflow-y-auto pr-2 -mr-4">{renderPanelContent()}</div>
                <DrawerFooter className="px-0 pb-0">{renderPanelFooter()}<DrawerClose asChild><Button variant="outline">Done</Button></DrawerClose></DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}