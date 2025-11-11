"use client";

import * as React from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react"; // Zidna useQuery
import { toast } from "sonner";
import { format } from "date-fns";
import { IconCalendar as CalendarIcon, IconPlus } from "@tabler/icons-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Imports dyal l-UI
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription,
  DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer";
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
import { Checkbox } from "@/components/ui/checkbox"; // Zid hadi

// --- L-API ---

// 1. L-Mutation dyal "Create"
const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    proposal_createProject(input: $input) { 
      id 
      projectCode 
      title 
      technicalOfferRequired 
    }
  }
`;

// 2. L-Mutation dyal "Upload" (BDILNAHA: Db katkhod ghir l-URL)
const UPLOAD_DOCUMENT_MUTATION = gql`
  mutation UploadDocument(
    $projectId: ID!
    $stageName: String!
    $fileName: String!
    $fileUrl: String!
  ) {
    proposal_uploadDocument(
      projectId: $projectId
      stageName: $stageName
      fileName: $fileName
      fileUrl: $fileUrl
    ) {
      id
      stages {
        administrative { documents { id fileName } }
        technical { documents { id fileName } }
      }
    }
  }
`;

// 3. L-Mutation dyal "Submit"
const SUBMIT_REVIEW_MUTATION = gql`
  mutation SubmitForReview($projectId: ID!) {
    proposal_submitForReview(projectId: $projectId) {
      id
      preparationStatus
    }
  }
`;

// 4. L-Query dyal "Refetch"
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

// 5. L-Query dyal "Me" (Bach n3rfo l-role)
const ME_QUERY = gql` query Me { me { id role { name } } }`;

// --- L-COMPONENT DYAL L-FORM (Bo7do) ---
function ProjectFormContent({
  formData,
  handleChange,
  handleSelectChange,
  handleDateChange,
  handleCheckboxChange, // Zid had l-function
  handleSubmit,
  loading,
  userRole,
}: {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (id: string, value: string) => void;
  handleDateChange: (date: Date | undefined) => void;
  handleCheckboxChange: (id: string, checked: boolean) => void; // Zid had l-parameter
  handleSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  userRole: string;
}) {

  // N-affichiw l-form ghir l-PROPOSAL_MANAGER
  if (userRole === 'PROPOSAL_MANAGER' || userRole === 'ADMIN') {
    return (
      <form
        id="create-project-form"
        className="flex flex-col gap-4 overflow-y-auto px-4 text-sm"
        onSubmit={handleSubmit}
      >
        {/* L-Form 3adia (Title, Object, Type, Date...) */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="title">Nom du Client (Titre)</Label>
          <Input id="title" value={formData.title} onChange={handleChange} required />
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="object">Objet du Projet</Label>
          <Input id="object" value={formData.object} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <Label htmlFor="projectType">Type</Label>
            <Select value={formData.projectType} onValueChange={(value) => handleSelectChange("projectType", value)}>
              <SelectTrigger id="projectType"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC_TENDER">Appel d'Offre</SelectItem>
                <SelectItem value="CONFIRMED">Projet Confirmé</SelectItem>
                <SelectItem value="INTERNAL">Projet Interne</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="submissionDeadline">Date de Dépôt</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("justify-start text-left font-normal", !formData.submissionDeadline && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.submissionDeadline ? format(formData.submissionDeadline, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={formData.submissionDeadline} onSelect={handleDateChange} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-3">
            <Label htmlFor="referenceAO">Référence AO</Label>
            <Input id="referenceAO" value={formData.referenceAO} onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="estimatedBudget">Estimation (DH)</Label>
            <Input id="estimatedBudget" type="number" value={formData.estimatedBudget} onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="cautionAmount">Caution (DH)</Label>
            <Input id="cautionAmount" type="number" value={formData.cautionAmount} onChange={handleChange} />
          </div>
        </div>

        {/* ZID HAD L-CHECKBOX DYAL technicalOfferRequired */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="technicalOfferRequired"
            checked={formData.technicalOfferRequired}
            onCheckedChange={(checked) => handleCheckboxChange("technicalOfferRequired", checked as boolean)}
          />
          <Label htmlFor="technicalOfferRequired" className="text-sm font-normal cursor-pointer">
            Offre technique requise
          </Label>
        </div>

      </form>
    );
  }

  // Ila kan ay role khor (Admin, CP...), ma 3ndouch l-7aq y-crea
  return (
    <div className="px-4 text-sm text-red-500">
      Vous n'avez pas la permission de créer un projet.
    </div>
  );
}

// --- L-COMPONENT L-RA2ISSI (Drawer/Sheet) ---
export function CreateProjectDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const { data: meData } = useQuery(ME_QUERY);
  const userRole = meData?.me.role.name;

  // State w Logic dyal l-Form - ZID technicalOfferRequired
  const [formData, setFormData] = React.useState({
    title: "",
    object: "",
    projectType: "PUBLIC_TENDER",
    submissionDeadline: new Date(),
    referenceAO: "",
    estimatedBudget: 0,
    cautionAmount: 0,
    technicalOfferRequired: true, // ZID HAD L-CHAMP
  });

  const [createProject, { loading }] = useMutation(CREATE_PROJECT_MUTATION, {
    onCompleted: (data) => {
      toast.success(`Projet créé (Draft): ${data.proposal_createProject.projectCode}`);
      setIsOpen(false);
      // N-reset l-form
      setFormData({
        title: "", object: "", projectType: "PUBLIC_TENDER",
        submissionDeadline: new Date(), referenceAO: "",
        estimatedBudget: 0, cautionAmount: 0,
        technicalOfferRequired: true, // ZID HNA KAMAL
      });
    },
    onError: (error) => { toast.error(`Error: ${error.message}`); },
    refetchQueries: [{ query: GET_PROJECTS_FEED }]
  });

  // Functions dyal l-Form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setFormData({
      ...formData,
      [id]: type === 'number' ? parseFloat(value) : value,
    });
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData({ ...formData, [id]: value });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) { setFormData({ ...formData, submissionDeadline: date }); }
  };

  // ZID HAD L-FUNCTION DYAL L-CHECKBOX
  const handleCheckboxChange = (id: string, checked: boolean) => {
    setFormData({ ...formData, [id]: checked });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'PROPOSAL_MANAGER' && userRole !== 'ADMIN') {
      toast.error("Action non autorisée.");
      return;
    }

    createProject({
      variables: {
        input: {
          ...formData,
          submissionDeadline: formData.submissionDeadline.toISOString(),
          estimatedBudget: parseFloat(formData.estimatedBudget.toString()) || 0,
          cautionAmount: parseFloat(formData.cautionAmount.toString()) || 0,
          technicalOfferRequired: formData.technicalOfferRequired, // ZID HNA
        },
      },
    });
  };

  const triggerButton = (
    <Button variant="outline" size="sm">
      <IconPlus className="mr-2 h-4 w-4" />
      <span className="hidden lg:inline">Add Project</span>
      <span className="lg:hidden">Add</span>
    </Button>
  );

  // L-Check dyal l-Mobile/Desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="gap-1">
            <DrawerTitle>Créer un Nouveau Projet</DrawerTitle>
            <DrawerDescription>
              Étape 1: Entrer les informations de base.
            </DrawerDescription>
          </DrawerHeader>

          <ProjectFormContent
            formData={formData}
            handleChange={handleChange}
            handleSelectChange={handleSelectChange}
            handleDateChange={handleDateChange}
            handleCheckboxChange={handleCheckboxChange} // ZID HNA
            handleSubmit={handleSubmit}
            loading={loading}
            userRole={userRole}
          />

          <DrawerFooter>
            <Button
              form="create-project-form"
              type="submit"
              disabled={loading || (userRole !== 'PROPOSAL_MANAGER' && userRole !== 'ADMIN')} // CORRECTION: && au lieu de ||
            >
              {loading ? "Création..." : "Créer le Projet (Draft)"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Annuler</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // L-Code dyal l-PC (Sheet)
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader className="gap-1">
          <SheetTitle>Créer un Nouveau Projet</SheetTitle>
          <SheetDescription>
            Étape 1: Entrer les informations de base.
          </SheetDescription>
        </SheetHeader>

        <ProjectFormContent
          formData={formData}
          handleChange={handleChange}
          handleSelectChange={handleSelectChange}
          handleDateChange={handleDateChange}
          handleCheckboxChange={handleCheckboxChange} // ZID HNA
          handleSubmit={handleSubmit}
          loading={loading}
          userRole={userRole}
        />

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Annuler</Button>
          </SheetClose>
          <Button
            form="create-project-form"
            type="submit"
            disabled={loading || (userRole !== 'PROPOSAL_MANAGER' && userRole !== 'ADMIN')} // CORRECTION: && au lieu de ||
          >
            {loading ? "Création..." : "Créer le Projet (Draft)"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}