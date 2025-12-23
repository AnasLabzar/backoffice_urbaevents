"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

// 1. Professional Currency Formatter
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        maximumFractionDigits: 0,
    }).format(value);
};

// 2. Custom Tooltip - Fully Adapted for Dark/Light
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            // Changed: Used standard semantic classes (bg-popover, border-border) 
            // Removed manual rings/shadows that might clash in dark mode
            <div className="rounded-lg border border-border bg-popover p-3 shadow-xl">
                <p className="mb-2 text-sm font-medium text-popover-foreground">{label}</p>
                <div className="flex flex-col gap-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-muted-foreground w-20">
                                {entry.name}:
                            </span>
                            <span className="text-sm font-bold text-foreground">
                                {formatCurrency(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export function FinancialAnalytics({ projects, detailed }: { projects: any[], detailed?: boolean }) {
    const data = projects
        .filter(p => p.estimatedBudget > 0 || p.marketEstimate > 0)
        .slice(0, detailed ? 15 : 7)
        .map(p => ({
            name: p.projectCode || p.title.substring(0, 8) + '...',
            fullName: p.title, 
            Budget: p.estimatedBudget || 0,
            Estimé: p.marketEstimate || 0,
        }));

    return (
        <Card className="h-full border-border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Performance Financière</CardTitle>
                <CardDescription>Budget Client vs Estimation Marché</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            
                            {/* 3. Grid: Uses --border for subtle lines in both modes */}
                            <CartesianGrid
                                strokeDasharray="4 4"
                                vertical={false}
                                stroke="hsl(var(--border))" 
                            />

                            {/* 4. Axes: tickLine/axisLine false creates a clean look. 
                                   Colors use --muted-foreground for accessibility. */}
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                            />

                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />

                            {/* 5. Tooltip Cursor: A semi-transparent muted color */}
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                                content={<CustomTooltip />}
                            />

                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => (
                                    <span className="text-sm font-medium text-muted-foreground ml-1">
                                        {value}
                                    </span>
                                )}
                            />

                            {/* 6. Bars: Using HSL variables allows the theme to control brightness.
                                   --primary: Usually your brand color (Blue/Black)
                                   --emerald-500: Tailwind color converted to variable usage, 
                                   or you can use `fill="#10b981"` which is safe in dark mode too. */}
                            <Bar
                                dataKey="Budget"
                                name="Budget Client"
                                fill="hsl(var(--primary))" 
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                            <Bar
                                dataKey="Estimé"
                                name="Estimation Marché"
                                fill="#10b981" 
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}