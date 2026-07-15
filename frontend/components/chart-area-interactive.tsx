"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IconChartLine, IconTrendingUp } from "@tabler/icons-react"

interface ProjectData {
  id: string;
  createdAt?: string;
  generalStatus?: string;
  status?: string;
  title: string;
}

interface ChartProps {
  projects?: ProjectData[];
}

const chartConfig = {
  visitors: { label: "Total" },
  inProgress: { label: "En Cours", color: "hsl(var(--primary))" },
  done: { label: "Terminé", color: "hsl(var(--emerald-500, 160 84% 39%))" }, // Fallback to emerald
} satisfies ChartConfig

export function ChartAreaInteractive({ projects = [] }: ChartProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  // --- CHANGE 1: Effect to set default to 7d on mobile ---
  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const getProjectDate = (project: ProjectData) => {
    if (!project) return null;
    if (project.createdAt) return new Date(project.createdAt);
    if (project.id && project.id.length === 24) {
      const timestamp = parseInt(project.id.substring(0, 8), 16) * 1000;
      return new Date(timestamp);
    }
    return null;
  };

  const fillMissingDays = (sparseData: Record<string, any>, daysToLookBack: number) => {
    const filledData = [];
    const today = new Date();
    for (let i = daysToLookBack; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      if (sparseData[dateKey]) filledData.push(sparseData[dateKey]);
      else filledData.push({ date: dateKey, done: 0, inProgress: 0 });
    }
    return filledData;
  };

  const chartData = React.useMemo(() => {
    const sparseData: Record<string, { date: string; done: number; inProgress: number }> = {};
    projects.forEach((item) => {
      if (!item) return;
      const dateObj = getProjectDate(item);
      if (!dateObj || isNaN(dateObj.getTime())) return;
      const dateKey = dateObj.toISOString().split("T")[0];
      if (!sparseData[dateKey]) sparseData[dateKey] = { date: dateKey, done: 0, inProgress: 0 };

      const status = (item.status || item.generalStatus || "IN_PROGRESS").toUpperCase();
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

  // Check if we have actual activity
  const hasActivity = totalDone > 0 || totalInProgress > 0;

  return (
    <div className="h-full w-full flex flex-col">
      <Card className="h-full flex flex-col w-full bg-card border-border/40 shadow-sm rounded-xl overflow-hidden relative">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b border-border/40 py-4 sm:flex-row bg-muted/10 relative z-10">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <IconChartLine size={18} />
            </div>
            <div className="grid gap-0.5 text-left">
              <CardTitle className="text-base font-semibold tracking-tight">Project Evolution</CardTitle>
              <CardDescription className="text-[11px] font-medium text-muted-foreground">Production trends over time</CardDescription>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            {/* KPI Summaries visible on md+ */}
            <div className="flex gap-4 text-sm mr-2 hidden md:flex">
              <div className="flex flex-col items-end justify-center px-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Terminés</span>
                <span className="text-sm font-semibold text-emerald-500 leading-none">{totalDone}</span>
              </div>
              <div className="flex flex-col items-end justify-center px-2 border-l border-border/50">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">En Cours</span>
                <span className="text-sm font-semibold text-primary leading-none">{totalInProgress}</span>
              </div>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] h-8 text-xs rounded-md border-border/60 bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md border-border/60">
                <SelectItem value="90d" className="text-xs">3 derniers mois</SelectItem>
                <SelectItem value="30d" className="text-xs">30 derniers jours</SelectItem>
                <SelectItem value="7d" className="text-xs">7 derniers jours</SelectItem>
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
                    {date: '1', val: 20}, {date: '2', val: 25}, {date: '3', val: 15}, 
                    {date: '4', val: 35}, {date: '5', val: 30}, {date: '6', val: 45}, {date: '7', val: 40}
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
                  <p className="text-sm font-semibold text-foreground">Aucune donnée</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pas d'activité sur cette période.</p>
                </div>
              </div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-full w-full px-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fillInProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
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
                    tickFormatter={(value) => new Date(value).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })}
                    className="text-[10px] font-medium text-muted-foreground opacity-70"
                  />
                  
                  <ChartTooltip 
                    cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.1 }} 
                    content={
                      <ChartTooltipContent 
                        indicator="line" 
                        className="bg-card border border-border/50 shadow-md rounded-lg text-xs"
                      />
                    } 
                  />
                  
                  <ChartLegend content={<ChartLegendContent />} verticalAlign="top" height={36} className="opacity-80" />
                  
                  <Area 
                    dataKey="done" 
                    type="monotone" 
                    fill="url(#fillDone)" 
                    fillOpacity={1} 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    stackId="a"
                    activeDot={{ r: 4, fill: "#10b981", stroke: "var(--background)", strokeWidth: 2 }}
                  />
                  <Area 
                    dataKey="inProgress" 
                    type="monotone" 
                    fill="url(#fillInProgress)" 
                    fillOpacity={1} 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    stackId="b" 
                    activeDot={{ r: 4, fill: "#3b82f6", stroke: "var(--background)", strokeWidth: 2 }}
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