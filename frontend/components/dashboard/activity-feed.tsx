"use client";

import React from "react";
import { IconActivity, IconCheck, IconMessage, IconClockPlay, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ActivityFeed({ feedData }: { feedData: any[] }) {
  // Extract activities
  const activities = feedData
    .filter(item => item.latestTask != null || item.project != null)
    .map(item => {
      // If there's a latest task, that's an activity
      if (item.latestTask) {
        return {
          id: `task-${item.latestTask.id}`,
          type: 'TASK',
          title: item.latestTask.description,
          projectName: item.project.title,
          status: item.latestTask.status,
          date: new Date(Number(item.latestTask.createdAt) || item.latestTask.createdAt),
          rawDate: Number(item.latestTask.createdAt) || new Date(item.latestTask.createdAt).getTime()
        };
      } else {
        // Fallback to project creation or update
        return {
          id: `proj-${item.project.id}`,
          type: 'PROJECT',
          title: `Projet mis à jour`,
          projectName: item.project.title,
          status: item.project.currentPhase || item.project.status,
          date: new Date(Number(item.project.createdAt) || item.project.createdAt),
          rawDate: Number(item.project.createdAt) || new Date(item.project.createdAt).getTime()
        };
      }
    })
    .sort((a, b) => b.rawDate - a.rawDate)
    .slice(0, 10); // Show top 10

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
      case 'CLOTURE':
        return <IconCheck size={14} className="text-emerald-500" />;
      case 'IN_PROGRESS':
      case 'EXECUTION':
        return <IconClockPlay size={14} className="text-blue-500" />;
      case 'PENDING':
      case 'INITIATION':
        return <IconActivity size={14} className="text-amber-500" />;
      default:
        return <IconMessage size={14} className="text-muted-foreground" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'DONE':
      case 'CLOTURE':
        return "bg-emerald-500/10 border-emerald-200";
      case 'IN_PROGRESS':
      case 'EXECUTION':
        return "bg-blue-500/10 border-blue-200";
      case 'PENDING':
      case 'INITIATION':
        return "bg-amber-500/10 border-amber-200";
      default:
        return "bg-muted border-border/50";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.4 } }
  };

  const itemVariants = {
    hidden: { x: 20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full bg-card/60 backdrop-blur-xl rounded-2xl border border-border/40 shadow-lg flex flex-col h-full hover:shadow-xl transition-shadow"
    >
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-transparent">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <IconActivity size={18} />
          </div>
          Live Activity Feed
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Live</span>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground p-4">Aucune activité récente.</div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative border-l-2 border-border/50 ml-3 space-y-6 pb-2"
          >
            {activities.map((act, index) => (
              <motion.div variants={itemVariants} key={act.id} className="relative pl-6 group">
                {/* Timeline dot */}
                <div className={cn(
                  "absolute -left-[12px] top-1 w-[22px] h-[22px] rounded-full border-4 border-card flex items-center justify-center shadow-sm group-hover:scale-125 transition-transform duration-300",
                  getStatusBg(act.status)
                )}>
                  {getStatusIcon(act.status)}
                </div>

                <div className="flex flex-col gap-1.5 p-3 -mt-2 rounded-xl border border-transparent group-hover:border-border/50 group-hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold leading-tight text-foreground" title={act.title}>
                      {act.title}
                    </p>
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap pt-0.5 bg-muted/50 px-1.5 rounded-md">
                      {act.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-primary/80 truncate">
                    {act.projectName}
                  </p>
                  <div className="mt-1">
                    <span className="text-[9px] font-black tracking-widest uppercase bg-muted/80 border border-border/50 text-muted-foreground px-2 py-0.5 rounded-md shadow-sm">
                      {act.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
