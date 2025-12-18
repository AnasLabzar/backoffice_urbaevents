
"use client";

import React, { useState, useEffect } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { PriceInput } from "@/components/ui/price-input";
import { User, FileText, Hash, PenBox } from "lucide-react";
import { ME_QUERY } from "@/lib/graphql/projects";

// --- MUTATION ---
const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) { 
      id
      title
      object
      submissionDeadline
      estimatedBudget
      cautionAmount
      technicalOfferRequired
      referenceAO # <--- Zid hadi bach t-update f cache
    }
  }
`;

interface EditProjectSheetProps {
  project: any;
  isOpen: boolean;
  onClose: () => void;
}

export function EditProjectSheet({ project, isOpen, onClose }: EditProjectSheetProps) {
  const { data: meData } = useQuery(ME_QUERY);
  const userRole = meData?.me.role.name;

  // Permissions: Admin ou Proposal Manager
  const canEdit = userRole === 'ADMIN' || userRole === 'PROPOSAL_MANAGER';

  // State initialization m3a l-data dyal projet
  const [formData, setFormData] = useState({
    title: project?.title || "",
    object: project?.object || "",
    projectType: project?.projectType || "PUBLIC_TENDER",
    submissionDeadline: project?.submissionDeadline ? new Date(project.submissionDeadline) : new Date(),
    referenceAO: project?.referenceAO || "",
    estimatedBudget: project?.estimatedBudget || 0,
    cautionAmount: project?.cautionAmount || 0,
    technicalOfferRequired: project?.technicalOfferRequired ?? true,
  });

  // Update form melli projet kaytbeddel
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || "",
        object: project.object || "",
        projectType: project.projectType || "PUBLIC_TENDER",
        submissionDeadline: project.submissionDeadline ? new Date(project.submissionDeadline) : new Date(),
        referenceAO: project.referenceAO || "",
        estimatedBudget: project.estimatedBudget || 0,
        cautionAmount: project.cautionAmount || 0,
        technicalOfferRequired: project.technicalOfferRequired ?? true,
      });
    }
  }, [project]);

  const [updateProject, { loading }] = useMutation(UPDATE_PROJECT_MUTATION, {
    onCompleted: () => {
      toast.success("Projet mis à jour avec succès !");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProject({
      variables: {
        id: project.id,
        input: {
          ...formData,
          estimatedBudget: Number(formData.estimatedBudget),
          cautionAmount: Number(formData.cautionAmount),
        }
      }
    });
  };

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.id]: e.target.value });
  const handleSelectChange = (id: string, val: any) => setFormData({ ...formData, [id]: val });
  const handleDateChange = (date: any) => date && setFormData({ ...formData, submissionDeadline: date });
  const handleCheckboxChange = (id: string, val: boolean) => setFormData({ ...formData, [id]: val });

  if (!canEdit) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl flex flex-col h-full">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <PenBox className="h-5 w-5" /> Modifier le Projet
          </SheetTitle>
          <SheetDescription>
            Modifiez les informations ci-dessous.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-1 pr-2">
          <form id="edit-project-form" onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Client & Objet</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Nom du Client</Label>
                  <Input id="title" value={formData.title} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="object">Objet</Label>
                  <Input id="object" value={formData.object} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <Separator />

            {/* Technical */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Hash className="h-4 w-4" /> Détails</h3>
              {/* 👇 Zidt referenceAO hna */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.projectType} onValueChange={(v) => handleSelectChange("projectType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC_TENDER">Appel d'Offre</SelectItem>
                      <SelectItem value="CONFIRMED">Projet Confirmé</SelectItem>
                      <SelectItem value="INTERNAL">Interne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 👇 HADA KAN NAQSSK F L'AFFICHAGE */}
                <div className="space-y-2">
                  <Label htmlFor="referenceAO">Référence AO</Label>
                  <Input
                    id="referenceAO"
                    value={formData.referenceAO}
                    onChange={handleChange}
                    placeholder="Ex: 12/2025/..."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Deadline</Label>
                  <DatePickerInput date={formData.submissionDeadline} setDate={handleDateChange} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Financial */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">Financier (DH)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Budget Est.</Label>
                  <PriceInput id="estimatedBudget" value={formData.estimatedBudget} onChange={(v) => handleSelectChange("estimatedBudget", v)} />
                </div>
                <div className="space-y-2">
                  <Label>Caution</Label>
                  <PriceInput id="cautionAmount" value={formData.cautionAmount} onChange={(v) => handleSelectChange("cautionAmount", v)} />
                </div>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-lg border">
              <Checkbox id="technicalOfferRequired" checked={formData.technicalOfferRequired} onCheckedChange={(c) => handleCheckboxChange("technicalOfferRequired", c as boolean)} />
              <div className="grid gap-1">
                <Label htmlFor="technicalOfferRequired" className="text-sm font-medium">Offre Technique Requise ?</Label>
              </div>
            </div>

          </form>
        </div>

        <SheetFooter className="mt-4 pt-4 border-t">
          <SheetClose asChild><Button variant="ghost">Annuler</Button></SheetClose>
          <Button type="submit" form="edit-project-form" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}