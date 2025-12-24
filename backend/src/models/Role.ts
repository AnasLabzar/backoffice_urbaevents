import mongoose, { Document, Schema } from 'mongoose';

// L-Permission (b l-anglais)
export type Permission =
  // --- ADMIN (Full Access) ---
  | 'configure_roles'
  | 'manage_users'
  | 'assign_project_managers'
  | 'assign_teams'
  | 'set_project_status'
  | 'view_all_logs'
  
  // --- ANALYTICS & VIEWING (Hado li hmzin l Patron/Moderator) ---
  | 'view_all_analytics'        // Kan deja kayn, mohim l moderator
  | 'view_financial_dashboard'  // Jdid: Bach ychof lflouss/budget
  | 'view_global_architecture'  // Jdid: Bach ychof l-structure d les projets kamlin
  | 'view_all_projects_readonly' // Jdid: Ychof details bla mayqder ymodifiyer

  // --- PROPOSAL MANAGER ---
  | 'create_project_proposal'

  // --- PROJECT MANAGER (CP) ---
  | 'manage_assigned_projects'
  | 'assign_creative_tasks'
  | 'add_photographiste'
  | 'update_workflow_stage'
  | 'view_team_logs'
  | 'view_team_analytics'
  
  // --- DYNAMIC & TASKS ---
  | 'assign_dynamic_pm'
  | 'manage_own_tasks'
  | 'upload_methodology'
;

export interface IRole extends Document {
  name: string; 
  permissions: Permission[];
}

const RoleSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // E.g., 'MODERATOR'
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IRole>('Role', RoleSchema);