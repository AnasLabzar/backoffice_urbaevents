import mongoose, { Document, Schema } from 'mongoose';

// L-Permission (b l-anglais)
export type Permission =
  // Admin
  | 'configure_roles'
  | 'manage_users'
  | 'assign_project_managers'
  | 'assign_teams'
  | 'set_project_status'
  | 'view_all_logs'
  | 'view_all_analytics'
  // Proposal Manager (Yassmin's Role)
  | 'create_project_proposal'
  // Project Manager (CP) 
  | 'manage_assigned_projects'
  | 'assign_creative_tasks'
  | 'add_photographiste'
  | 'update_workflow_stage'
  | 'view_team_logs'
  | 'view_team_analytics'
  // --- NEW PERMISSIONS ---
  | 'assign_dynamic_pm' // Permisssion l-Admin bach ykhter l-PM l-dynamic
  // --- END NEW PERMISSIONS ---
  | 'manage_own_tasks' // déjà kayn, kanzidoh ghir bach ykoun explicit
  | 'upload_methodology' // déjà kayn
;

export interface IRole extends Document {
  name: string; // e.g., 'ADMIN', 'PROPOSAL_MANAGER', 'PROJECT_MANAGER'
  permissions: Permission[];
}

const RoleSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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