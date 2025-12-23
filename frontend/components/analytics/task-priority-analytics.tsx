"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export function TaskPriorityAnalytics({ tasks }: { tasks: any[] }) {

    const activeTasks = tasks.filter(t => t.status !== 'DONE');

    const data = [
        { name: 'Urgent', count: activeTasks.filter(t => t.priority === 'HIGH').length, color: '#e11d48' },
        { name: 'Normal', count: activeTasks.filter(t => t.priority === 'NORMAL').length, color: '#3b82f6' },
        { name: 'Faible', count: activeTasks.filter(t => t.priority === 'LOW').length, color: '#64748b' },
    ];

    return (
        <Card className="h-full border-border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Priorité des Tâches</CardTitle>
                <CardDescription>Tâches actives par niveau d'urgence</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                width={60}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    borderColor: "hsl(var(--border))",
                                    color: "hsl(var(--foreground))",
                                    borderRadius: "8px"
                                }}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}