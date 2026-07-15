"use client";

import * as React from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import {
  Plus,
  Info,
  AlertCircle,
  User,
  Hash,
  CheckCircle2,
  Pencil
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { DatePickerInput } from "@/components/ui/date-picker-input";

// --- GRAPHQL ---
const CREATE_PROJECT_J1_MUTATION = gql`
  mutation CreateProjectJ1($title: String!, $clientName: String!, $eventDate: String!, $budgetTarget: Float!, $managerId: ID!) {
    createProjectJ1(title: $title, clientName: $clientName, eventDate: $eventDate, budgetTarget: $budgetTarget, managerId: $managerId) {
      id
      title
      clientName
      projectCode
      currentPhase
      eventDate
      budgetTarget
      milestones { code status }
    }
  }
`;

const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id 
      title 
      clientName
      eventDate
      budgetTarget
      currentPhase
    }
  }
`;

const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id 
        title 
        object 
        status: generalStatus 
        preparationStatus
        
        clientName
        eventDate
        budgetTarget
        currentPhase
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
  const isNumberString = !isNaN(Number(dateInput));
  if (isNumberString) return new Date(Number(dateInput));
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

// --- INTERFACE POUR LE STATE (C'EST ÇA QUI MANQUAIT) ---
interface ProjectFormData {
  title: string;
  clientName: string;
  eventDate: Date | undefined;
  budgetTarget: string | number;
}

// --- FORM CONTENT ---
// Vers la ligne 128
function ProjectFormContent({
  formData,
  handleChange,
  handleSelectChange,
  handleDateChange,
  handleSubmit,
  loading,
  userRole,
  isEditMode
}: {
  formData: ProjectFormData;
  handleChange: (e: any) => void;
  handleSelectChange: (id: string, val: any) => void;
  handleDateChange: (date: Date | undefined | null) => void;
  handleSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  userRole: string;
  isEditMode: boolean;
}) {

  const canCreate = ['DG', 'DO', 'CP', 'ADMIN'].includes(userRole);

  if (!canCreate) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Accès Refusé</AlertTitle>
        <AlertDescription>Seuls les DG, DO, CP ou ADMIN peuvent initier un projet (J1).</AlertDescription>
      </Alert>
    );
  }

  return (
    <form id="project-form" className="flex flex-col gap-6 px-1" onSubmit={handleSubmit}>
      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="font-semibold">
          {isEditMode ? "Mode Modification" : "Initiation J1"}
        </AlertTitle>
        <AlertDescription className="text-xs opacity-90">
          {isEditMode
            ? "Vous modifiez les informations de base du projet."
            : "Ce projet sera créé en phase INITIATION."
          }
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" /> Informations Générales
        </h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-bold text-muted-foreground uppercase">Titre du Projet *</Label>
            <Input id="title" placeholder="Ex: Festival des Arts..." value={formData.title} onChange={handleChange} required className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientName" className="text-xs font-bold text-muted-foreground uppercase">Nom du Client *</Label>
            <Input id="clientName" placeholder="Ex: Ministère de la Culture" value={formData.clientName} onChange={handleChange} required className="bg-background" />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" /> Planning & Budget
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eventDate">Date de l'événement *</Label>
            <DatePickerInput
              date={formData.eventDate}
              setDate={handleDateChange}
              placeholder="Sélectionner la date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetTarget">Budget Cible Est. (DH) *</Label>
            <PriceInput id="budgetTarget" value={formData.budgetTarget} onChange={(val) => handleSelectChange("budgetTarget", val)} placeholder="0.00" />
          </div>
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

  // 1. Parsing Helper: String "1,000" -> Number 1000
  const parseAmount = (amount: any): number => {
    if (amount === undefined || amount === null || amount === "") return 0;
    if (typeof amount === 'number') return amount;
    const cleanString = amount.toString().replace(/[^0-9.]/g, '');
    return Number(cleanString) || 0;
  };

  // 2. Formatting Helper: Number 1000 -> String "1,000"
  const formatVal = (val: any): string => {
    if (val === undefined || val === null) return "";
    const num = Number(val);
    if (isNaN(num)) return "";
    if (num === 0) return ""; // Optionnel : afficher vide si 0, ou "0"
    return new Intl.NumberFormat("en-US").format(num);
  };

  const defaultState: ProjectFormData = {
    title: "",
    clientName: "",
    eventDate: undefined,
    budgetTarget: "",
  };

  // ✅ Utilisation de l'interface dans useState pour éviter les erreurs TS
  const [formData, setFormData] = React.useState<ProjectFormData>(defaultState);

  React.useEffect(() => {
    if (isOpen && projectToEdit) {
      console.log("🔥 ProjectSheet REÇOIT:", projectToEdit);

      setFormData({
        title: projectToEdit.title || "",
        clientName: projectToEdit.clientName || "",
        eventDate: safeDate(projectToEdit.eventDate),
        budgetTarget: formatVal(projectToEdit.budgetTarget),
      });
    } else if (isOpen && !projectToEdit) {
      setFormData(defaultState);
    }
  }, [isOpen, projectToEdit]);

  const [createProjectJ1, { loading: creating }] = useMutation(CREATE_PROJECT_J1_MUTATION, {
    onCompleted: () => {
      toast.success("Projet initié avec succès !");
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

  // Vers la ligne 344 (dans ProjectSheet)
  const handleChange = (e: any) => setFormData({ ...formData, [e.target.id]: e.target.value });
  const handleSelectChange = (id: string, val: any) => setFormData({ ...formData, [id]: val });

  // 👇 MODIFICATION ICI :
  // 1. Accepte 'null' dans les arguments
  // 2. Utilise '|| undefined' pour convertir le null en undefined avant de set le state
  const handleDateChange = (date: Date | undefined | null) =>
    setFormData({ ...formData, eventDate: date || undefined });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Nettoyage avant envoi au backend (String -> Number)
    const inputData = {
      ...formData,
      budgetTarget: parseAmount(formData.budgetTarget),
    };

    console.log("Envoi au Backend:", inputData);

    if (isEditMode) {
      updateProject({
        variables: { id: projectToEdit.id, input: inputData }
      });
    } else {
      createProjectJ1({
        variables: { 
          title: inputData.title,
          clientName: inputData.clientName,
          eventDate: inputData.eventDate,
          budgetTarget: inputData.budgetTarget,
          managerId: meData?.me?.id
        }
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
            formData={formData}
            handleChange={handleChange}
            handleSelectChange={handleSelectChange}
            handleDateChange={handleDateChange}
            handleSubmit={handleSubmit}
            loading={loading}
            userRole={userRole}
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