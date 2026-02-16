/**
 * Role definitions and utilities
 * Centralized role management for the application
 */

/**
 * All available user roles in the system
 */
export enum UserRole {
    ADMIN = 'admin',
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
        [UserRole.USER]: 'secondary',
        [UserRole.EMPLOYEE]: 'secondary',
    };

    return colorMap[role] || 'secondary';
};
