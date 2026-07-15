"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import { motion } from "framer-motion"
import { IconUsersGroup, IconTrendingUp } from "@tabler/icons-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from "@/components/ui/chart"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface StructureChartProps {
    data: any[];
}

const chartConfig = {
    visitors: { label: "Total Assignments" },
    technical: {
        label: "Creative Team",
        color: "var(--ring)",
    },
    management: {
        label: "Management",
        color: "var(--border)",
    },
} satisfies ChartConfig

export function StructureChart({ data = [] }: StructureChartProps) {
    const isMobile = useIsMobile()
    const [timeRange, setTimeRange] = React.useState("30d")

    React.useEffect(() => {
        if (isMobile) {
            setTimeRange("7d")
        }
    }, [isMobile])

    const getProjectDate = (item: any) => {
        if (!item) return null;
        if (item.createdAt) return new Date(item.createdAt);
        if (item.id && item.id.length === 24) {
            const timestamp = parseInt(item.id.substring(0, 8), 16) * 1000;
            return new Date(timestamp);
        }
        return new Date();
    };

    const chartData = React.useMemo(() => {
        const sparseData: Record<string, { date: string; technical: number; management: number }> = {};

        data.forEach((item) => {
            const dateObj = getProjectDate(item);
            if (!dateObj) return;

            const dateKey = dateObj.toISOString().split("T")[0];

            if (!sparseData[dateKey]) {
                sparseData[dateKey] = { date: dateKey, technical: 0, management: 0 };
            }

            const hasCreative = (item.team?.infographistes?.length || 0) > 0 || (item.team?.team3D?.length || 0) > 0;
            const hasPM = (item.projectManagers?.length || 0) > 0;

            if (hasCreative) sparseData[dateKey].technical += 1;
            if (hasPM) sparseData[dateKey].management += 1;
        });

        const filledData = [];
        const today = new Date();

        let daysToLookBack = 90;
        if (timeRange === "30d") daysToLookBack = 30;
        if (timeRange === "7d") daysToLookBack = 7;

        for (let i = daysToLookBack; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split("T")[0];

            if (sparseData[dateKey]) {
                filledData.push(sparseData[dateKey]);
            } else {
                filledData.push({ date: dateKey, technical: 0, management: 0 });
            }
        }

        return filledData;
    }, [data, timeRange]);

    const totalManagement = chartData.reduce((acc, curr) => acc + curr.management, 0);
    const totalTechnical = chartData.reduce((acc, curr) => acc + curr.technical, 0);

    const hasActivity = totalManagement > 0 || totalTechnical > 0;

    return (
        <div className="h-full w-full flex flex-col">
            <Card className="h-full flex flex-col w-full bg-card border-border/40 shadow-sm rounded-xl overflow-hidden relative">
                <CardHeader className="flex items-center gap-2 space-y-0 border-b border-border/40 py-4 sm:flex-row bg-muted/10 relative z-10">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="h-8 w-8 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <IconUsersGroup size={18} />
                        </div>
                        <div className="grid gap-0.5 text-left">
                            <CardTitle className="text-base font-semibold tracking-tight">Team Workload</CardTitle>
                            <CardDescription className="text-[11px] font-medium text-muted-foreground">Resource allocation history</CardDescription>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="flex gap-4 text-sm mr-2 hidden md:flex">
                            <div className="flex flex-col items-end justify-center px-2">
                                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Creative</span>
                                <span className="text-sm font-semibold text-purple-500 leading-none">{totalTechnical}</span>
                            </div>
                            <div className="flex flex-col items-end justify-center px-2 border-l border-border/50">
                                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Management</span>
                                <span className="text-sm font-semibold text-indigo-500 leading-none">{totalManagement}</span>
                            </div>
                        </div>

                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[140px] h-8 text-xs rounded-md border-border/60 bg-background shadow-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-md border-border/60">
                                <SelectItem value="90d" className="text-xs">Last 3 months</SelectItem>
                                <SelectItem value="30d" className="text-xs">Last 30 days</SelectItem>
                                <SelectItem value="7d" className="text-xs">Last 7 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

            <CardContent className="flex-1 px-0 pt-6 pb-2 min-h-[300px] relative z-10">
                {!hasActivity ? (
                    <div className="h-full w-full relative">
                        {/* Ghost Chart for Empty State */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none px-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[
                                    { date: '1', val: 5 }, { date: '2', val: 10 }, { date: '3', val: 8 },
                                    { date: '4', val: 15 }, { date: '5', val: 12 }, { date: '6', val: 20 }, { date: '7', val: 18 }
                                ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                                    <Area type="monotone" dataKey="val" stroke="currentColor" strokeWidth={2} fill="currentColor" fillOpacity={0.05} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Clean Empty State Message */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center bg-card/80 backdrop-blur-md border border-border/50 px-6 py-4 rounded-xl shadow-sm">
                                <IconTrendingUp size={24} className="text-muted-foreground mb-2 opacity-50" />
                                <p className="text-sm font-semibold text-foreground">No workload data</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Team allocation is currently empty.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <ChartContainer
                        config={chartConfig}
                        className="aspect-auto h-full w-full px-4"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="fillTechnical" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="fillManagement" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                                
                                <YAxis 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickMargin={10}
                                    tickFormatter={(value) => `${value}`}
                                    className="text-[10px] font-medium text-muted-foreground opacity-50"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={12}
                                    minTickGap={32}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    className="text-[10px] font-medium text-muted-foreground opacity-70"
                                />
                                <ChartTooltip 
                                    cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.1 }} 
                                    content={<ChartTooltipContent indicator="line" className="bg-card border border-border/50 shadow-md rounded-lg text-xs" />} 
                                />
                                <ChartLegend content={<ChartLegendContent />} verticalAlign="top" height={36} className="opacity-80" />

                                <Area
                                    dataKey="management"
                                    type="monotone"
                                    fill="url(#fillManagement)"
                                    fillOpacity={1}
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    stackId="a"
                                    activeDot={{ r: 4, fill: "#6366f1", stroke: "var(--background)", strokeWidth: 2 }}
                                />
                                <Area
                                    dataKey="technical"
                                    type="monotone"
                                    fill="url(#fillTechnical)"
                                    fillOpacity={1}
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    stackId="b"
                                    activeDot={{ r: 4, fill: "#a855f7", stroke: "var(--background)", strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
        </div>
    )
}