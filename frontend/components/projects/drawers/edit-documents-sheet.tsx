"use client";

import * as React from "react";
import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconFileText, IconLoader, IconX, IconTrash, IconCloudUpload, IconFileCheck, IconCalendar, IconDatabase
} from "@tabler/icons-react";

import {
    GET_PROJECTS_FEED,
    UPLOAD_DOCUMENT_MUTATION,
    DELETE_DOCUMENT_MUTATION
} from "@/lib/graphql/projects";
import { cn } from "@/lib/utils";

// --- HELPER: Format File Size (Bytes -> MB) ---
const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return 'N/A';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// --- HELPER: Format Date ---
const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

// --- HELPER UPLOAD ---
const uploadFileWithProgress = (file: File, url: string, onProgress: (percent: number) => void): Promise<any> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        xhr.open('POST', url, true);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress((e.loaded / e.total) * 100);
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

// --- COMPOSANT ROW (Design Professionnel) ---
function DocumentRow({
    label, type, existingDocs, files, setFiles, progress, onDelete
}: any) {
    const isUploading = progress > 0 && progress < 100;

    // Filter documents from DB matching this type
    const relevantDocs = Array.isArray(existingDocs)
        ? existingDocs.filter((d: any) => d.fileName === type || d.originalFileName?.includes(type))
        : [];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles((prev: File[]) => [...prev, ...Array.from(e.target.files || [])]);
        }
        e.target.value = '';
    };

    const removePending = (idx: number) => setFiles((prev: File[]) => prev.filter((_, i) => i !== idx));

    return (
        <div className="flex flex-col gap-3 p-4 border rounded-xl bg-white dark:bg-card shadow-sm transition-all hover:shadow-md group relative overflow-hidden">
            {isUploading && <div className="absolute top-0 left-0 h-1 bg-blue-600 transition-all duration-300 z-20" style={{ width: `${progress}%` }} />}

            {/* Header Section */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{label}</span>
                        {relevantDocs.length > 0 && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200">Actif</Badge>}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Formats acceptés: PDF, Excel, Word, Images.</span>
                </div>

                <div className="relative">
                    <input type="file" multiple disabled={isUploading} className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
                    <Button variant="outline" size="sm" className="h-8 gap-2 bg-background hover:bg-accent text-xs font-medium">
                        {isUploading ? <IconLoader className="animate-spin w-3.5 h-3.5" /> : <IconCloudUpload className="w-3.5 h-3.5" />}
                        <span>Uploader</span>
                    </Button>
                </div>
            </div>

            {/* --- LISTE DES FICHIERS EXISTANTS (DB) --- */}
            {relevantDocs.length > 0 && (
                <div className="flex flex-col gap-2 mt-1">
                    {relevantDocs.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">

                            {/* File Info Left */}
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-600">
                                    <IconFileText size={20} />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <a href={`https://backoffice.urbagroupe.ma/${doc.fileUrl}`} target="_blank" className="text-sm font-medium truncate hover:underline text-foreground block max-w-[220px]" title={doc.originalFileName}>
                                        {doc.originalFileName}
                                    </a>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-1"><IconCalendar size={10} /> {formatDate(doc.createdAt)}</span>
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                        <span className="flex items-center gap-1"><IconDatabase size={10} /> {doc.size ? formatBytes(doc.size) : 'Taille inconnue'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Right */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    onClick={() => onDelete(doc.id)}
                                >
                                    <IconTrash size={16} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- LISTE DES FICHIERS EN ATTENTE (PENDING) --- */}
            {files.length > 0 && (
                <div className="flex flex-col gap-2 mt-1 animate-in fade-in slide-in-from-top-1">
                    {files.map((file: File, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-800">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-8 w-8 rounded-md bg-white dark:bg-blue-950 flex items-center justify-center shrink-0 border border-blue-100">
                                    <IconFileCheck size={16} className="text-blue-500" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100 truncate max-w-[200px]">{file.name}</span>
                                    <span className="text-[10px] text-blue-600 dark:text-blue-300">{formatBytes(file.size)} • Prêt à envoyer</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-700 hover:bg-blue-100 rounded-full" onClick={() => removePending(idx)}>
                                <IconX size={14} />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- MAIN SHEET COMPONENT ---
interface EditDocumentsSheetProps {
    project: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditDocumentsSheet({ project, open, onOpenChange }: EditDocumentsSheetProps) {
    // States Files
    const [filesCPS, setFilesCPS] = React.useState<File[]>([]);
    const [filesRC, setFilesRC] = React.useState<File[]>([]);
    const [filesAvis, setFilesAvis] = React.useState<File[]>([]);
    const [filesBPE, setFilesBPE] = React.useState<File[]>([]);
    const [filesTech, setFilesTech] = React.useState<File[]>([]);

    const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});

    // Mutations
    const [uploadDocument, { loading: uploading }] = useMutation(UPLOAD_DOCUMENT_MUTATION);

    const [deleteDocument, { loading: deleting }] = useMutation(DELETE_DOCUMENT_MUTATION, {
        onCompleted: () => toast.success("Document supprimé avec succès"),
        onError: (e) => toast.error(e.message),
        refetchQueries: [GET_PROJECTS_FEED]
    });

    const administrativeDocs = project.stages?.administrative?.documents || [];
    const technicalDocs = project.stages?.technical?.documents || [];

    // Helper Upload
    const handleFileUpload = async (file: File, docType: string, stageName: string) => {
        setUploadProgress(prev => ({ ...prev, [docType]: 1 }));
        try {
            let apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                ? 'http://localhost:5002'
                : 'https://backoffice.urbagroupe.ma';

            const result = await uploadFileWithProgress(file, `${apiBaseUrl}/api/upload/${project.id}`,
                (p) => setUploadProgress(prev => ({ ...prev, [docType]: p }))
            );

            await uploadDocument({
                variables: {
                    projectId: project.id,
                    stageName, docType,
                    originalFileName: file.name,
                    fileUrl: result.fileUrl,
                    // size: file.size // NOTE: Si l backend dyalk fih size zido hna
                }
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        } finally {
            setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
        }
    };

    // Bulk Save
    const handleSaveAll = async () => {
        let count = 0;
        const processFiles = async (files: File[], type: string, stage: string) => {
            for (const f of files) {
                const ok = await handleFileUpload(f, type, stage);
                if (ok) count++;
            }
        };

        await processFiles(filesCPS, 'CPS', 'administrative');
        await processFiles(filesRC, 'RC', 'administrative');
        await processFiles(filesAvis, 'Avis', 'administrative');
        await processFiles(filesBPE, 'BPE', 'administrative');
        await processFiles(filesTech, 'Fichier Technique', 'technical');

        if (count > 0) {
            toast.success(`${count} fichiers ajoutés avec succès.`);
            setFilesCPS([]); setFilesRC([]); setFilesAvis([]); setFilesBPE([]); setFilesTech([]);
            onOpenChange(false);
        } else {
            toast.info("Aucun nouveau fichier à sauvegarder.");
        }
    };

    const handleDelete = (docId: string, stageName: string) => {
        // Custom Confirmation Toast au lieu de window.confirm
        toast("Supprimer ce document ?", {
            action: {
                label: "Confirmer",
                onClick: () => deleteDocument({
                    variables: { projectId: project.id, documentId: docId, stageName }
                }),
            },
        });
    };

    const isLoading = uploading || deleting;
    const hasPendingFiles = [...filesCPS, ...filesRC, ...filesAvis, ...filesBPE, ...filesTech].length > 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl flex flex-col h-full p-0 gap-0 bg-muted/10">
                <SheetHeader className="p-6 pb-4 border-b bg-background">
                    <SheetTitle className="text-xl">Gestion des Documents</SheetTitle>
                    <SheetDescription>
                        Documents pour le projet <span className="font-semibold text-primary">{project.object || project.title}</span>.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 py-6">
                    <div className="flex flex-col gap-8 pb-10">
                        {/* Section Administrative */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700">Dossier Administratif</Badge>
                                <Separator className="flex-1" />
                            </div>
                            <DocumentRow
                                label="Cahier des Charges (CPS)" type="CPS"
                                existingDocs={administrativeDocs}
                                files={filesCPS} setFiles={setFilesCPS} progress={uploadProgress['CPS']}
                                onDelete={(id: string) => handleDelete(id, 'administrative')}
                            />
                            <DocumentRow
                                label="Règlement (RC)" type="RC"
                                existingDocs={administrativeDocs}
                                files={filesRC} setFiles={setFilesRC} progress={uploadProgress['RC']}
                                onDelete={(id: string) => handleDelete(id, 'administrative')}
                            />
                            <DocumentRow
                                label="Avis de Marché" type="Avis"
                                existingDocs={administrativeDocs}
                                files={filesAvis} setFiles={setFilesAvis} progress={uploadProgress['Avis']}
                                onDelete={(id: string) => handleDelete(id, 'administrative')}
                            />
                            <DocumentRow
                                label="Bordereau Prix (BPE)" type="BPE"
                                existingDocs={administrativeDocs}
                                files={filesBPE} setFiles={setFilesBPE} progress={uploadProgress['BPE']}
                                onDelete={(id: string) => handleDelete(id, 'administrative')}
                            />
                        </div>

                        {/* Section Technique */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">Dossier Technique</Badge>
                                <Separator className="flex-1" />
                            </div>
                            <DocumentRow
                                label="Fichier Technique / Plans" type="Fichier Technique"
                                existingDocs={technicalDocs}
                                files={filesTech} setFiles={setFilesTech} progress={uploadProgress['Fichier Technique']}
                                onDelete={(id: string) => handleDelete(id, 'technical')}
                            />
                        </div>
                    </div>
                </ScrollArea>

                <SheetFooter className="p-4 border-t bg-background flex items-center justify-between sm:justify-between gap-4">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                        {hasPendingFiles ? "Modifications non enregistrées" : "Dossier à jour"}
                    </span>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <SheetClose asChild><Button variant="outline" className="flex-1 sm:flex-none">Fermer</Button></SheetClose>
                        <Button onClick={handleSaveAll} disabled={isLoading || !hasPendingFiles} className="flex-1 sm:flex-none min-w-[140px]">
                            {uploading ? <><IconLoader className="mr-2 h-4 w-4 animate-spin" /> Traitement...</> : "Enregistrer tout"}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}