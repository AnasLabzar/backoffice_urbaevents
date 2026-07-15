"use client";

import React from "react";
import { IconAlertTriangle, IconCalendarEvent, IconChevronRight } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function UrgentDeadlines({ projects }: { projects: any[] }) {
  const now = new Date().getTime();

  // Filter projects with deadlines in the next 7 days (and not in the past)
  const urgentProjects = projects.filter(p => {
    // Check submissionDeadline or eventDate
    const dateStr = p.submissionDeadline || p.eventDate;
    if (!dateStr) return false;
    
    // Some dates are stored as stringified numbers
    const isTimestamp = !isNaN(Number(dateStr));
    const d = isTimestamp ? new Date(Number(dateStr)) : new Date(dateStr);
    
    if (isNaN(d.getTime())) return false;
    
    const diffDays = Math.ceil((d.getTime() - now) / (1000 * 60 * 60 * 24));
    // We only want upcoming deadlines between 0 and 7 days
    return diffDays >= 0 && diffDays <= 7;
  }).sort((a, b) => {
    const dA = !isNaN(Number(a.submissionDeadline || a.eventDate)) ? Number(a.submissionDeadline || a.eventDate) : new Date(a.submissionDeadline || a.eventDate).getTime();
    const dB = !isNaN(Number(b.submissionDeadline || b.eventDate)) ? Number(b.submissionDeadline || b.eventDate) : new Date(b.submissionDeadline || b.eventDate).getTime();
    return dA - dB;
  }).slice(0, 5); // Take top 5

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
  };

  const itemVariants = {
    hidden: { x: 20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  const hasUrgencies = urgentProjects.length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-card/60 backdrop-blur-xl rounded-2xl border border-border/40 shadow-lg flex flex-col h-full hover:shadow-xl transition-shadow"
    >
      <div className={cn(
        "px-5 py-4 border-b border-border/50 flex items-center justify-between transition-colors duration-500",
        hasUrgencies ? "bg-gradient-to-r from-red-500/10 to-transparent" : "bg-gradient-to-r from-emerald-500/10 to-transparent"
      )}>
        <h3 className="font-semibold text-foreground flex items-center gap-3">
          <div className={cn(
            "p-1.5 rounded-lg shadow-sm transition-colors duration-500",
            hasUrgencies ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"
          )}>
            {hasUrgencies ? <IconAlertTriangle size={18} /> : <IconCalendarEvent size={18} />}
          </div>
          Urgences (J-7)
        </h3>
        <Badge variant="secondary" className={cn(
          "transition-colors duration-500 border",
          hasUrgencies 
            ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20" 
            : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
        )}>
          {hasUrgencies ? `${urgentProjects.length} à risque` : "Tout est OK"}
        </Badge>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        {!hasUrgencies ? (
          <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5">
            {/* Background glowing orb */}
            <motion.div 
              className="absolute w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Animated Shield/Check icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="relative z-10 w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <motion.path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </svg>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm font-bold text-emerald-600 dark:text-emerald-400 z-10"
            >
              Aucune urgence
            </motion.p>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-center mt-1 text-muted-foreground z-10 max-w-[200px]"
            >
              Tous les projets ont une marge temporelle confortable.
            </motion.p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-1"
          >
            {urgentProjects.map((project) => {
              const dateStr = project.submissionDeadline || project.eventDate;
              const isTimestamp = !isNaN(Number(dateStr));
              const d = isTimestamp ? new Date(Number(dateStr)) : new Date(dateStr);
              const diffDays = Math.ceil((d.getTime() - now) / (1000 * 60 * 60 * 24));
              
              const isCritical = diffDays <= 2;

              return (
                <motion.div variants={itemVariants} key={project.id} className="group flex flex-col gap-2 p-3 rounded-xl hover:bg-muted/80 border border-transparent hover:border-border/50 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex justify-between items-start w-full gap-2">
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-bold text-foreground truncate" title={project.title}>
                        {project.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" title={project.clientName || project.object}>
                        {project.clientName || project.object}
                      </p>
                    </div>
                    
                    <div className={cn(
                      "shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm",
                      isCritical ? "bg-red-500 text-white" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                    )}>
                      {diffDays === 0 ? "Aujourd'hui" : `J-${diffDays}`}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground bg-muted/80 border border-border/50 px-2 py-0.5 rounded-md">
                      {project.currentPhase || "En cours"}
                    </span>
                    <IconChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
