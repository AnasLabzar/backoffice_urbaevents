"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconDownload } from "@tabler/icons-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { downloadCSV } from "@/lib/analytics-helper";

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

    // Professional Palette (Triadic: Blue, Indigo, Teal, Amber, Rose)
    const COLORS = [
        '#3b82f6', // Blue 500
        '#6366f1', // Indigo 500
        '#10b981', // Emerald 500
        '#f59e0b', // Amber 500
        '#f43f5e', // Rose 500
        '#64748b'  // Slate 500
    ];

    const handleDownload = () => {
        const headers = ["Status", "Count"];
        const rows = data.map(d => [d.name, d.value]);
        downloadCSV("Status_Distribution", headers, rows);
    };

    // Calculate total for center text
    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="h-full flex flex-col shadow-sm border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Distribution</CardTitle>
                    <CardDescription>Par phase de projet</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleDownload} className="h-8 w-8">
                    <IconDownload className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={4}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                            itemStyle={{ color: 'var(--foreground)' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value, entry: any) => (
                                <span className="text-xs text-muted-foreground ml-1">{value}</span>
                            )}
                        />
                        {/* Center Text */}
                        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle">
                            <tspan x="50%" dy="0" fontSize="24" fontWeight="bold" fill="var(--foreground)">{total}</tspan>
                            <tspan x="50%" dy="20" fontSize="12" fill="var(--muted-foreground)">Projets</tspan>
                        </text>
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}