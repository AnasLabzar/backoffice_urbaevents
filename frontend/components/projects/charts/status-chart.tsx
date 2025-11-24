"use client";
import * as React from "react";
import { BarChart, Bar, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const STATUS_MAP: { [key: string]: { label: string; color: string } } = {
    DRAFT: { label: "Brouillon", color: "hsl(var(--chart-1))" },
    TO_CONFIRM: { label: "À Confirmer", color: "hsl(var(--chart-2))" },
    TO_PREPARE: { label: "À Préparer", color: "hsl(var(--chart-3))" },
    FEASIBILITY_PENDING: { label: "Attente Faisabilité", color: "hsl(var(--chart-4))" },
    CAUTION_PENDING: { label: "Attente Caution", color: "hsl(var(--chart-5))" },
    IN_PRODUCTION: { label: "En Production", color: "hsl(var(--chart-6))" },
    DONE: { label: "Terminé", color: "hsl(var(--chart-7))" },
    CANCELED: { label: "Annulé", color: "hsl(var(--chart-8))" },
    NO: { label: "Refusé", color: "hsl(var(--chart-8))" },
    UNKNOWN: { label: "Inconnu", color: "hsl(var(--muted))" },
};

const chartConfig = Object.entries(STATUS_MAP).reduce((acc, [key, value]) => {
    acc[key] = { label: value.label, color: value.color };
    return acc;
}, {} as ChartConfig);

export function ProjectsStatusChart({ data }: { data: any[] }) {
    const chartData = React.useMemo(() => {
        const counts = data.reduce((acc, item) => {
            const statusKey = item.project.preparationStatus || "UNKNOWN";
            acc[statusKey] = (acc[statusKey] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        return Object.entries(counts).map(([statusKey, count]) => ({
            name: STATUS_MAP[statusKey]?.label || statusKey,
            value: count,
            fill: STATUS_MAP[statusKey]?.color || STATUS_MAP["UNKNOWN"].color,
        }));
    }, [data]);

    return (
        <ChartContainer config={chartConfig} className="h-60 w-full">
            <BarChart data={chartData} margin={{ bottom: 50, right: 10, left: 10 }}>
                <XAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                <YAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" radius={4}>
                    {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
}