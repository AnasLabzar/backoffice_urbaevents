"use client";

import * as React from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Plus,
  Info,
  AlertCircle,
  User,
  Hash,
  CheckCircle2,
  Pencil
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { PriceInput } from "@/components/ui/price-input";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetClose, SheetContent, SheetDescription,
  SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { DatePickerInput } from "@/components/ui/date-picker-input";

// --- GRAPHQL ---
const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    proposal_createProject(input: $input) { 
      id projectCode title technicalOfferRequired 
    }
  }
`;

const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    proposal_updateProject(id: $id, input: $input) {
      id title object status
    }
  }
`;

const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id title object status: generalStatus preparationStatus
        projectManagers { name }
        stages { administrative { documents { id fileName } } }
      }
      latestTask { id description status createdAt }
    }
  }
`;

const ME_QUERY = gql` query Me { me { id role { name } } }`;

// --- HELPER: SAFE DATE ---
const safeDate = (dateInput: any): Date | undefined => {
  if (!dateInput) return undefined;
  if (dateInput instanceof Date) return dateInput;
  // Handle timestamp strings
  const isNumberString = !isNaN(Number(dateInput));
  if (isNumberString) return new Date(Number(dateInput));
  // Handle ISO strings
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

// --- FORM CONTENT ---
function ProjectFormContent({
  formData,
  handleChange,
  handleSelectChange,
  handleDateChange,
  handleCheckboxChange,
  handleSubmit,
  loading,
  userRole,
  isEditMode
}: any) {

  const canCreate = userRole === 'PROPOSAL_MANAGER' || userRole === 'ADMIN';
  const isDirectProd = formData.projectType === 'CONFIRMED' || formData.projectType === 'INTERNAL';

  if (!canCreate) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Accès Refusé</AlertTitle>
        <AlertDescription>Permission manquante.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form id="project-form" className="flex flex-col gap-6 px-1" onSubmit={handleSubmit}>
      <Alert className={cn(
        "border",
        isDirectProd ? "bg-green-50 border-green-200 text-green-800" : "bg-blue-50 border-blue-200 text-blue-800"
      )}>
        {isDirectProd ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Info className="h-4 w-4 text-blue-600" />}
        <AlertTitle className="font-semibold">
          {isEditMode ? "Mode Modification" : (isDirectProd ? "Mode Production Directe" : "Mode Brouillon (Draft)")}
        </AlertTitle>
        <AlertDescription className="text-xs opacity-90">
          {isEditMode
            ? "Vous modifiez les informations de ce projet."
            : "Ce projet sera créé en attente de validation."
          }
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" /> Informations Client
        </h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-bold text-muted-foreground uppercase">Nom du Client *</Label>
            <Input id="title" placeholder="Ex: Ministère de la Culture..." value={formData.title} onChange={handleChange} required className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="object" className="text-xs font-bold text-muted-foreground uppercase">Objet du Projet *</Label>
            <Input id="object" placeholder="Ex: Organisation de l'événement..." value={formData.object} onChange={handleChange} required className="bg-background" />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" /> Détails Techniques
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="projectType">Type de Projet</Label>
            <Select value={formData.projectType} onValueChange={(value) => handleSelectChange("projectType", value)}>
              <SelectTrigger id="projectType" className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC_TENDER">🏛️ Appel d'Offre</SelectItem>
                <SelectItem value="CONFIRMED">✅ Projet Confirmé</SelectItem>
                <SelectItem value="INTERNAL">🏢 Projet Interne</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="referenceAO">Référence AO</Label>
            <Input id="referenceAO" placeholder="N° 12/2026/..." value={formData.referenceAO} onChange={handleChange} className="bg-background" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="submissionDeadline">Date Deadline</Label>
            <DatePickerInput
              date={formData.submissionDeadline}
              setDate={handleDateChange}
              placeholder="Sélectionner la date limite"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="font-bold text-green-600 text-xs border border-green-200 px-1 rounded">DH</span> Financier
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="estimatedBudget">Budget Est. (DH)</Label>
            <PriceInput id="estimatedBudget" value={formData.estimatedBudget || ""} onChange={(val) => handleSelectChange("estimatedBudget", val)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cautionAmount">Caution (DH)</Label>
            <PriceInput id="cautionAmount" value={formData.cautionAmount || ""} onChange={(val) => handleSelectChange("cautionAmount", val)} placeholder="0.00" />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-lg border">
        <Checkbox id="technicalOfferRequired" checked={formData.technicalOfferRequired} onCheckedChange={(checked) => handleCheckboxChange("technicalOfferRequired", checked as boolean)} />
        <div className="grid gap-1">
          <Label htmlFor="technicalOfferRequired" className="text-sm font-medium cursor-pointer">Besoin d'équipe technique ?</Label>
          <p className="text-xs text-muted-foreground">Cochez si le projet nécessite des Infographistes ou 3D.</p>
        </div>
      </div>
    </form>
  );
}

// --- MAIN SHEET ---
interface ProjectSheetProps {
  projectToEdit?: any;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProjectSheet({ projectToEdit, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: ProjectSheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen || setInternalOpen;

  const { data: meData } = useQuery(ME_QUERY);
  const userRole = meData?.me.role.name;
  const isEditMode = !!projectToEdit;

  const defaultState = {
    title: "", object: "", projectType: "PUBLIC_TENDER",
    submissionDeadline: undefined as Date | undefined,
    referenceAO: "",
    estimatedBudget: 0, cautionAmount: 0, technicalOfferRequired: true,
  };

  const [formData, setFormData] = React.useState(defaultState);

  // --- STATE HYDRATION (FIXED) ---
  React.useEffect(() => {
    if (isOpen && projectToEdit) {
      setFormData({
        title: projectToEdit.title || "",
        object: projectToEdit.object || "",
        projectType: projectToEdit.projectType || "PUBLIC_TENDER",
        submissionDeadline: safeDate(projectToEdit.submissionDeadline),
        referenceAO: projectToEdit.referenceAO || "",
        estimatedBudget: projectToEdit.estimatedBudget ? Number(projectToEdit.estimatedBudget) : 0,
        cautionAmount: projectToEdit.cautionAmount ? Number(projectToEdit.cautionAmount) : 0,
        technicalOfferRequired: projectToEdit.technicalOfferRequired ?? true,
      });
    } else if (isOpen && !projectToEdit) {
      setFormData(defaultState);
    }
  }, [isOpen, projectToEdit]);

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT_MUTATION, {
    onCompleted: () => {
      toast.success("Projet créé avec succès !");
      setIsOpen(false);
      setFormData(defaultState);
    },
    onError: (e) => toast.error(e.message),
    refetchQueries: [{ query: GET_PROJECTS_FEED }]
  });

  const [updateProject, { loading: updating }] = useMutation(UPDATE_PROJECT_MUTATION, {
    onCompleted: () => {
      toast.success("Projet modifié avec succès !");
      setIsOpen(false);
    },
    onError: (e) => toast.error(e.message),
    refetchQueries: [{ query: GET_PROJECTS_FEED }]
  });

  const loading = creating || updating;

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.id]: e.target.value });
  const handleSelectChange = (id: string, val: any) => setFormData({ ...formData, [id]: val });
  const handleDateChange = (date: any) => date && setFormData({ ...formData, submissionDeadline: date });
  const handleCheckboxChange = (id: string, val: boolean) => setFormData({ ...formData, [id]: val });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputData = {
      ...formData,
      estimatedBudget: Number(formData.estimatedBudget),
      cautionAmount: Number(formData.cautionAmount),
    };

    if (isEditMode) {
      updateProject({
        variables: { id: projectToEdit.id, input: inputData }
      });
    } else {
      createProject({
        variables: { input: inputData }
      });
    }
  };

  const Header = (
    <SheetHeader className="px-6 pt-6 pb-2">
      <SheetTitle>{isEditMode ? "Modifier le Projet" : "Nouveau Projet"}</SheetTitle>
      <SheetDescription>
        {isEditMode ? "Mettre à jour les informations du dossier." : "Initialiser un nouveau dossier."}
      </SheetDescription>
    </SheetHeader>
  );

  const Footer = (
    <SheetFooter className="px-6 pb-6 pt-4 border-t mt-auto">
      <SheetClose asChild><Button variant="ghost">Annuler</Button></SheetClose>
      <Button onClick={handleSubmit} disabled={loading} className="w-full md:w-auto">
        {loading ? (isEditMode ? "Modification..." : "Création...") : (isEditMode ? "Enregistrer" : "Confirmer")}
      </Button>
    </SheetFooter>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0 gap-0">
        {Header}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ProjectFormContent
            formData={formData} handleChange={handleChange}
            handleSelectChange={handleSelectChange} handleDateChange={handleDateChange}
            handleCheckboxChange={handleCheckboxChange} handleSubmit={handleSubmit}
            loading={loading} userRole={userRole}
            isEditMode={isEditMode}
          />
        </div>
        {Footer}
      </SheetContent>
    </Sheet>
  );
}


export function CreateProjectDrawer() {
  return (
    <ProjectSheet
      trigger={
        <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Nouveau Projet
        </Button>
      }
    />
  );
}

// O tqdr tzid hta hadi ila bghiti tsta3mlha f blayss khrin
export function EditProjectButton({ project }: { project: any }) {
  return (
    <ProjectSheet
      projectToEdit={project}
      trigger={
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
      }
    />
  );
}