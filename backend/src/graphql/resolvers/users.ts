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
            // 1. Check Auth (Darouri)
            if (!context.user) throw new ApolloError('Not authenticated', 'UNAUTHENTICATED');

            // ❌ SUPPRIMÉ: Check Permissions strict
            // Hna 7iyydna l-blockage bach ay user (Coordinator, User...) yqder ychouf l-listes dyal l-assignation

            let findQuery: any = {};

            if (role) {
                const roleDoc = await Role.findOne({ name: role });
                if (roleDoc) { // Ila lqah, filter bih. Ila malqahch, ignori (awla rdd empty, walakin hna n-ignoréw ahsan)
                    findQuery.role = roleDoc._id;
                }
            } else if (roles && roles.length > 0) {
                const roleDocs = await Role.find({ name: { $in: roles } });
                const roleIds = roleDocs.map(doc => doc._id);
                findQuery.role = { $in: roleIds };
            }

            // Return result (Sans Password)
            if (Object.keys(findQuery).length > 0) {
                return User.find(findQuery).select('-password').populate('role');
            }

            return User.find().select('-password').populate('role');
        },
    },

    Mutation: {
        register: async (_: unknown, { name, email, password }: any) => {
            console.log("🚀 Starting Register Mutation...");

            try {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    throw new ApolloError('User with this email already exists', 'USER_ALREADY_EXISTS');
                }

                let defaultRoleName = 'PROPOSAL_MANAGER';
                const userCount = await User.countDocuments();
                if (userCount === 0) {
                    defaultRoleName = 'ADMIN';
                }

                let role = await Role.findOne({ name: defaultRoleName });
                if (!role) {
                    const permissions: string[] = defaultRoleName === 'ADMIN'
                        ? [
                            'configure_roles', 'manage_users', 'assign_project_managers', 'assign_teams',
                            'set_project_status', 'view_all_logs', 'view_all_analytics', 'create_project_proposal',
                            'manage_assigned_projects', 'assign_creative_tasks', 'update_workflow_stage',
                            'manage_cautions', 'manage_own_tasks', 'upload_methodology',
                            'assign_dynamic_pm', 'view_team_logs'
                        ]
                        : ['create_project_proposal'];

                    role = await Role.create({ name: defaultRoleName, permissions });
                }

                const user = await User.create({
                    name,
                    email,
                    password,
                    role: role._id
                });

                const token = generateToken(user);
                const populatedUser = await user.populate('role');
                return { token, user: populatedUser };

            } catch (error: any) {
                console.error("🔥 REGISTRATION ERROR:", error);
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
                userId: context.user.id as any,
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
                userId: context.user.id as any,
                action: 'ADMIN_CREATE_ROLE',
                details: `Admin created new role: "${name}"`,
            });
            return role;
        },
    }
};