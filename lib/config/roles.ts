/**
 * Role definitions and utilities
 * Centralized role management for the application
 */

/**
 * All available user roles in the system
 */
export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
    SUPERVISOR = 'supervisor',
    ACCOUNTS = 'accounts',
    /** @deprecated Use specific roles (manager, supervisor, accounts) instead. Kept for backward compatibility. */
    USER = 'user',
    SUPER_ADMIN = 'super_admin',
    EMPLOYEE = 'employee',
}

/**
 * Role groups for different access levels
 */
export const RoleGroups = {
    // Roles that can access the dashboard
    DASHBOARD_ACCESS: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.SUPERVISOR,
        UserRole.ACCOUNTS,
        UserRole.USER,
        UserRole.EMPLOYEE,
    ],

    // Admin only (excludes super_admin - super_admin is hidden)
    ADMIN_ONLY: [UserRole.ADMIN],

    // Admin + Super admin (full access, super_admin hidden from UI)
    ADMIN_AND_SUPER_ADMIN: [UserRole.ADMIN, UserRole.SUPER_ADMIN],

    USER_ONLY: [UserRole.USER],

    EMPLOYEE_ONLY: [UserRole.EMPLOYEE],

    // Admin and user
    ADMIN_AND_USER: [UserRole.ADMIN, UserRole.USER],

    // Regular employee (no dashboard access)
    REGULAR_USERS: [UserRole.USER, UserRole.EMPLOYEE],

    // Operational track roles (scheduling, timesheets, approvals)
    OPERATIONAL_ROLES: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERVISOR],

    // Financial track roles (awards, payroll, export)
    FINANCIAL_ROLES: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTS],

    // Roles with location-based scope
    LOCATION_SCOPED: [UserRole.MANAGER, UserRole.ACCOUNTS, UserRole.USER],

    // Roles with location + role scope
    ROLE_SCOPED: [UserRole.SUPERVISOR],

    // All roles
    ALL: Object.values(UserRole),
} as const;

/**
 * Check if a role can access the dashboard
 * @param role - User role to check
 * @returns True if role can access dashboard
 */
export const canAccessDashboard = (role: string | null): boolean => {
    if (!role) return false;
    return (RoleGroups.DASHBOARD_ACCESS as readonly string[]).includes(role);
};

/**
 * Check if user is admin
 * @param role - User role to check
 * @returns True if user is admin
 */
export const isAdmin = (role: string | null): boolean => {
    return role === UserRole.ADMIN;
};

/** Super admin has full access but is hidden from user list/dashboard */
export const isSuperAdmin = (role: string | null): boolean => {
    return role === UserRole.SUPER_ADMIN;
};

/** Admin or super admin - full access */
export const isAdminOrSuperAdmin = (role: string | null): boolean => {
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
};

/**
 * Check if user is user
 * @param role - User role to check
 * @returns True if user is user
 */
export const isUser = (role: string | null): boolean => {
    return role === UserRole.USER;
};

/**
 * Check if user is manager
 * @param role - User role to check
 * @returns True if user is manager
 */
export const isManager = (role: string | null): boolean => {
    return role === UserRole.MANAGER;
};

/**
 * Check if user is supervisor
 * @param role - User role to check
 * @returns True if user is supervisor
 */
export const isSupervisor = (role: string | null): boolean => {
    return role === UserRole.SUPERVISOR;
};

/**
 * Check if user is accounts
 * @param role - User role to check
 * @returns True if user is accounts
 */
export const isAccounts = (role: string | null): boolean => {
    return role === UserRole.ACCOUNTS;
};

/**
 * Check if user has operational role (admin, manager, supervisor)
 * @param role - User role to check
 * @returns True if user has operational role
 */
export const isOperational = (role: string | null): boolean => {
    if (!role) return false;
    return (RoleGroups.OPERATIONAL_ROLES as readonly string[]).includes(role);
};

/**
 * Check if user has financial role (admin, super_admin, accounts)
 * @param role - User role to check
 * @returns True if user has financial role
 */
export const isFinancial = (role: string | null): boolean => {
    if (!role) return false;
    return (RoleGroups.FINANCIAL_ROLES as readonly string[]).includes(role);
};

/**
 * Check if user is admin or user
 * @param role - User role to check
 * @returns True if user is admin or user
 */
export const isAdminOrUser = (role: string | null): boolean => {
    if (!role) return false;
    return (RoleGroups.ADMIN_AND_USER as readonly string[]).includes(role);
};

/**
 * Check if user has any of the specified roles
 * @param userRole - User's current role
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has one of the allowed roles
 */
export const hasRole = (userRole: string | null, allowedRoles: UserRole[]): boolean => {
    if (!userRole) return false;
    return (allowedRoles as readonly string[]).includes(userRole);
};

/**
 * Check if user is a regular user (no dashboard access)
 * @param role - User role to check
 * @returns True if user is a regular user
 */
export const isRegularUser = (role: string | null): boolean => {
    if (!role) return false;
    return (RoleGroups.REGULAR_USERS as readonly string[]).includes(role);
};

/**
 * Get user-friendly role name
 * @param role - User role
 * @returns Formatted role name
 */
export const getRoleName = (role: string | null): string => {
    if (!role) return 'Guest';

    const roleMap: Record<string, string> = {
        [UserRole.ADMIN]: 'Administrator',
        [UserRole.MANAGER]: 'Manager',
        [UserRole.SUPERVISOR]: 'Supervisor',
        [UserRole.ACCOUNTS]: 'Accounts',
        [UserRole.USER]: 'User',
        [UserRole.SUPER_ADMIN]: 'Administrator', // Display as admin; hidden from list
        [UserRole.EMPLOYEE]: 'Employee',
    };

    return roleMap[role] || role;
};

/**
 * Get role badge color for UI
 * @param role - User role
 * @returns Tailwind color class
 */
export const getRoleBadgeColor = (role: string | null): string => {
    if (!role) return 'bg-gray-500';

    const colorMap: Record<string, string> = {
        [UserRole.ADMIN]: 'destructive',
        [UserRole.MANAGER]: 'default',
        [UserRole.SUPERVISOR]: 'secondary',
        [UserRole.ACCOUNTS]: 'outline',
        [UserRole.USER]: 'secondary',
        [UserRole.EMPLOYEE]: 'secondary',
    };

    return colorMap[role] || 'secondary';
};

/**
 * Check if user can lock shifts (prevent operational edits before payroll)
 * @param role - User role to check
 * @returns True if user can lock shifts
 */
export const canLockShift = (role: string | null): boolean => {
    if (!role) return false;
    // Managers and above can lock shifts
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.MANAGER;
};

/**
 * Check if user can approve shifts
 * @param role - User role to check
 * @returns True if user can approve shifts
 */
export const canApproveShift = (role: string | null): boolean => {
    if (!role) return false;
    // Supervisors and above can approve shifts
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || 
           role === UserRole.MANAGER || role === UserRole.SUPERVISOR;
};

/**
 * Check if user can process payroll
 * @param role - User role to check
 * @returns True if user can process payroll
 */
export const canProcessPayroll = (role: string | null): boolean => {
    if (!role) return false;
    // Only financial roles can process payroll
    return (RoleGroups.FINANCIAL_ROLES as readonly string[]).includes(role);
};

/**
 * Check if user can manage awards
 * @param role - User role to check
 * @returns True if user can manage awards
 */
export const canManageAwards = (role: string | null): boolean => {
    if (!role) return false;
    // Only financial roles can manage awards
    return (RoleGroups.FINANCIAL_ROLES as readonly string[]).includes(role);
};

/**
 * Check if a user can create another user based on role hierarchy
 * Hierarchy rules: super_admin→any, admin→manager/supervisor/accounts, manager→supervisor, supervisor→none, accounts→none
 * @param creatorRole - Role of the user creating the new user
 * @param targetRole - Role of the user being created
 * @returns True if creator can create target role
 */
export const canCreateUser = (creatorRole: string | null, targetRole: string | null): boolean => {
    if (!creatorRole || !targetRole) return false;

    // Super admin can create any role
    if (creatorRole === UserRole.SUPER_ADMIN) {
        return true;
    }

    // Admin can create manager, supervisor, accounts, and user (deprecated)
    if (creatorRole === UserRole.ADMIN) {
        return targetRole === UserRole.MANAGER || 
               targetRole === UserRole.SUPERVISOR || 
               targetRole === UserRole.ACCOUNTS ||
               targetRole === UserRole.USER ||
               targetRole === UserRole.EMPLOYEE;
    }

    // Manager can create supervisor only
    if (creatorRole === UserRole.MANAGER) {
        return targetRole === UserRole.SUPERVISOR;
    }

    // Supervisor and accounts cannot create any users
    if (creatorRole === UserRole.SUPERVISOR || creatorRole === UserRole.ACCOUNTS) {
        return false;
    }

    // User and employee cannot create any users
    if (creatorRole === UserRole.USER || creatorRole === UserRole.EMPLOYEE) {
        return false;
    }

    return false;
};

/**
 * Get the scope type for a role
 * @param role - User role to check
 * @returns Scope type: 'global', 'location', or 'location+role'
 */
export const getRoleScope = (role: string | null): 'global' | 'location' | 'location+role' => {
    if (!role) return 'location';

    // Global scope roles
    if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) {
        return 'global';
    }

    // Accounts has global scope if location[] is empty, otherwise location scope
    // Note: This function returns the base scope type. Actual scope determination
    // should check the user's location array in the calling code
    if (role === UserRole.ACCOUNTS) {
        return 'location'; // Can be global if location[] is empty
    }

    // Location + role scope
    if (role === UserRole.SUPERVISOR) {
        return 'location+role';
    }

    // Location scope (manager, user, employee)
    if (role === UserRole.MANAGER || role === UserRole.USER || role === UserRole.EMPLOYEE) {
        return 'location';
    }

    // Default to location scope for unknown roles
    return 'location';
};
