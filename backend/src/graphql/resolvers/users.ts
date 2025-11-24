import { ApolloError } from 'apollo-server-errors';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../utils/jwt';
import { logActivity } from '../../utils/logger';
import Role from '../../models/Role';
import User from '../../models/User';
import { IContext } from '../../server';
import { checkPermission } from './helpers';

export const userResolvers = {
    Query: {
        me: async (_: unknown, __: unknown, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const user = await User.findById(context.user.id).populate('role');
            if (!user) throw new ApolloError('User not found', 'USER_NOT_FOUND');
            return user;
        },

        users: async (_: unknown, { role, roles }: { role?: string, roles?: string[] }, context: IContext) => {
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const userRole = await Role.findById(context.user.role);
            if (!userRole || !userRole.permissions) {
                throw new ApolloError('User role or permissions not found', 'NOT_FOUND');
            }
            if (
                !userRole.permissions.includes('manage_users' as any) &&
                !userRole.permissions.includes('assign_creative_tasks' as any)
            ) {
                throw new ApolloError('Forbidden: Not authorized to view user lists.', 'FORBIDDEN');
            }

            let findQuery: any = {};

            if (role) {
                const roleDoc = await Role.findOne({ name: role });
                if (!roleDoc) throw new ApolloError('Role not found', 'NOT_FOUND');
                findQuery.role = roleDoc._id;
            } else if (roles && roles.length > 0) {
                const roleDocs = await Role.find({ name: { $in: roles } });
                const roleIds = roleDocs.map(doc => doc._id);
                findQuery.role = { $in: roleIds };
            }

            if (Object.keys(findQuery).length > 0) {
                return User.find(findQuery).populate('role');
            }

            return User.find().populate('role');
        },
    },

    Mutation: {
        // 👇 HNA L-DEBUG FIX 👇
        register: async (_: unknown, { name, email, password }: any) => {
            console.log("🚀 Starting Register Mutation...");
            console.log("📥 Data:", { name, email, password });

            try {
                // 1. Check existing user
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    console.log("❌ User already exists");
                    throw new ApolloError('User with this email already exists', 'USER_ALREADY_EXISTS');
                }

                // 2. Determine Role
                let defaultRoleName = 'PROPOSAL_MANAGER';
                const userCount = await User.countDocuments();
                if (userCount === 0) {
                    console.log("👑 First User detected! Assigning ADMIN role.");
                    defaultRoleName = 'ADMIN';
                }

                // 3. Find or Create Role
                let role = await Role.findOne({ name: defaultRoleName });
                if (!role) {
                    console.log(`⚠️ Role ${defaultRoleName} not found. Creating it...`);
                    const permissions: string[] = defaultRoleName === 'ADMIN'
                        ? [
                            'configure_roles', 'manage_users', 'assign_project_managers', 'assign_teams',
                            'set_project_status', 'view_all_logs', 'view_all_analytics', 'create_project_proposal',
                            'manage_assigned_projects', 'assign_creative_tasks', 'update_workflow_stage',
                            'manage_cautions', 'manage_own_tasks', 'upload_methodology',
                            'assign_dynamic_pm', 'view_team_logs' // Zedt hado l-htiyat
                        ]
                        : ['create_project_proposal'];

                    role = await Role.create({ name: defaultRoleName, permissions });
                    console.log("✅ Role Created:", role);
                }

                // 4. Create User
                console.log("🛠️ Creating User linked to Role ID:", role._id);
                // Hash password is handled in User Model pre-save, but let's confirm User model exists

                const user = await User.create({
                    name,
                    email,
                    password, // Mongoose pre-save hook should hash this
                    role: role._id
                });

                console.log("✅ User Created ID:", user._id);

                // 5. Generate Token
                const token = generateToken(user);
                console.log("🔑 Token Generated");

                // 6. Return Payload
                const populatedUser = await user.populate('role');
                return { token, user: populatedUser };

            } catch (error: any) {
                console.error("🔥 CRITICAL ERROR IN REGISTER:", error);
                // Hada howa l-error li kynfe3na
                throw new ApolloError(error.message || "Registration Failed", "INTERNAL_ERROR");
            }
        },

        login: async (_: unknown, { email, password }: any) => {
            const user = await User.findOne({ email }).select('+password').populate('role');
            if (!user) throw new ApolloError('Invalid credentials', 'INVALID_CREDENTIALS');
            const isMatch = await bcrypt.compare(password, user.password || '');
            if (!isMatch) throw new ApolloError('Invalid credentials', 'INVALID_CREDENTIALS');
            const token = generateToken(user);
            await logActivity({ userId: user._id, action: 'USER_LOGIN', details: `User ${user.name} logged in.` });
            return { token, user };
        },

        admin_createUser: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'manage_users');
            const { name, email, password, roleName } = input;

            const existingUser = await User.findOne({ email });
            if (existingUser) throw new ApolloError('User with this email already exists', 'USER_ALREADY_EXISTS');

            const role = await Role.findOne({ name: roleName });
            if (!role) throw new ApolloError(`Role '${roleName}' not found. Please create the role first.`, 'NOT_FOUND');

            const user = await User.create({ name, email, password, role: role._id });
            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_CREATE_USER',
                details: `Admin created new user: "${name}" with role ${roleName}.`,
            });
            return user.populate('role');
        },

        admin_createRole: async (_: unknown, { input }: any, context: IContext) => {
            await checkPermission(context, 'configure_roles');
            const { name, permissions } = input;
            const existingRole = await Role.findOne({ name });
            if (existingRole) throw new ApolloError('Role with this name already exists', 'ROLE_ALREADY_EXISTS');
            const role = await Role.create({ name, permissions });
            await logActivity({
                userId: context.user.id,
                action: 'ADMIN_CREATE_ROLE',
                details: `Admin created new role: "${name}"`,
            });
            return role;
        },
    }
};