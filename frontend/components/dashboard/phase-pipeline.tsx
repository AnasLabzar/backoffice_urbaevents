"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PhasePipelineProps {
  projects: any[];
}

// Composant pour l'animation des nombres
const AnimatedCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const duration = 1000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
};

// --- Custom Animated SVGs avec Framer Motion ---

const SparkIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <motion.path 
      d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.485-6.485l-1.414 1.414M6.929 17.071l-1.414 1.414M17.071 17.071l1.414 1.414M6.929 6.929L5.515 5.515" 
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut", repeat: isActive ? Infinity : 0, repeatType: "reverse" }}
    />
    <motion.circle cx="12" cy="12" r="4" 
      initial={{ scale: 0.5, fill: "transparent" }}
      animate={{ scale: isActive ? [1, 1.2, 1] : 1, fill: isActive ? "currentColor" : "transparent" }}
      transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
    />
  </motion.svg>
);

const CompassIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <motion.circle cx="12" cy="12" r="10" 
      initial={{ pathLength: 0 }} 
      animate={{ pathLength: 1 }} 
      transition={{ duration: 1.5 }}
    />
    <motion.polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" 
      animate={{ rotate: isActive ? [0, 15, -15, 0] : 0 }}
      transition={{ duration: 4, repeat: isActive ? Infinity : 0, ease: "easeInOut" }}
      style={{ originX: "12px", originY: "12px" }}
    />
  </motion.svg>
);

const GearsIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <motion.path 
      d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" 
      animate={{ rotate: isActive ? 360 : 0 }}
      transition={{ duration: 8, repeat: isActive ? Infinity : 0, ease: "linear" }}
      style={{ originX: "12px", originY: "12px" }}
    />
    <motion.circle cx="12" cy="12" r="3" />
  </motion.svg>
);

const DiamondIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <motion.path d="M6 3h12l4 6-10 12L2 9z" 
      initial={{ pathLength: 0 }} 
      animate={{ pathLength: 1 }} 
      transition={{ duration: 1.5 }}
    />
    <motion.path d="M2 9h20M12 3v18M6 3l6 6M18 3l-6 6" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: isActive ? [0.5, 1, 0.5] : 1 }} 
      transition={{ duration: 3, repeat: isActive ? Infinity : 0 }}
    />
  </motion.svg>
);


export function PhasePipeline({ projects }: PhasePipelineProps) {
  const getPhaseStats = (phaseName: string) => {
    const phaseProjects = projects.filter(p => p.currentPhase === phaseName);
    const count = phaseProjects.length;
    
    // Total budget
    const totalBudget = phaseProjects.reduce((sum, p) => sum + (Number(p.budgetTarget) || 0), 0);
    
    // Earliest deadline
    const now = new Date().getTime();
    const upcomingDates = phaseProjects
      .map(p => {
        const dStr = p.submissionDeadline || p.eventDate;
        if (!dStr) return null;
        const d = !isNaN(Number(dStr)) ? Number(dStr) : new Date(dStr).getTime();
        return isNaN(d) ? null : d;
      })
      .filter(d => d !== null && d >= now)
      .sort((a, b) => (a as number) - (b as number));
      
    let nextDeadline = null;
    if (upcomingDates.length > 0) {
      const diffDays = Math.ceil(((upcomingDates[0] as number) - now) / (1000 * 60 * 60 * 24));
      nextDeadline = diffDays === 0 ? "Auj." : `J-${diffDays}`;
    }

    return { count, totalBudget, nextDeadline };
  };

  const initStats = getPhaseStats("INITIATION");
  const planStats = getPhaseStats("PLANIFICATION");
  const execStats = getPhaseStats("EXECUTION");
  const clotStats = getPhaseStats("CLOTURE");

  const phases = [
    { 
      id: "INITIATION", label: "Initiation", desc: "Devis & Concept", 
      stats: initStats, color: "text-blue-500", bg: "bg-blue-500", icon: SparkIcon 
    },
    { 
      id: "PLANIFICATION", label: "Planification", desc: "Ressources & Achats", 
      stats: planStats, color: "text-amber-500", bg: "bg-amber-500", icon: CompassIcon 
    },
    { 
      id: "EXECUTION", label: "Exécution", desc: "Logistique & J-J", 
      stats: execStats, color: "text-emerald-500", bg: "bg-emerald-500", icon: GearsIcon 
    },
    { 
      id: "CLOTURE", label: "Clôture", desc: "Facturation & Bilan", 
      stats: clotStats, color: "text-slate-400", bg: "bg-slate-500", icon: DiamondIcon 
    },
  ];

  // Trouver l'index de la dernière phase active pour animer la ligne
  const lastActiveIndex = phases.reduce((acc, curr, idx) => curr.stats.count > 0 ? idx : acc, 0);
  const progressWidth = `${(lastActiveIndex / (phases.length - 1)) * 100}%`;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full bg-card/60 backdrop-blur-xl rounded-2xl border border-border/60 shadow-xl overflow-hidden flex flex-col"
    >
      <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-muted/20 to-transparent flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-3 text-sm">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Pipeline Dynamique
        </h3>
        <motion.span 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="text-[10px] uppercase font-black tracking-widest text-primary/80 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]"
        >
          Intelligence Temps Réel
        </motion.span>
      </div>
      
      <div className="w-full overflow-x-auto pb-4">
        <div className="p-6 md:p-10 pb-8 min-w-[768px]">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative flex justify-between items-center w-full max-w-5xl mx-auto"
          >
          
          {/* Ligne de fond (Track) */}
          <div className="absolute top-8 left-0 right-0 h-1.5 bg-muted/50 rounded-full z-0 transform -translate-y-1/2"></div>
          
          {/* Ligne de progression animée (Fill) */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: progressWidth }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-8 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 rounded-full z-0 transform -translate-y-1/2 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          />

          {phases.map((phase, index) => {
            const isActive = phase.stats.count > 0;
            const Icon = phase.icon;

            return (
              <motion.div key={phase.id} variants={itemVariants} className="relative z-10 flex flex-col items-center group w-1/4">
                
                {/* Node Cercle */}
                <motion.div 
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-card transition-colors relative cursor-pointer",
                    isActive ? cn(phase.bg, "text-white shadow-2xl") : "bg-muted text-muted-foreground border-border/50"
                  )}
                  style={{ boxShadow: isActive ? `0 10px 25px -5px ${phase.bg.includes('blue') ? 'rgba(59,130,246,0.5)' : phase.bg.includes('amber') ? 'rgba(245,158,11,0.5)' : phase.bg.includes('emerald') ? 'rgba(16,185,129,0.5)' : 'rgba(100,116,139,0.5)'}` : 'none' }}
                >
                  {/* Effet Neon / Glow externe */}
                  {isActive && (
                    <motion.div 
                      className={cn("absolute inset-0 rounded-2xl blur-xl opacity-60", phase.bg)}
                      animate={{ opacity: [0.4, 0.7, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  
                  {/* L'icône SVG animée */}
                  <div className="relative z-10">
                    <Icon isActive={isActive} />
                  </div>
                  
                  {/* Badge Compteur Flottant */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.5, delay: 0.8 + (index * 0.2) }}
                        className="absolute -top-3 -right-3 w-7 h-7 bg-foreground text-background text-[11px] font-black flex items-center justify-center rounded-full shadow-xl ring-4 ring-card"
                      >
                        <AnimatedCounter value={phase.stats.count} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                
                {/* Textes et Détails en dessous */}
                <div className="mt-5 flex flex-col items-center w-full px-2">
                  <p className={cn("text-sm font-black tracking-widest uppercase transition-colors duration-300", isActive ? "text-foreground drop-shadow-sm" : "text-muted-foreground")}>
                    {phase.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium mb-2">
                    {phase.desc}
                  </p>
                  
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="w-full max-w-[140px] flex flex-col gap-1.5"
                  >
                    {!isActive ? (
                      <div className="flex items-center justify-center py-1">
                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                          Vide
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 w-full bg-card/50 border border-border/50 rounded-lg p-2 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground">Volume</span>
                          <span className={cn("text-[10px] font-bold", phase.color)}>
                            {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(phase.stats.totalBudget).replace('MAD', 'DH')}
                          </span>
                        </div>
                        {phase.stats.nextDeadline && (
                          <div className="flex items-center justify-between border-t border-border/50 pt-1 mt-0.5">
                            <span className="text-[9px] text-muted-foreground">Prochaine Urgence</span>
                            <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1 rounded">
                              {phase.stats.nextDeadline}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
