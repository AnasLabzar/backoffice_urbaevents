"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconDownload, IconUsers } from "@tabler/icons-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { downloadCSV } from "@/lib/analytics-helper";

export function TeamAnalytics({ projects }: { projects: any[] }) {

    const pmLoad: Record<string, number> = {};
    projects.forEach(p => {
        if (p.preparationStatus !== 'DONE' && p.preparationStatus !== 'NO') {
            p.projectManagers?.forEach((pm: any) => {
                const name = pm.name.split(' ')[0]; // First name only
                pmLoad[name] = (pmLoad[name] || 0) + 1;
            });
        }
    });

    const data = Object.keys(pmLoad)
        .map(key => ({ name: key, value: pmLoad[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    const handleDownload = () => {
        const headers = ["Manager", "Active Projects"];
        const rows = Object.keys(pmLoad).map(k => [k, pmLoad[k]]);
        downloadCSV("Team_Load", headers, rows);
    };

    return (
        <Card className="h-full flex flex-col shadow-sm border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <IconUsers className="h-4 w-4 text-indigo-500" /> Charge Équipe
                    </CardTitle>
                    <CardDescription>Projets actifs par manager</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleDownload} className="h-8 w-8">
                    <IconDownload className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    {/* Layout Vertical for better name readability */}
                    <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={70}
                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontWeight: 500 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                            {data.map((entry, index) => (
                                // Gradient effect on bars
                                <Cell key={`cell-${index}`} fill="#6366f1" fillOpacity={0.8 + (index * 0.05)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}