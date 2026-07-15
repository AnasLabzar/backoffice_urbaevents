"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  IconBriefcase,
  IconCoin,
  IconActivity,
  IconClock,
  IconAlertTriangle,
  IconChecklist,
  IconPercentage,
  IconArrowUpRight
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Composant de compteur animé
const AnimatedCounter = ({ value, isCurrency = false }: { value: number, isCurrency?: boolean }) => {
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
        setDisplayValue(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  if (isCurrency) {
    return <span>{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(displayValue).replace('MAD', 'MAD')}</span>;
  }
  return <span>{Math.floor(displayValue)}</span>;
};

interface KPICardsProps {
  stats: any;
  isLoading: boolean;
  canSeeFinancials: boolean;
  userRole: string;
}

export function AnimatedKPICards({ stats, isLoading, canSeeFinancials, userRole }: KPICardsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(amount);
  };

  const CardWrapper = ({ children, className, glowColor }: any) => (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-5 shadow-lg overflow-hidden group cursor-default",
        className
      )}
    >
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500", glowColor)} />
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        {children}
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* 1. Total Projets */}
      <CardWrapper glowColor="bg-primary">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground tracking-tight">Total Projets</h3>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shadow-sm">
            <IconBriefcase size={20} />
          </div>
        </div>
        <div>
          {isLoading ? <Skeleton className="h-10 w-24 mb-2" /> : (
            <div className="text-3xl font-black tracking-tighter text-foreground mb-1">
              <AnimatedCounter value={stats.total} />
            </div>
          )}
          {isLoading ? <Skeleton className="h-4 w-32" /> : (
            <div className="flex items-center text-xs font-medium text-muted-foreground">
              <span className="flex items-center text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md mr-2">
                <IconPercentage size={12} className="mr-0.5" />
                {stats.completionRate}%
              </span>
              Taux de complétion
            </div>
          )}
        </div>
      </CardWrapper>

      {/* 2. Financier ou Urgences */}
      {canSeeFinancials ? (
        <CardWrapper glowColor="bg-emerald-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground tracking-tight">Pipeline Financier</h3>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">
              <IconCoin size={20} />
            </div>
          </div>
          <div>
            {isLoading ? <Skeleton className="h-10 w-32 mb-2" /> : (
              <div className="text-2xl font-black tracking-tighter text-foreground mb-1 truncate" title={formatCurrency(stats.totalBudget)}>
                <AnimatedCounter value={stats.totalBudget} isCurrency={true} />
              </div>
            )}
            {isLoading ? <Skeleton className="h-4 w-40" /> : (
              <div className="flex items-center text-xs font-medium text-muted-foreground">
                <span className="mr-1">Moyenne:</span>
                <span className="text-foreground">{formatCurrency(stats.averageBudget)}</span>
              </div>
            )}
          </div>
        </CardWrapper>
      ) : (
        <CardWrapper glowColor="bg-red-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground tracking-tight">Urgences (J-3)</h3>
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300 shadow-sm">
              <IconAlertTriangle size={20} />
            </div>
          </div>
          <div>
            {isLoading ? <Skeleton className="h-10 w-24 mb-2" /> : (
              <div className="text-3xl font-black tracking-tighter text-foreground mb-1">
                <AnimatedCounter value={stats.urgentDeadlines} />
              </div>
            )}
            {isLoading ? <Skeleton className="h-4 w-32" /> : (
              <div className="flex items-center text-xs font-medium text-muted-foreground">
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md mr-2",
                  stats.urgencyRate > 20 ? "text-red-600 bg-red-600/10" : "text-amber-600 bg-amber-600/10"
                )}>
                  {stats.urgencyRate}%
                </span>
                actifs urgents
              </div>
            )}
          </div>
        </CardWrapper>
      )}

      {/* 3. En Production */}
      <CardWrapper glowColor="bg-blue-500">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground tracking-tight">En Production</h3>
          <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300 shadow-sm">
            <IconActivity size={20} />
          </div>
        </div>
        <div>
          {isLoading ? <Skeleton className="h-10 w-24 mb-2" /> : (
            <div className="text-3xl font-black tracking-tighter text-foreground mb-1">
              <AnimatedCounter value={stats.inProgress} />
            </div>
          )}
          {isLoading ? <Skeleton className="h-4 w-32" /> : (
            <div className="flex items-center text-xs font-medium text-muted-foreground">
              <IconArrowUpRight size={14} className="text-blue-500 mr-1" />
              Projets sur le terrain
            </div>
          )}
        </div>
      </CardWrapper>

      {/* 4. Spécifique au rôle */}
      {userRole === 'FINANCE' ? (
        <CardWrapper glowColor="bg-purple-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground tracking-tight">Cautions à Valider</h3>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300 shadow-sm">
              <IconChecklist size={20} />
            </div>
          </div>
          <div>
            {isLoading ? <Skeleton className="h-10 w-24 mb-2" /> : (
              <div className="text-3xl font-black tracking-tighter text-foreground mb-1">
                <AnimatedCounter value={stats.pendingCautions} />
              </div>
            )}
            {isLoading ? <Skeleton className="h-4 w-32" /> : (
              <div className="flex items-center text-xs font-medium text-muted-foreground">
                En attente d'approbation
              </div>
            )}
          </div>
        </CardWrapper>
      ) : (
        <CardWrapper glowColor="bg-slate-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground tracking-tight">Projets Terminés</h3>
            <div className="h-10 w-10 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-500 group-hover:bg-slate-500 group-hover:text-white transition-colors duration-300 shadow-sm">
              <IconClock size={20} />
            </div>
          </div>
          <div>
            {isLoading ? <Skeleton className="h-10 w-24 mb-2" /> : (
              <div className="text-3xl font-black tracking-tighter text-foreground mb-1">
                <AnimatedCounter value={stats.completed} />
              </div>
            )}
            {isLoading ? <Skeleton className="h-4 w-32" /> : (
              <div className="flex items-center text-xs font-medium text-muted-foreground">
                Historique archivé
              </div>
            )}
          </div>
        </CardWrapper>
      )}

    </motion.div>
  );
}
