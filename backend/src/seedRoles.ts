import mongoose from 'mongoose';
import Role from './models/Role';
import 'dotenv/config';

async function seedRoles() {
    try {
        const isProduction = process.env.NODE_ENV === 'production';
        const dbURI = isProduction ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;
        const uri = dbURI || 'mongodb+srv://anas:anas@cluster0.nnfdp.mongodb.net/urba-backoffice?appName=Cluster0';
        
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const rolesToCreate = ['DG', 'DO', 'CP', 'CREA', 'ACHATS', 'TECH', 'CPTA'];
        
        // Give new roles some baseline permissions to avoid validation errors
        // or just an empty array if not strictly enforced. Wait, Role schema requires at least one permission?
        // RoleSchema: permissions: [{ type: String, required: true }] - actually if the array is empty, it might be valid, but let's just give a dummy permission to be safe.
        const defaultPermissions = ['view_all_projects_readonly'];

        for (const roleName of rolesToCreate) {
            let role = await Role.findOne({ name: roleName });
            if (!role) {
                await Role.create({ name: roleName, permissions: defaultPermissions as any });
                console.log(`Created role: ${roleName}`);
            } else {
                console.log(`Role already exists: ${roleName}`);
            }
        }

        // Update ADMIN role to mimic DG (which currently implies all permissions)
        const ALL_PERMISSIONS = [
            'configure_roles', 'manage_users', 'assign_project_managers', 'assign_teams', 
            'set_project_status', 'view_all_logs', 'view_all_analytics', 'view_financial_dashboard', 
            'view_global_architecture', 'view_all_projects_readonly', 'create_project_proposal', 
            'manage_assigned_projects', 'assign_creative_tasks', 'add_photographiste', 
            'update_workflow_stage', 'view_team_logs', 'view_team_analytics', 'assign_dynamic_pm', 
            'manage_own_tasks', 'upload_methodology'
        ];

        let adminRole = await Role.findOne({ name: 'ADMIN' });
        if (adminRole) {
            adminRole.permissions = ALL_PERMISSIONS as any;
            await adminRole.save();
            console.log('ADMIN role updated with all permissions.');
        } else {
            await Role.create({ name: 'ADMIN', permissions: ALL_PERMISSIONS as any });
            console.log('Created ADMIN role.');
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}

seedRoles();
