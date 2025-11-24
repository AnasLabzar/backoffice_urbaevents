"use client";

import React, { useState } from "react";
import { ColumnFiltersState } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";

// ✅ FIX: Import from the specific 'table' folder we created
import { DataTable } from "./table/data-table";
import { columns } from "./table/columns";

interface ProjectListProps {
    data: any[]; // The raw feed items
    loading: boolean;
    error?: Error;
}

export function ProjectList({ data, loading, error }: ProjectListProps) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    if (loading) {
        return (
            <div className="w-full mt-8">
                <h2 className="text-xl font-semibold mb-4 px-1">Liste des Projets</h2>
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full mt-8 p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">
                Erreur de chargement: {error.message}
            </div>
        );
    }

    return (
        <div className="w-full mt-8">
            <h2 className="text-xl font-semibold mb-4 px-1">Liste des Projets</h2>
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden py-8">
                <DataTable
                    columns={columns}
                    data={data}
                    columnFilters={columnFilters}
                    onColumnFiltersChange={setColumnFilters}
                />
            </div>
        </div>
    );
}