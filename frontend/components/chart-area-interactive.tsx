"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
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

interface ProjectFeedItem {
  project: {
    id: string;
    createdAt?: string;
    generalStatus?: string;
    status?: string;
    title: string;
  }
}

interface ChartProps {
  projects: ProjectFeedItem[];
}

// CONFIG: Using CSS Variables for perfect Dark/Light adaptation
const chartConfig = {
  visitors: { label: "Total Projects" },
  inProgress: {
    label: "In Progress",
    color: "var(--border)" // Subtle Gray
  },
  done: {
    label: "Done",
    color: "var(--ring)" // Primary/White
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ projects = [] }: ChartProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  // --- HELPER 1: EXTRACT DATE ---
  const getProjectDate = (project: ProjectFeedItem['project']) => {
    if (project.createdAt) return new Date(project.createdAt);
    if (project.id && project.id.length === 24) {
      const timestamp = parseInt(project.id.substring(0, 8), 16) * 1000;
      return new Date(timestamp);
    }
    return null;
  };

  // --- HELPER 2: FILL MISSING DAYS ---
  const fillMissingDays = (sparseData: Record<string, any>, daysToLookBack: number) => {
    const filledData = [];
    const today = new Date();

    for (let i = daysToLookBack; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];

      if (sparseData[dateKey]) {
        filledData.push(sparseData[dateKey]);
      } else {
        filledData.push({ date: dateKey, done: 0, inProgress: 0 });
      }
    }
    return filledData;
  };

  const chartData = React.useMemo(() => {
    const sparseData: Record<string, { date: string; done: number; inProgress: number }> = {};

    projects.forEach((item) => {
      const dateObj = getProjectDate(item.project);
      if (!dateObj || isNaN(dateObj.getTime())) return;

      const dateKey = dateObj.toISOString().split("T")[0];

      if (!sparseData[dateKey]) {
        sparseData[dateKey] = { date: dateKey, done: 0, inProgress: 0 };
      }

      // @ts-ignore
      const status = (item.project.status || item.project.generalStatus || "IN_PROGRESS").toUpperCase();
      const isDone = ["DONE", "COMPLETED", "ARCHIVED", "DELIVERED", "VALIDATED", "ACCEPTED"].includes(status);

      if (isDone) sparseData[dateKey].done += 1;
      else sparseData[dateKey].inProgress += 1;
    });

    let daysToLookBack = 90;
    if (timeRange === "30d") daysToLookBack = 30;
    if (timeRange === "7d") daysToLookBack = 7;

    return fillMissingDays(sparseData, daysToLookBack);
  }, [projects, timeRange]);

  const totalDone = chartData.reduce((acc, curr) => acc + curr.done, 0);
  const totalInProgress = chartData.reduce((acc, curr) => acc + curr.inProgress, 0);

  return (
    // 1. RESTORED CONTAINER: Removed "border-none shadow-none bg-transparent"
    // This brings back the Card look (Border + Background)
    <Card className="h-auto w-full">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Project Evolution</CardTitle>
          <CardDescription>Showing created projects statistics</CardDescription>
        </div>
        <div className="flex gap-4 items-center">
          {/* Stats Display */}
          <div className="flex gap-4 text-sm mr-4 hidden md:flex">
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground text-xs">Done</span>
              <span className="font-bold" style={{ color: "var(--ring)" }}>{totalDone}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground text-xs">In Progress</span>
              <span className="font-bold" style={{ color: "var(--border)" }}>{totalInProgress}</span>
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
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-full min-h-[300px]">
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart data={chartData}>
            <defs>
              {/* 2. STRONGER GRADIENTS: Increased stopOpacity to 0.5 and 0.8 to match the "Fake Data" look */}
              <linearGradient id="fillDone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-done)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-done)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillInProgress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-inProgress)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--color-inProgress)" stopOpacity={0.1} />
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

            {/* 3. THICKER LINES: Added strokeWidth={2} for better visibility */}
            <Area
              dataKey="inProgress"
              type="natural"
              fill="url(#fillInProgress)"
              fillOpacity={1}
              stroke="var(--color-inProgress)"
              strokeWidth={2}
              stackId="a"
            />

            <Area
              dataKey="done"
              type="natural"
              fill="url(#fillDone)"
              fillOpacity={1}
              stroke="var(--color-done)"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}