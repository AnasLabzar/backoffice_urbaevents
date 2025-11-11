// src/graphql/typeDefs.ts
import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
  }

  type Role {
    id: ID!
    name: String!
    permissions: [String!]!
  }

  type Document {
    id: ID!
    fileName: String!
    fileUrl: String!
    originalFileName: String
    uploadedBy: User!
    createdAt: String!
  }

  type ProposalAvis {
    status: String!
    reason: String
    givenBy: User!
    givenAt: String!
  }

  type Project {
    id: ID!
    projectCode: String!
    projectType: String!
    createdBy: User!
    title: String!
    object: String!
    referenceAO: String
    technicalOfferRequired: Boolean!
    location: String
    submissionDeadline: String!
    cautionRequestDate: String
    estimatedBudget: Float
    cautionAmount: Float
    preparationStatus: String!
    projectManagers: [User!]!
    assignedTeam: [User!]!
    generalStatus: String!
    currentStage: String!
    stages: Stages!
    feasibilityChecks: FeasibilityChecks!
    proposalAvis: ProposalAvis
    caution: Caution!
    team: Team!
    finalSubmission: String
  }

  type Stages {
    administrative: Stage!
    technical: Stage!
    technicalOffer: Stage!
    financialOffer: Stage!
    printing: Stage!
    workshop: Stage!
    field: Stage!
    logistics: Stage!
  }

  type Stage {
    status: String!
    deadline: String
    responsible: [String!]!
    documents: [Document!]!
  }

  type FeasibilityChecks {
    administrative: String!
    technical: String!
    financial: String!
  }

  type Caution {
    status: String!
    requestedBy: User
    requestedAt: String
  }

  type Team {
    infographistes: [User!]!
    team3D: [User!]!
    assistants: [User!]!
  }

  type Task {
    id: ID!
    description: String!
    project: Project!
    assignedTo: User!
    department: String!
    status: String!
    dueDate: String
    createdAt: String!
    updatedAt: String!
    v1Uploads: [Document!]!
    finalUpload: Document
  }

  type ActivityLog {
    id: ID!
    user: User!
    project: Project
    action: String!
    details: String!
    createdAt: String!
  }

  type ProjectFeedItem {
    project: Project!
    latestTask: Task
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input CreateProjectInput {
    projectType: String!
    title: String!
    object: String!
    referenceAO: String
    technicalOfferRequired: Boolean!
    location: String
    submissionDeadline: String!
    cautionRequestDate: String
    estimatedBudget: Float
    cautionAmount: Float
  }

  input UpdateProjectInput {
    title: String
    object: String
    status: String
  }

  input AdminAssignProjectInput {
    projectId: ID!
    projectManagerIds: [ID!]!
    status: String!
  }

  input AdminFeasibilityInput {
    projectId: ID!
    checkType: String!
    status: String!
  }

  input CPAssignTeamInput {
    projectId: ID!
    infographisteIds: [ID!]!
    team3DIds: [ID!]!
    assistantIds: [ID!]!
  }

  input PMCreateTaskInput {
    description: String!
    projectId: ID!
    assignedToId: ID!
    department: String!
    dueDate: String
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    roleName: String!
  }

  input CreateRoleInput {
    name: String!
    permissions: [String!]!
  }

  type Query {
    me: User
    users(role: String): [User!]!
    projects_proposals: [Project!]!
    projects_feed: [ProjectFeedItem!]!
    project(id: ID!): Project
    tasksByProject(projectId: ID!): [Task!]!
    logs(projectId: ID): [ActivityLog!]!
    myTasks: [Task!]!
    allTasks: [Task!]!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    
    # Proposal Manager
    proposal_createProject(input: CreateProjectInput!): Project!
    proposal_uploadDocument(
      projectId: ID!
      stageName: String!
      docType: String!
      fileUrl: String!
      originalFileName: String!
    ): Project!
    proposal_submitForReview(projectId: ID!): Project!
    
    # Admin
    admin_createUser(input: CreateUserInput!): User!
    admin_createRole(input: CreateRoleInput!): Role!
    admin_assignProject(input: AdminAssignProjectInput!): Project!
    admin_assignTeams(projectId: ID!, teamMemberIds: [ID!]!): Project!
    admin_updateProjectStage(projectId: ID!, stage: String!, status: String!): Project!
    admin_runFeasibility(input: AdminFeasibilityInput!): Project!
    admin_launchProject(projectId: ID!): Project!
    
    # Project Manager
    pm_createTask(input: PMCreateTaskInput!): Task!
    pm_updateTaskStatus(taskId: ID!, status: String!): Task!
    pm_validateStage(projectId: ID!, stage: String!): Project!
    giveProposalAvis(projectId: ID!, status: String!, reason: String): Project!
    
    # CP
    cp_uploadEstimate(projectId: ID!, fileUrl: String!, originalFileName: String!): Project!
    cp_assignTeam(input: CPAssignTeamInput!): Project!
    cp_uploadFinalOffer(projectId: ID!, fileUrl: String!, originalFileName: String!): Project!
    cp_uploadAsset(projectId: ID!, fileUrl: String!, originalFileName: String!): Project!
    
    # Finance
    finance_requestCaution(projectId: ID!): Project!
    
    # Assistant
    assistant_uploadMethodology(projectId: ID!, fileUrl: String!, originalFileName: String!): Project!
    
    # Team
    team_uploadTaskV1(taskId: ID!, fileUrl: String!, originalFileName: String!): Task!
    team_uploadTaskFinal(taskId: ID!, fileUrl: String!, originalFileName: String!): Task!
  }

  type Subscription {
    taskCreated(userId: ID!): Task!
  }
`;