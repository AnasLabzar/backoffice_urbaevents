"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconDownload, IconTrendingUp } from "@tabler/icons-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { downloadCSV, getCreatedAtFromId } from "@/lib/analytics-helper";

export function FinancialAnalytics({ projects }: { projects: any[] }) {

    // Process Data
    const chartData = projects.reduce((acc: any[], curr) => {
        const date = getCreatedAtFromId(curr.id);
        const month = date.toLocaleString('default', { month: 'short' });
        const existing = acc.find(i => i.name === month);

        if (existing) {
            existing.budget += (curr.estimatedBudget || 0);
            existing.caution += (curr.cautionAmount || 0);
        } else {
            acc.push({ name: month, budget: curr.estimatedBudget || 0, caution: curr.cautionAmount || 0 });
        }
        return acc;
    }, []).slice(-6);

    const handleDownload = () => {
        const headers = ["Project", "Date", "Budget", "Caution"];
        const rows = projects.map(p => [p.title, getCreatedAtFromId(p.id).toLocaleDateString(), p.estimatedBudget, p.cautionAmount]);
        downloadCSV("Financial_Report", headers, rows);
    };

    // Professional Colors
    const COLOR_BUDGET = "#10b981"; // Emerald 500
    const COLOR_CAUTION = "#f59e0b"; // Amber 500

    return (
        <Card className="h-full flex flex-col shadow-sm border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        Performance Financière
                        <span className="text-xs font-normal text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center">
                            <IconTrendingUp className="w-3 h-3 mr-1" /> +4.5%
                        </span>
                    </CardTitle>
                    <CardDescription>Comparatif Budget vs Cautions (6 mois)</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleDownload} className="h-8 w-8">
                    <IconDownload className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 0, left: -15, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLOR_BUDGET} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={COLOR_BUDGET} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCaution" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLOR_CAUTION} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={COLOR_CAUTION} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            stroke="var(--muted-foreground)"
                        />
                        <YAxis
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                            stroke="var(--muted-foreground)"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                            itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                        />
                        <Legend verticalAlign="top" align="right" iconType="circle" height={36} />

                        <Area
                            name="Budget Estimé"
                            type="monotone"
                            dataKey="budget"
                            stroke={COLOR_BUDGET}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorBudget)"
                        />
                        <Area
                            name="Cautions"
                            type="monotone"
                            dataKey="caution"
                            stroke={COLOR_CAUTION}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCaution)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}