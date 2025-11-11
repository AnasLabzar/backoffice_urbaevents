"use client";

import React, { useState } from 'react';
import { IconUpload, IconFile, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Label } from './label';
import { Input } from './input';

interface FileUploadProps {
    onFileSelect: (file: File | null) => void;
    disabled?: boolean;
    label: string; // (e.g., "CPS (Requis)")
}

export function FileUpload({ onFileSelect, disabled, label }: FileUploadProps) {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // N-7bsso l-comportement l-3adi dyal l-browser
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled) return;
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    // Mli y-dropi l-fichier
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled) return;
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setFileName(file.name);
            onFileSelect(file);
        }
    };

    // Mli y-clicki o y-3zl
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            onFileSelect(file);
        }
    };

    // Mli ybghi yms7 l-fichier li 3zl
    const handleRemoveFile = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setFileName(null);
        onFileSelect(null);
        // N-reset l-input
        const input = document.getElementById(label) as HTMLInputElement;
        if (input) input.value = "";
    };

    // Ila déja 3zl fichier
    if (fileName) {
        return (
            <div className="flex flex-col gap-2">
                <Label htmlFor={label}>{label}</Label>
                <div className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <IconFile className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{fileName}</span>
                    </div>
                    {!disabled && (
                        <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-6 w-6">
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
                    disabled && "cursor-not-allowed opacity-50"
                )}
            >
                <IconUpload className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOCX (Max 10MB)</p>

                {/* L-Input l-mkhbi */}
                <Input
                    id={label}
                    type="file"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={handleChange}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}