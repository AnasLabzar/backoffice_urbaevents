"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ProjectsStats } from "@/components/projects-stats";
import { calculateProjectStats } from "./utils";

interface ProjectMetricsProps {
    projects: any[];
    loading: boolean;
}

export function ProjectMetrics({ projects, loading }: ProjectMetricsProps) {
    const stats = React.useMemo(() => calculateProjectStats(projects), [projects]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
            {/* Left Side: Chart */}
            <div className="lg:col-span-2 h-full">
                {loading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                ) : (
                    <ChartAreaInteractive projects={projects} />
                )}
            </div>

            {/* Right Side: Stats Card */}
            <div className="lg:col-span-1 h-full">
                {loading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                ) : (
                    <ProjectsStats
                        className="h-full"
                        total={stats.total}
                        inProgress={stats.inProgress}
                        completed={stats.completed}
                        pending={stats.pending}
                    />
                )}
            </div>
        </div>
    );
}