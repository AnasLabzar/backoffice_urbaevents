"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconDownload } from "@tabler/icons-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { downloadCSV } from "@/lib/analytics-helper"; // Ensure this helper exists or remove download

export function StatusAnalytics({ projects }: { projects: any[] }) {

    const counts = projects.reduce((acc: any, curr) => {
        const status = curr.preparationStatus || "DRAFT";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const data = Object.keys(counts).map(key => ({
        name: key.replace('_', ' '),
        value: counts[key]
    }));

    const COLORS = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];

    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="h-full flex flex-col shadow-sm border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Distribution</CardTitle>
                    <CardDescription>Par phase de projet</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="hsl(var(--card))"
                            strokeWidth={2}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                            <tspan x="50%" dy="-10" fontSize="24" fontWeight="bold" fill="hsl(var(--foreground))">{total}</tspan>
                            <tspan x="50%" dy="20" fontSize="12" fill="hsl(var(--muted-foreground))">Projets</tspan>
                        </text>
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}