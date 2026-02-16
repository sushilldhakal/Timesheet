/**
 * Re-export from centralized config for backward compatibility.
 * Prefer importing from @/lib/config/roles in new code.
 */
export {
  UserRole,
  RoleGroups,
  canAccessDashboard,
  isAdmin,
  isSuperAdmin,
  isAdminOrSuperAdmin,
  isUser,
  isAdminOrUser,
  hasRole,
  isRegularUser,
  getRoleName,
  getRoleBadgeColor,
} from '@/lib/config/roles';
