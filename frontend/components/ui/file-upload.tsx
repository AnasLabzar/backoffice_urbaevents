"use client";

import React, { useState } from 'react';
import { IconUpload, IconFile, IconX, IconLoader } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Label } from './label';
import { Input } from './input';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

interface FileUploadProps {
    onFileSelect: (file: File | null) => void;
    disabled?: boolean;
    label: string;
}

// --- L-MODIFICATION BDAT HNA ---
// Tlle3na l-limite l-1GB (bach t-matchi m3a l-backend)
const MAX_FILE_SIZE_MB = 1024;
// --- L-MODIFICATION SALAT HNA ---

const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function FileUpload({ onFileSelect, disabled, label }: FileUploadProps) {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleFile = async (file: File) => {
        // 4a. Checki l-taille (Daba kay-checki 1GB)
        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`Erreur: L-fichier kbber mn ${MAX_FILE_SIZE_MB}MB`, {
                description: `Taille dyal l-fichier: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
            });
            onFileSelect(null);
            setFileName(null);
            return;
        }

        // 4b. Optimisi t-tswira ila kant tswira
        const imageTypes = ['image/jpeg', 'image/png'];
        if (imageTypes.includes(file.type)) {
            setIsLoading(true);
            toast.info("Optimisation dyal t-tswira...", {
                description: `Taille l-qdima: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
            });

            try {
                const options = {
                    maxSizeMB: 5, // N-sghroha l-5MB max (Kif kant, hada mzyan)
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                };
                const compressedFile = await imageCompression(file, options);

                toast.success("T-tswira optimisée!", {
                    description: `Taille l-jdida: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
                });

                setFileName(compressedFile.name);
                onFileSelect(compressedFile);

            } catch (error) {
                toast.warning("Ma qdernach n-optimisiw t-tswira. Ghadi n-siftoha kifma hiya.");
                setFileName(file.name);
                onFileSelect(file);
            } finally {
                setIsLoading(false);
            }
        } else {
            // 4c. Ila ماشي tswira (PDF, ZIP, ...), ghir sifto
            // Daba ghay-accepti fichier PDF dyal 70MB 3adi
            setFileName(file.name);
            onFileSelect(file);
        }
    };

    // ... (L-code dyal drag/drop b7al b7al) ...
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled || isLoading) return;
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled || isLoading) return;
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleRemoveFile = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (isLoading) return;
        setFileName(null);
        onFileSelect(null);
        const input = document.getElementById(label) as HTMLInputElement;
        if (input) input.value = "";
    };

    // ... (L-code dyal l-affichage b7al b7al) ...
    if (fileName) {
        return (
            <div className="flex flex-col gap-2">
                <Label htmlFor={label}>{label}</Label>
                <div className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {isLoading ? (
                            <IconLoader className="h-5 w-5 flex-shrink-0 animate-spin text-muted-foreground" />
                        ) : (
                            <IconFile className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{fileName}</span>
                    </div>
                    {!disabled && (
                        <Button variant="ghost" size="icon" onClick={handleRemoveFile} disabled={isLoading} className="h-6 w-6">
                            <IconX className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // L-Blassa dyal l-upload (khawia)
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={label}>{label}</Label>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-6 transition-colors hover:border-primary/50",
                    isDragging && "border-primary bg-primary/10",
                    (disabled || isLoading) && "cursor-not-allowed opacity-50"
                )}
            >
                <IconUpload className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </p>

                {/* --- L-MODIFICATION BDAT HNA --- */}
                {/* Bddelna l-text hna l- ${MAX_FILE_SIZE_MB}MB */}
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOCX (Max {MAX_FILE_SIZE_MB}MB)</p>
                {/* --- L-MODIFICATION SALAT HNA --- */}


                {/* L-Input l-mkhbi */}
                <Input
                    id={label}
                    type="file"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={handleChange}
                    disabled={disabled || isLoading}
                />
            </div>
        </div>
    );
}