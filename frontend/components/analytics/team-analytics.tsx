"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconDownload, IconUsers } from "@tabler/icons-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function TeamAnalytics({ projects, tasks }: { projects: any[], tasks: any[] }) {

    // Simple calculation logic for illustration
    const pmLoad: Record<string, number> = {};
    projects.forEach(p => {
        if (p.preparationStatus !== 'DONE' && p.preparationStatus !== 'NO') {
            p.projectManagers?.forEach((pm: any) => {
                const name = pm.name.split(' ')[0];
                pmLoad[name] = (pmLoad[name] || 0) + 1;
            });
        }
    });

    const data = Object.keys(pmLoad)
        .map(key => ({ name: key, value: pmLoad[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    return (
        <Card className="h-full flex flex-col shadow-sm border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <IconUsers className="h-4 w-4 text-primary" /> Charge Équipe
                    </CardTitle>
                    <CardDescription>Projets actifs par manager</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={70}
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#6366f1" fillOpacity={0.8 + (index * 0.05)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}