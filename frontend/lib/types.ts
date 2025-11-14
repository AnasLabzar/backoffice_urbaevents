// Interface dyal Task
export interface Task {
    id: string;
    description: string;
    status: "TODO" | "IN_PROGRESS" | "DONE";
    department: "CREATIVE" | "3D_ARTIST" | "ASSISTANT_PM" | "PROJECT_MANAGEMENT" | "TECHNICAL_OFFICE" | "WORKSHOP" | "FIELD" | "LOGISTICS";
    dueDate: string | null;
    createdAt: string;
    updatedAt?: string;
    assignedTo: {
        id: string;
        name: string;
        email: string;
    };
    project: {
        id: string;
        object: string;
        title: string;
    };
    v1Uploads: Array<{
        id: string;
        fileName: string;
        fileUrl: string;
        originalFileName: string;
        uploadedBy: {
            id: string;
            name: string;
        };
    }>;
    finalUpload: {
        id: string;
        fileName: string;
        fileUrl: string;
        originalFileName: string;
        uploadedBy: {
            id: string;
            name: string;
        };
    } | null;
}

// Interface dyal Project (mn data-table.tsx)
export interface Project {
    id: string;
    title: string;
    object: string;
    preparationStatus: string;
    projectManagers: { id: string, name: string }[];
    submissionDeadline: string;
    team: {
        infographistes: { id: string, name: string }[];
        team3D: { id: string, name: string }[];
        assistants: { id: string, name: string }[];
    };
    // Zid ay fields khrin kat-7tajhom
    stages: any;
    feasibilityChecks: any;
    caution: any;
}