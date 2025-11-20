"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
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

// --- CONFIG: Matches ChartAreaInteractive Colors ---
const chartConfig = {
    visitors: { label: "Total Assignments" },
    technical: {
        label: "Creative Team",
        // Using var(--ring) to match the white/bright line of the other chart
        color: "var(--ring)",
    },
    management: {
        label: "Management",
        // Using var(--border) to match the gray line of the other chart
        color: "var(--border)",
    },
} satisfies ChartConfig

export function StructureChart({ data = [] }: StructureChartProps) {
    const [timeRange, setTimeRange] = React.useState("90d")

    // --- HELPER: Extract Date safely ---
    const getProjectDate = (item: any) => {
        if (!item) return null;
        if (item.createdAt) return new Date(item.createdAt);
        if (item.id && item.id.length === 24) {
            const timestamp = parseInt(item.id.substring(0, 8), 16) * 1000;
            return new Date(timestamp);
        }
        return new Date();
    };

    // --- HELPER: Process Data ---
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

        // Fill missing days
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

    return (
        <Card className="h-full flex flex-col w-full shadow-sm border-border/60">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1 text-center sm:text-left">
                    <CardTitle>Team Workload</CardTitle>
                    <CardDescription>Resource allocation history</CardDescription>
                </div>

                <div className="flex gap-4 items-center">
                    {/* Summary Stats in Header */}
                    <div className="flex gap-4 text-sm mr-4 hidden md:flex">
                        <div className="flex flex-col items-end">
                            <span className="text-muted-foreground text-xs">Creative</span>
                            {/* Uses --ring (Bright/White) */}
                            <span className="font-bold" style={{ color: "var(--ring)" }}>{totalTechnical}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-muted-foreground text-xs">Management</span>
                            {/* Uses --border (Gray) */}
                            <span className="font-bold" style={{ color: "var(--border)" }}>{totalManagement}</span>
                        </div>
                    </div>

                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto">
                            <SelectValue placeholder="Last 3 months" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-2 pt-4 sm:px-6 sm:pt-6 min-h-0">
                <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
                    <AreaChart data={chartData}>
                        <defs>
                            {/* GRADIENTS: Matched Opacity 0.8 to 0.1 */}
                            <linearGradient id="fillTechnical" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-technical)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-technical)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillManagement" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-management)" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="var(--color-management)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <ChartLegend content={<ChartLegendContent />} />

                        {/* AREA: Matched strokeWidth={2} */}
                        <Area
                            dataKey="management"
                            type="monotone"
                            fill="url(#fillManagement)"
                            fillOpacity={1}
                            stroke="var(--color-management)"
                            strokeWidth={2}
                            stackId="a"
                        />
                        <Area
                            dataKey="technical"
                            type="monotone"
                            fill="url(#fillTechnical)"
                            fillOpacity={1}
                            stroke="var(--color-technical)"
                            strokeWidth={2}
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}