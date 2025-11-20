"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconDownload, IconChartPie } from "@tabler/icons-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { downloadCSV } from "@/lib/analytics-utils";

// Professional Palette that works in Dark & Light mode
// (Tailwind 500/600 shades pop well on dark backgrounds)
const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#f43f5e', // Rose
    '#64748b', // Slate
];

export function WorkflowStats({ projects }: { projects: any[] }) {

    const data = projects.reduce((acc: any[], curr) => {
        const status = curr.preparationStatus || "DRAFT";
        const existing = acc.find(i => i.name === status);
        if (existing) existing.value += 1;
        else acc.push({ name: status.replace('_', ' '), value: 1 });
        return acc;
    }, []);

    const handleDownload = () => {
        const headers = ["Project Title", "Preparation Status", "General Status"];
        const rows = projects.map(p => [p.title, p.preparationStatus, p.generalStatus]);
        downloadCSV("Workflow_Status_Report", headers, rows);
    };

    return (
        <Card className="h-full flex flex-col shadow-sm border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <IconChartPie className="h-5 w-5 text-primary" /> État des Projets
                    </CardTitle>
                    <CardDescription>Distribution par phase</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleDownload}>
                    <IconDownload className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            // Inner radius creates the "Donut" look, easier to read
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                            // 'stroke-card' makes the gaps match the background color (Dark or Light)
                            stroke="hsl(var(--card))"
                            strokeWidth={2}
                        >
                            {data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>

                        {/* Tooltip Styling:
                           We use CSS variables here so it adapts to Dark/Light mode automatically 
                        */}
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                color: "hsl(var(--foreground))"
                            }}
                            itemStyle={{ color: "hsl(var(--foreground))" }}
                        />

                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value) => (
                                <span className="text-sm text-muted-foreground">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}