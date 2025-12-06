import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar Upload

  # --- ENTITY TYPES ---

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

  # ✅ MODIFIED: Invoice Architecture
  type InvoiceItem {
    id: ID!
    invoice: ID!
    project: ID
    
    # Content Snapshot
    category: String!
    subCategory: String
    designation: String!
    description: String
    unit: String
    
    # Financials
    quantity: Float!
    unitPrice: Float!
    totalPrice: Float!
    
    createdAt: String
    updatedAt: String
  }

  type Invoice {
    id: ID!
    project: ID!
    type: String!        
    reference: String!   
    status: String!      
    
    # ✅ Items are now explicit objects
    items: [InvoiceItem]
    
    totalAmount: Float
    createdBy: User
    createdAt: String
    updatedAt: String
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
    
    # Computed / Linked fields
    prestations: [Prestation] 
    invoices: [Invoice]
    brief: ProjectBrief
    
    marketEstimate: Float
    estimatedBudget: Float
    
    team: Team!
    finalSubmission: String

    aiSummary: AiSummary
  }

  # ✅ MODIFIED: Prestation is now just a Catalog Item
  type Prestation {
    id: ID!
    project: ID
    category: String!
    subCategory: String
    designation: String! # Name in DB
    name: String         # Alias for frontend compatibility
    description: String
    unit: String
    unitPrice: Float     # Default Price
    supplier: String
    createdAt: String
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

  type AiSummary {
    summary: String
    thematic: String
    risks: [String]
    generatedAt: String
  }

  type Notification {
    id: ID!
    level: NotificationLevel!
    message: String!
    link: String
    createdAt: String!
    isRead: Boolean 
  }

  enum NotificationLevel {
    INFO
    STANDARD
    IMPORTANT
    URGENT
    DEADLINE
  }

  # --- INPUTS ---

  # ✅ NEW: Input for creating an Invoice Item
  input AddInvoiceItemInput {
    invoiceId: ID!
    projectId: ID
    category: String!
    subCategory: String
    name: String!       # Maps to designation
    description: String
    quantity: Float!
    unitPrice: Float!
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

  input AddPrestationInput {
    projectId: ID!
    name: String!
    category: String!
    description: String
    unit: String
    unitPrice: Float
  }

  input UpdatePrestationInput {
    name: String
    category: String
    description: String
    unit: String
    unitPrice: Float
  }

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
   
  input DynamicPMAssignmentInput {
    projectId: ID!
    newPmId: ID!
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

  input ProjectFilterInput {
    preparationStatus: String
  }

  # --- QUERY ---

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
    myTasks: [Task!]
    allTasks: [Task!]
    
    logs(projectId: ID): [ActivityLog!]
    myNotifications: [Notification!]
    
    getProjectBrief(projectId: ID!): ProjectBrief
    getProjectEstimation(projectId: ID!): Invoice
    
    getInvoiceItems(invoiceId: ID!): [InvoiceItem]
    getPrestationCatalog: [String]
    searchPrestation(category: String, subCategory: String, search: String): [Prestation]

    # Legacy / Catalog Queries
    prestationsByProject(projectId: ID!): [Prestation!]!
  }

  # --- MUTATION ---

  type Mutation {
    # Auth
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    # Projects
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    generateCPSSummary(projectId: ID!): Project
    
    # Proposal
    proposal_createProject(input: CreateProjectInput!): Project!
    proposal_uploadDocument(
      projectId: ID!
      stageName: String!
      docType: String!
      fileUrl: String!
      originalFileName: String!
    ): Project!
    proposal_submitForReview(projectId: ID!): Project!
    
    # Suppliers
    createSupplier(input: CreateSupplierInput!): Supplier!
    updateSupplier(id: ID!, input: UpdateSupplierInput!): Supplier!
    deleteSupplier(id: ID!): Boolean
    
    # Prestations (Catalog)
    addPrestation(input: AddPrestationInput!): Prestation!
    updatePrestation(id: ID!, input: UpdatePrestationInput!): Prestation!
    deletePrestation(id: ID!): Boolean
    
    # ✅ NEW: Invoicing Mutations
    addInvoiceItem(input: AddInvoiceItemInput!): InvoiceItem!
    deleteInvoiceItem(id: ID!): Boolean
    importPrestationsFromExcel(projectId: ID!, invoiceId: ID!, fileUrl: String!): [InvoiceItem] # Updated return type

    # Brief
    saveProjectBrief(input: ProjectBriefInput!): ProjectBrief!

    # Admin
    admin_createUser(input: CreateUserInput!): User!
    admin_createRole(input: CreateRoleInput!): Role!
    admin_assignProject(input: AdminAssignProjectInput!): Project!
    admin_assignTeams(projectId: ID!, teamMemberIds: [ID!]!): Project!
    admin_updateProjectStage(projectId: ID!, stage: String!, status: String!): Project!
    admin_runFeasibility(input: AdminFeasibilityInput!): Project!
    admin_launchProject(projectId: ID!): Project!
    assignDynamicProjectManager(input: DynamicPMAssignmentInput!): Project!
    
    # Tasks & Project Management
    pm_createTask(input: PMCreateTaskInput!): Task!
    pm_updateTaskStatus(taskId: ID!, status: String!): Task!
    pm_validateStage(projectId: ID!, stage: String!): Project!
    giveProposalAvis(projectId: ID!, status: String!, reason: String): Project!
    
    # CP & Uploads
    cp_uploadEstimate(projectId: ID!, fileUrl: String!, originalFileName: String!): Project!
    cp_assignTeam(input: CPAssignTeamInput!): Project!
    cp_uploadFinalOffer(projectId: ID!, fileUrl: String!, originalFileName: String!): Project!
    cp_uploadAsset(projectId: ID!, fileUrl: String!, originalFileName: String!): Project!
    
    # Finance
    finance_requestCaution(projectId: ID!): Project!
    
    # Assistant
    assistant_uploadMethodology(projectId: ID!, fileUrl: String!, originalFileName: String!): Project!
    
    # Team Uploads
    team_uploadTaskV1(taskId: ID!, fileUrl: String!, originalFileName: String!): Task!
    team_uploadTaskFinal(taskId: ID!, fileUrl: String!, originalFileName: String!): Task!

    # Notifications
    markNotificationAsRead(notificationId: ID!): Notification
    markAllNotificationsAsRead: Boolean
  }

  # --- SUBSCRIPTION ---

  type Subscription {
    taskCreated(userId: ID!): Task
    taskUpdated: Task
    newNotification(userId: ID!): Notification
  }
`;