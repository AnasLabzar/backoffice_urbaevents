"use client";

import { useQuery, useMutation } from "@apollo/client";
import { GET_PROJECT_RETROPLANNING, VALIDATE_JALON_J2 } from "@/lib/graphql/projects";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconClock, IconAlertCircle, IconCheck, IconCalendarEvent } from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { gql } from "@apollo/client";

const ME_QUERY = gql` query Me { me { id role { name } } }`;

interface RetroplanningProps {
  projectId: string;
  currentPhase?: string;
}

export function Retroplanning({ projectId, currentPhase }: RetroplanningProps) {
  const { data: meData } = useQuery(ME_QUERY);
  const userRole = meData?.me?.role?.name;
  const { data, loading, refetch } = useQuery(GET_PROJECT_RETROPLANNING, {
    variables: { projectId },
    fetchPolicy: "cache-and-network"
  });

  const [validateJ2, { loading: isValidating }] = useMutation(VALIDATE_JALON_J2, {
    onCompleted: () => {
      toast.success("Jalon J2 validé avec succès. Passage en phase CONCEPTION.");
      refetch();
    },
    onError: (err) => toast.error(err.message)
  });

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement du rétroplanning...</div>;

  const retro = data?.getProjectRetroplanning;
  if (!retro) return <div className="p-8 text-center text-muted-foreground">Aucun rétroplanning trouvé.</div>;

  const deadlines = retro.targetDeadlines || {};
  const wbsLots = retro.wbsLots || [];
  
  const now = new Date().getTime();
  
  const checkDeadline = (dateStr?: string) => {
    if (!dateStr) return { color: "text-muted-foreground", text: "Non défini", bg: "bg-muted" };
    const date = new Date(Number(dateStr));
    const isLate = now > date.getTime();
    return {
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      isLate,
      color: isLate ? "text-destructive" : "text-primary",
      bg: isLate ? "bg-destructive/10 border-destructive" : "bg-primary/10 border-primary"
    };
  };

  const milestones = [
    { label: "Jalon J2 (Validation Planning)", key: "deadlineJ2" },
    { label: "Achats & Sous-traitance", key: "deadlineAchats" },
    { label: "Repérage & Plan de masse", key: "deadlineReperage" },
    { label: "BAT Client (CRITIQUE)", key: "deadlineBAT" },
    { label: "Lancement Impressions", key: "deadlineImpression" },
    { label: "Fin Production", key: "deadlineProduction" },
    { label: "Début Montage", key: "deadlineMontage" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER ACTION (DO / ADMIN ONLY) */}
      {(userRole === "DO" || userRole === "DG" || userRole === "ADMIN") && currentPhase === "PLANIFICATION" && (
        <Card className="border-primary/20 bg-primary/5 shadow-lg">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <IconCheck className="w-5 h-5" /> Validation Direction (Jalon J2)
              </h3>
              <p className="text-sm text-muted-foreground">Vérifiez la cohérence du WBS et des ressources avant de verrouiller le planning.</p>
            </div>
            <Button 
              size="lg" 
              onClick={() => validateJ2({ variables: { projectId } })}
              disabled={isValidating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/20"
            >
              {isValidating ? "Validation..." : "VALIDER JALON J2"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* TIMELINE (Deadlines Cibles) */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="h-full border-border/50 shadow-md">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <CardTitle className="text-base font-bold uppercase flex items-center gap-2">
                <IconClock className="w-5 h-5 text-primary" />
                Deadlines Cibles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="relative border-l-2 border-border/50 ml-3 space-y-8">
                {milestones.map((m, i) => {
                  const info = checkDeadline(deadlines[m.key]);
                  return (
                    <div key={i} className="relative pl-6">
                      <div className={cn(
                        "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center",
                        info.color,
                        info.isLate ? "border-destructive animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]" : "border-primary"
                      )} />
                      <div className="space-y-1">
                        <h4 className={cn("text-sm font-bold uppercase tracking-wide", info.color)}>{m.label}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("font-mono font-bold", info.bg, info.color)}>
                            {info.date || info.text}
                          </Badge>
                          {info.isLate && <IconAlertCircle className="w-4 h-4 text-destructive animate-pulse" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* WBS LOTS */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="h-full border-border/50 shadow-md">
            <CardHeader className="pb-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold uppercase flex items-center gap-2">
                <IconCalendarEvent className="w-5 h-5 text-primary" />
                Lots WBS (Work Breakdown Structure)
              </CardTitle>
              <Badge variant="secondary" className="font-mono">{wbsLots.length} Lots Standards</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {wbsLots.map((lot: any, idx: number) => (
                  <AccordionItem value={`lot-${idx}`} key={idx} className="border-b-0 border-t first:border-t-0 px-6">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{lot.name.substring(3)}</p>
                          <p className="text-xs text-muted-foreground mt-1">Status: {lot.status}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pt-2">
                      <div className="p-6 bg-muted/10 rounded-xl border border-dashed flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                        <p className="text-sm max-w-sm">
                          L'affectation des micro-tâches et des ressources à ce lot sera développée dans la prochaine itération du Gantt Interactif.
                        </p>
                        <Button variant="outline" size="sm" className="mt-2" disabled>
                          Gérer le lot {idx + 1}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
