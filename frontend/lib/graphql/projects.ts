// src/lib/graphql/projects.ts
import { gql } from "@apollo/client";

export const ME_QUERY = gql` query Me { me { id role { name permissions } } }`;

// ✅ AJOUTEZ CETTE REQUÊTE (Indispensable pour le panier Admin)
export const GET_ALL_USERS = gql`
  query GetAllUsers {
    users { 
      id 
      name 
      email 
      role { name } 
    }
  }
`;

export const GENERATE_CPS_SUMMARY_MUTATION = gql`
  mutation GenerateCPSSummary($projectId: ID!) {
    generateCPSSummary(projectId: $projectId) {
      id
      aiSummary {
        summary
        thematic
      }
    }
  }
`;

export const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id
        title
        object
        status: generalStatus
        preparationStatus
        
        # Champs Edit
        projectType
        referenceAO
        technicalOfferRequired
        submissionDeadline
        
        # Champs financiers
        marketEstimate
        estimatedBudget
        cautionAmount

        # Bloc IA
        aiSummary {
            summary
            thematic
            generatedAt
        }
        
        # 👇 AJOUT DE L'EMAIL ICI (Important pour les avatars)
        projectManagers { 
            id 
            name 
            email 
        }

        stages { 
          administrative { documents { id fileName fileUrl } }
          technical { documents { id fileName fileUrl originalFileName } }
        }
        
        cautionRequestDate
        feasibilityChecks {
          administrative
          technical
          financial
        }
        caution {
          status
        }
        
        # 👇 AJOUT DE L'EMAIL DANS TOUTE L'ÉQUIPE (Important pour les avatars)
        team {
          infographistes { id name email }
          team3D { id name email }
          coordinators { id name email }
        }
        
        proposalAvis {
          status
          reason
          givenBy { name }
          givenAt
        }
      }
      latestTask { id description status createdAt }
    }
  }
`;

export const GET_PROJECT_MANAGERS = gql`
  query GetProjectManagers {
    # 👇 AJOUT DE L'EMAIL ICI AUSSI (Pour le filtre dropdown)
    users(role: "PROJECT_MANAGER") { 
        id 
        name 
        email 
    }
  }
`;

export const GET_TEAM_MEMBERS = gql`
  query GetTeamMembers {
    infographistes: users(role: "CREATIVE") { id name }
    team3D: users(role: "3D_ARTIST") { id name }
    coordinators: users(role: "COORDINATOR") { id name }
  }
`;

export const GET_LOGS_QUERY = gql`
  query GetLogs($projectId: ID!) {
    logs(projectId: $projectId) {
      id
      details
      createdAt
      user { name }
    }
  }
`;

export const GET_ESTIMATION = gql`
  query GetProjectEstimation($projectId: ID!) {
    getProjectEstimation(projectId: $projectId) {
      id
      totalAmount
    }
  }
`;

export const GET_TASKS_BY_PROJECT_QUERY = gql`
  query GetTasksByProject($projectId: ID!) {
    tasksByProject(projectId: $projectId) {
      id
      description
      status
      department
      createdAt 
      assignedTo { id name }
      v1Uploads { id fileUrl originalFileName createdAt }
      finalUpload { id fileUrl originalFileName createdAt }
    }
  }
`;

export const TASK_CREATED_SUBSCRIPTION = gql`
    subscription TaskCreated($userId: ID!) {
      taskCreated(userId: $userId) {
        id
        description
        status
        project { id }
        assignedTo { id }
      }
    }
`;

export const TASK_UPDATED_SUBSCRIPTION = gql`
    subscription TaskUpdated {
      taskUpdated {
        id
        description
        status
        project { id }
      }
    }
`;

// --- MUTATIONS ---

export const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id 
      title 
      object 
      status: generalStatus
      
      # ✅ AJOUTÉ : Retourner ces champs permet de mettre à jour le cache Apollo instantanément
      preparationStatus
      estimatedBudget
      cautionAmount
      marketEstimate
      referenceAO
      submissionDeadline
      technicalOfferRequired
      projectType
    }
  }
`;

export const UPLOAD_DOCUMENT_MUTATION = gql`
  mutation UploadDocument($projectId: ID!, $stageName: String!, $docType: String!, $fileUrl: String!, $originalFileName: String!) {
    proposal_uploadDocument(projectId: $projectId, stageName: $stageName, docType: $docType, fileUrl: $fileUrl, originalFileName: $originalFileName) { id stages { administrative { documents { id fileName } } } }
  }
`;

export const SUBMIT_REVIEW_MUTATION = gql`
  mutation SubmitForReview($projectId: ID!) {
    proposal_submitForReview(projectId: $projectId) { id preparationStatus }
  }
`;

export const ADMIN_ASSIGN_PROJECT_MUTATION = gql`
  mutation AdminAssignProject($input: AdminAssignProjectInput!) {
    admin_assignProject(input: $input) {
      id
      preparationStatus
      projectManagers { id name }
    }
  }
`;

export const CP_UPLOAD_ESTIMATE_MUTATION = gql`
  mutation CpUploadEstimate($projectId: ID!, $fileUrl: String!, $originalFileName: String!) {
    cp_uploadEstimate(projectId: $projectId, fileUrl: $fileUrl, originalFileName: $originalFileName) { id preparationStatus }
  }
`;

export const ADMIN_RUN_FEASIBILITY_MUTATION = gql`
  mutation AdminRunFeasibility($input: AdminFeasibilityInput!) {
    admin_runFeasibility(input: $input) { id feasibilityChecks { administrative technical financial } }
  }
`;

export const ADMIN_LAUNCH_PROJECT_MUTATION = gql`
  mutation AdminLaunchProject($projectId: ID!) {
    admin_launchProject(projectId: $projectId) { id preparationStatus }
  }
`;

export const FINANCE_REQUEST_CAUTION_MUTATION = gql`
  mutation FinanceRequestCaution($projectId: ID!) {
    finance_requestCaution(projectId: $projectId) { id caution { status } preparationStatus }
  }
`;

export const CP_ASSIGN_TEAM_MUTATION = gql`
  mutation CpAssignTeam($input: CPAssignTeamInput!) {
    cp_assignTeam(input: $input) { id team { infographistes { id } team3D { id } coordinators { id } } }
  }
`;

export const PM_CREATE_TASK_MUTATION = gql`
  mutation PmCreateTask($input: PMCreateTaskInput!) {
    pm_createTask(input: $input) { id description status }
  }
`;

export const PM_UPDATE_TASK_STATUS_MUTATION = gql`
  mutation PmUpdateTaskStatus($taskId: ID!, $status: String!) {
    pm_updateTaskStatus(taskId: $taskId, status: $status) { id status }
  }
`;

export const CP_UPLOAD_ASSET_MUTATION = gql`
  mutation CpUploadAsset($projectId: ID!, $fileUrl: String!, $originalFileName: String!) {
    cp_uploadAsset(projectId: $projectId, fileUrl: $fileUrl, originalFileName: $originalFileName) {
      id
      stages { technical { documents { id } } }
    }
  }
`;

export const TEAM_UPLOAD_TASK_V1_MUTATION = gql`
  mutation TeamUploadTaskV1($taskId: ID!, $fileUrl: String!, $originalFileName: String!) {
    team_uploadTaskV1(taskId: $taskId, fileUrl: $fileUrl, originalFileName: $originalFileName) {
      id
      v1Uploads { id }
    }
  }
`;

export const TEAM_UPLOAD_TASK_FINAL_MUTATION = gql`
  mutation TeamUploadTaskFinal($taskId: ID!, $fileUrl: String!, $originalFileName: String!) {
    team_uploadTaskFinal(taskId: $taskId, fileUrl: $fileUrl, originalFileName: $originalFileName) {
      id
      status
      finalUpload { id }
    }
  }
`;

export const GIVE_PROPOSAL_AVIS_MUTATION = gql`
  mutation GiveProposalAvis($projectId: ID!, $status: String!, $reason: String) {
    giveProposalAvis(projectId: $projectId, status: $status, reason: $reason) {
      id
      preparationStatus
      proposalAvis {
        status
        reason
        givenBy { name }
        givenAt
      }
    }
  }
`;

export const DELETE_DOCUMENT_MUTATION = gql`
  mutation DeleteDocument($projectId: ID!, $documentId: ID!, $stageName: String!) {
    proposal_deleteDocument(projectId: $projectId, documentId: $documentId, stageName: $stageName) {
      id
      stages { 
        administrative { documents { id fileName originalFileName } }
        technical { documents { id fileName originalFileName } }
      }
    }
  }
`;