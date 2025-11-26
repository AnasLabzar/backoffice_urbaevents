"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userResolvers = void 0;
const apollo_server_errors_1 = require("apollo-server-errors");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../../utils/jwt");
const logger_1 = require("../../utils/logger");
const Role_1 = __importDefault(require("../../models/Role"));
const User_1 = __importDefault(require("../../models/User"));
const helpers_1 = require("./helpers");
exports.userResolvers = {
    Query: {
        me: async (_, __, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const user = await User_1.default.findById(context.user.id).populate('role');
            if (!user)
                throw new apollo_server_errors_1.ApolloError('User not found', 'USER_NOT_FOUND');
            return user;
        },
        users: async (_, { role, roles }, context) => {
            if (!context.user)
                throw new apollo_server_errors_1.ApolloError('Not authenticated', 'UNAUTHENTICATED');
            const userRole = await Role_1.default.findById(context.user.role);
            if (!userRole || !userRole.permissions) {
                throw new apollo_server_errors_1.ApolloError('User role or permissions not found', 'NOT_FOUND');
            }
            if (!userRole.permissions.includes('manage_users') &&
                !userRole.permissions.includes('assign_creative_tasks')) {
                throw new apollo_server_errors_1.ApolloError('Forbidden: Not authorized to view user lists.', 'FORBIDDEN');
            }
            let findQuery = {};
            if (role) {
                const roleDoc = await Role_1.default.findOne({ name: role });
                if (!roleDoc)
                    throw new apollo_server_errors_1.ApolloError('Role not found', 'NOT_FOUND');
                findQuery.role = roleDoc._id;
            }
            else if (roles && roles.length > 0) {
                const roleDocs = await Role_1.default.find({ name: { $in: roles } });
                const roleIds = roleDocs.map(doc => doc._id);
                findQuery.role = { $in: roleIds };
            }
            if (Object.keys(findQuery).length > 0) {
                return User_1.default.find(findQuery).populate('role');
            }
            return User_1.default.find().populate('role');
        },
    },
    Mutation: {
        // 👇 HNA L-DEBUG FIX 👇
        register: async (_, { name, email, password }) => {
            console.log("🚀 Starting Register Mutation...");
            console.log("📥 Data:", { name, email, password });
            try {
                // 1. Check existing user
                const existingUser = await User_1.default.findOne({ email });
                if (existingUser) {
                    console.log("❌ User already exists");
                    throw new apollo_server_errors_1.ApolloError('User with this email already exists', 'USER_ALREADY_EXISTS');
                }
                // 2. Determine Role
                let defaultRoleName = 'PROPOSAL_MANAGER';
                const userCount = await User_1.default.countDocuments();
                if (userCount === 0) {
                    console.log("👑 First User detected! Assigning ADMIN role.");
                    defaultRoleName = 'ADMIN';
                }
                // 3. Find or Create Role
                let role = await Role_1.default.findOne({ name: defaultRoleName });
                if (!role) {
                    console.log(`⚠️ Role ${defaultRoleName} not found. Creating it...`);
                    const permissions = defaultRoleName === 'ADMIN'
                        ? [
                            'configure_roles', 'manage_users', 'assign_project_managers', 'assign_teams',
                            'set_project_status', 'view_all_logs', 'view_all_analytics', 'create_project_proposal',
                            'manage_assigned_projects', 'assign_creative_tasks', 'update_workflow_stage',
                            'manage_cautions', 'manage_own_tasks', 'upload_methodology',
                            'assign_dynamic_pm', 'view_team_logs' // Zedt hado l-htiyat
                        ]
                        : ['create_project_proposal'];
                    role = await Role_1.default.create({ name: defaultRoleName, permissions });
                    console.log("✅ Role Created:", role);
                }
                // 4. Create User
                console.log("🛠️ Creating User linked to Role ID:", role._id);
                // Hash password is handled in User Model pre-save, but let's confirm User model exists
                const user = await User_1.default.create({
                    name,
                    email,
                    password, // Mongoose pre-save hook should hash this
                    role: role._id
                });
                console.log("✅ User Created ID:", user._id);
                // 5. Generate Token
                const token = (0, jwt_1.generateToken)(user);
                console.log("🔑 Token Generated");
                // 6. Return Payload
                const populatedUser = await user.populate('role');
                return { token, user: populatedUser };
            }
            catch (error) {
                console.error("🔥 CRITICAL ERROR IN REGISTER:", error);
                // Hada howa l-error li kynfe3na
                throw new apollo_server_errors_1.ApolloError(error.message || "Registration Failed", "INTERNAL_ERROR");
            }
        },
        login: async (_, { email, password }) => {
            const user = await User_1.default.findOne({ email }).select('+password').populate('role');
            if (!user)
                throw new apollo_server_errors_1.ApolloError('Invalid credentials', 'INVALID_CREDENTIALS');
            const isMatch = await bcryptjs_1.default.compare(password, user.password || '');
            if (!isMatch)
                throw new apollo_server_errors_1.ApolloError('Invalid credentials', 'INVALID_CREDENTIALS');
            const token = (0, jwt_1.generateToken)(user);
            await (0, logger_1.logActivity)({ userId: user._id, action: 'USER_LOGIN', details: `User ${user.name} logged in.` });
            return { token, user };
        },
        admin_createUser: async (_, { input }, context) => {
            await (0, helpers_1.checkPermission)(context, 'manage_users');
            const { name, email, password, roleName } = input;
            const existingUser = await User_1.default.findOne({ email });
            if (existingUser)
                throw new apollo_server_errors_1.ApolloError('User with this email already exists', 'USER_ALREADY_EXISTS');
            const role = await Role_1.default.findOne({ name: roleName });
            if (!role)
                throw new apollo_server_errors_1.ApolloError(`Role '${roleName}' not found. Please create the role first.`, 'NOT_FOUND');
            const user = await User_1.default.create({ name, email, password, role: role._id });
            await (0, logger_1.logActivity)({
                userId: context.user.id,
                action: 'ADMIN_CREATE_USER',
                details: `Admin created new user: "${name}" with role ${roleName}.`,
            });
            return user.populate('role');
        },
        admin_createRole: async (_, { input }, context) => {
            await (0, helpers_1.checkPermission)(context, 'configure_roles');
            const { name, permissions } = input;
            const existingRole = await Role_1.default.findOne({ name });
            if (existingRole)
                throw new apollo_server_errors_1.ApolloError('Role with this name already exists', 'ROLE_ALREADY_EXISTS');
            const role = await Role_1.default.create({ name, permissions });
            await (0, logger_1.logActivity)({
                userId: context.user.id,
                action: 'ADMIN_CREATE_ROLE',
                details: `Admin created new role: "${name}"`,
            });
            return role;
        },
    }
};
