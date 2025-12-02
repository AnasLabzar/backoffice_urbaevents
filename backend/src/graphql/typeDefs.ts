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
    prestations: [Prestation] # ✅ Ajout de ce champ virtuel
    marketEstimate: Float
    estimatedBudget: Float
    
    team: Team!
    finalSubmission: String

    aiSummary: AiSummary

    brief: ProjectBrief
  }

  type Prestation {
    id: ID!
    project: ID!
    name: String!
    description: String
    category: String!
    quantity: Int!
    unitPrice: Float!
    totalPrice: Float!
    status: String!
    createdAt: String!
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

  type Supplier {
    id: ID!
    name: String!
    category: String!
    contactName: String!
    email: String!
    phone: String!
    address: String
    createdBy: User!
    createdAt: String!
  }

  input CreateSupplierInput {
    name: String!
    category: String!
    contactName: String!
    email: String!
    phone: String!
    address: String
  }

  input UpdateSupplierInput {
    name: String
    category: String
    contactName: String
    email: String
    phone: String
    address: String
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
    coordinators: [User!]! 
    pmJuniors: [User!]!   
  }

  input AddPrestationInput {
    projectId: ID!
    name: String!
    category: String! # RH, AUDIO_VISUELLE, HEBERGEMENT, etc.
    description: String
    quantity: Int
    unitPrice: Float
  }

  input UpdatePrestationInput {
    name: String
    category: String
    description: String
    quantity: Int
    unitPrice: Float
    status: String
  }

  type ProjectBriefRequirements {
    logistics: String
    accommodation: String
    catering: String
    audiovisual: String
    transport: String
    digital: String
    hr: String
    animation: String
  }

  type ProjectBrief {
    id: ID!
    project: ID!
    
    clientName: String
    clientNature: String
    
    projectName: String
    eventFormat: String
    toneStyle: String
    location: String
    locationType: String
    visitorsCount: Int
    startDate: String
    endDate: String
    durationDays: Int
    estimatedBudget: Float
    
    eventGoal: String
    targetAudience: [String]
    mainObjective: String
    subObjectives: [String]
    history: String
    themeConcept: String
    themeDeclination: String
    constraints: String
    
    requirements: ProjectBriefRequirements
    spaces: [String]
    
    updatedAt: String
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

  # --- INPUTS ---
  input ProjectBriefRequirementsInput {
    logistics: String
    accommodation: String
    catering: String
    audiovisual: String
    transport: String
    digital: String
    hr: String
    animation: String
  }

  input ProjectBriefInput {
    projectId: ID!
    clientName: String
    clientNature: String
    projectName: String
    eventFormat: String
    toneStyle: String
    location: String
    locationType: String
    visitorsCount: Int
    startDate: String
    endDate: String
    durationDays: Int
    estimatedBudget: Float
    eventGoal: String
    targetAudience: [String]
    mainObjective: String
    subObjectives: [String]
    history: String
    themeConcept: String
    themeDeclination: String
    constraints: String
    requirements: ProjectBriefRequirementsInput
    spaces: [String]
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
    
    # ✅ AJOUTEZ CES DEUX LIGNES :
    marketEstimate: Float
    estimatedBudget: Float
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
    coordinatorIds: [ID!]!
    pmJuniorIds: [ID!]!
  }

  input PMCreateTaskInput {
    description: String!
    projectId: ID!
    assignedToId: ID!
    department: String!
    dueDate: String
  }
  
  # --- NEW INPUT FOR DYNAMIC PM ASSIGNMENT ---
  input DynamicPMAssignmentInput {
    projectId: ID!
    newPmId: ID!
  }
  # -------------------------------------------

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

  # Zid had l-input jdid (foq l-Query)
  input ProjectFilterInput {
    preparationStatus: String
  }

  type AiSummary {
    summary: String
    thematic: String
    risks: [String]
    generatedAt: String
  }

  type Query {
    me: User
    users(role: String, roles: [String!]): [User!] 
    projects_proposals: [Project!]
    
    projects(filter: ProjectFilterInput): [Project!]
    suppliers: [Supplier!]
    supplier(id: ID!): Supplier
    projects_feed: [ProjectFeedItem!]
    project(id: ID!): Project
    tasksByProject(projectId: ID!): [Task!]
    logs(projectId: ID): [ActivityLog!]
    myTasks: [Task!]
    allTasks: [Task!]
    myNotifications: [Notification!]
    getProjectBrief(projectId: ID!): ProjectBrief
    prestationsByProject(projectId: ID!): [Prestation!]!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!

    generateCPSSummary(projectId: ID!): Project
    
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

    createSupplier(input: CreateSupplierInput!): Supplier!
    updateSupplier(id: ID!, input: UpdateSupplierInput!): Supplier!
    deleteSupplier(id: ID!): Boolean
    
    # Admin
    admin_createUser(input: CreateUserInput!): User!
    admin_createRole(input: CreateRoleInput!): Role!
    admin_assignProject(input: AdminAssignProjectInput!): Project!
    admin_assignTeams(projectId: ID!, teamMemberIds: [ID!]!): Project!
    admin_updateProjectStage(projectId: ID!, stage: String!, status: String!): Project!
    admin_runFeasibility(input: AdminFeasibilityInput!): Project!
    admin_launchProject(projectId: ID!): Project!
    
    # --- NEW MUTATION: DYNAMIC PM ASSIGNMENT ---
    assignDynamicProjectManager(input: DynamicPMAssignmentInput!): Project!
    # -------------------------------------------

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

    # Notifications
    markNotificationAsRead(notificationId: ID!): Notification
    markAllNotificationsAsRead: Boolean

    addPrestation(input: AddPrestationInput!): Prestation!
    updatePrestation(id: ID!, input: UpdatePrestationInput!): Prestation!
    deletePrestation(id: ID!): Boolean

    saveProjectBrief(input: ProjectBriefInput!): ProjectBrief!
  }

  # Zid f Subscription
  type Subscription {
    taskCreated(userId: ID!): Task
    taskUpdated: Task
    # HADI L-JDIDA L-MOHIMMA
    newNotification(userId: ID!): Notification
  }

  # Zid had l-Type l-jdid
  type Notification {
    id: ID!
    level: NotificationLevel!
    message: String!
    link: String
    createdAt: String!
    # Check wach l-user l-current qraha wla mazal
    isRead: Boolean 
  }

  # Zid had l-Enum l-jdid
  enum NotificationLevel {
    INFO
    STANDARD
    IMPORTANT
    URGENT
    DEADLINE
  }
`;