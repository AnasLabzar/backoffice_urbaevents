"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, subMonths, isValid } from "date-fns";
import { fr } from "date-fns/locale";

// 1. Custom Tooltip for Professional Look & Dark Mode
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border border-border bg-popover p-3 shadow-lg ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-sm">
                <p className="mb-1 text-sm font-medium text-muted-foreground capitalize">
                    {label}
                </p>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <p className="text-lg font-bold text-popover-foreground">
                        {payload[0].value} <span className="text-sm font-normal text-muted-foreground">projets</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function ProjectTrendAnalytics({ projects }: { projects: any[] }) {

    // Generate buckets for last 6 months
    const getLast6Months = () => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            months.push({
                name: format(date, 'MMM', { locale: fr }),
                fullDate: format(date, 'MMMM yyyy', { locale: fr }), // Added for better tooltip context
                key: format(date, 'yyyy-MM'),
                projets: 0
            });
        }
        return months;
    };

    const data = getLast6Months();

    // Fill data
    projects.forEach(p => {
        if (p.createdAt) {
            let dateObj;
            if (typeof p.createdAt === 'string' && /^\d+$/.test(p.createdAt)) {
                dateObj = new Date(parseInt(p.createdAt));
            } else {
                dateObj = new Date(p.createdAt);
            }

            if (isValid(dateObj)) {
                const dateKey = format(dateObj, 'yyyy-MM');
                const monthData = data.find(d => d.key === dateKey);
                if (monthData) monthData.projets += 1;
            }
        }
    });

    return (
        <Card className="h-full border-border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Tendance des Projets</CardTitle>
                <CardDescription>Nouveaux projets sur les 6 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                {/* 2. Dynamic Gradient using CSS Variables */}
                                <linearGradient id="colorProjets" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            {/* 3. Subtle Dashed Grid */}
                            <CartesianGrid
                                strokeDasharray="4 4"
                                vertical={false}
                                stroke="hsl(var(--muted-foreground))"
                                strokeOpacity={0.2}
                            />

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
                                allowDecimals={false}
                                tickFormatter={(value) => `${value}`}
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />

                            <Area
                                type="monotone"
                                dataKey="projets"
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorProjets)"
                                activeDot={{
                                    r: 6,
                                    strokeWidth: 4,
                                    stroke: "hsl(var(--background))",
                                    fill: "hsl(var(--primary))"
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}