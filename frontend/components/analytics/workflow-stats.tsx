"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconDownload, IconChartPie } from "@tabler/icons-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { downloadCSV } from "@/lib/analytics-utils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function WorkflowStats({ projects }: { projects: any[] }) {

    const data = projects.reduce((acc: any[], curr) => {
        const status = curr.preparationStatus || "DRAFT";
        const existing = acc.find(i => i.name === status);
        if (existing) existing.value += 1;
        else acc.push({ name: status, value: 1 });
        return acc;
    }, []);

    const handleDownload = () => {
        const headers = ["Project Title", "Preparation Status", "General Status"];
        const rows = projects.map(p => [p.title, p.preparationStatus, p.generalStatus]);
        downloadCSV("Workflow_Status_Report", headers, rows);
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <IconChartPie className="h-5 w-5 text-blue-500" /> État des Projets
                    </CardTitle>
                    <CardDescription>Distribution par phase</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                    <IconDownload className="h-4 w-4 mr-2" /> Export
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}