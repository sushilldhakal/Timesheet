import { User } from '@/lib/db'

export interface PermissionContext {
  userId: string
  role: 'admin' | 'manager' | 'supervisor' | 'accounts' | 'user' | 'super_admin'
  managedLocations: string[]
  managedRoles: string[]
  createdBy?: string
}

/**
 * Load user permission context
 */
export async function getUserPermissionContext(
  userId: string
): Promise<PermissionContext | null> {
  const user = await User.findById(userId)
    .select('role location managedRoles createdBy')
    .lean()
  
  if (!user) return null
  
  return {
    userId,
    role: user.role,
    managedLocations: Array.isArray(user.location) 
      ? user.location.map(String) 
      : user.location ? [String(user.location)] : [],
    managedRoles: user.managedRoles || [],
    createdBy: user.createdBy || undefined
  }
}

/**
 * Check if user can view location
 */
export function canViewLocation(
  ctx: PermissionContext,
  locationId: string
): boolean {
  // Admins can view all locations
  if (ctx.role === 'admin' || ctx.role === 'super_admin') {
    return true
  }
  
  // Accounts role: global access if no locations assigned, otherwise location scope
  if (ctx.role === 'accounts') {
    // Empty location array means global access for accounts
    if (ctx.managedLocations.length === 0) {
      return true
    }
    // Otherwise check location scope
    return ctx.managedLocations.includes(locationId)
  }
  
  // Manager, supervisor, and other users can only view their managed locations
  return ctx.managedLocations.includes(locationId)
}

/**
 * Check if user can view role
 */
export function canViewRole(
  ctx: PermissionContext,
  roleId: string
): boolean {
  // Admins can view all roles
  if (ctx.role === 'admin' || ctx.role === 'super_admin') {
    return true
  }
  
  // Manager: can view all roles within their location scope
  if (ctx.role === 'manager') {
    return ctx.managedRoles.includes(roleId)
  }
  
  // Supervisor: can only view their managed roles
  if (ctx.role === 'supervisor') {
    return ctx.managedRoles.includes(roleId)
  }
  
  // Accounts: can view all roles (for payroll processing)
  if (ctx.role === 'accounts') {
    return true
  }
  
  // Other users can only view their managed roles
  return ctx.managedRoles.includes(roleId)
}

/**
 * Get locations user can view
 */
export function getViewableLocations(
  ctx: PermissionContext,
  allLocationIds: string[]
): string[] {
  if (ctx.role === 'admin' || ctx.role === 'super_admin') {
    return allLocationIds
  }
  
  // Accounts role: global access if no locations assigned, otherwise location scope
  if (ctx.role === 'accounts') {
    // Empty location array means global access for accounts
    if (ctx.managedLocations.length === 0) {
      return allLocationIds
    }
    // Otherwise filter by location scope
    return allLocationIds.filter(id => ctx.managedLocations.includes(id))
  }
  
  return allLocationIds.filter(id => ctx.managedLocations.includes(id))
}

/**
 * Get roles user can view
 */
export function getViewableRoles(
  ctx: PermissionContext,
  allRoleIds: string[]
): string[] {
  if (ctx.role === 'admin' || ctx.role === 'super_admin') {
    return allRoleIds
  }
  
  // Accounts: can view all roles (for payroll processing)
  if (ctx.role === 'accounts') {
    return allRoleIds
  }
  
  return allRoleIds.filter(id => ctx.managedRoles.includes(id))
}

/**
 * Check if user can approve shifts for a specific location and role
 * Manager: checks location scope only
 * Supervisor: checks location + role scope
 * @param ctx - Permission context
 * @param locationId - Location ID to check
 * @param roleId - Optional role ID to check (required for supervisor scope)
 * @returns True if user can approve shifts
 */
export function canApproveShift(
  ctx: PermissionContext,
  locationId: string,
  roleId?: string
): boolean {
  // Admin and super_admin have global access
  if (ctx.role === 'admin' || ctx.role === 'super_admin') {
    return true
  }

  // Manager: check location scope only
  if (ctx.role === 'manager') {
    return ctx.managedLocations.includes(locationId)
  }

  // Supervisor: check both location and role scope
  if (ctx.role === 'supervisor') {
    const hasLocationAccess = ctx.managedLocations.includes(locationId)
    const hasRoleAccess = roleId ? ctx.managedRoles.includes(roleId) : true
    return hasLocationAccess && hasRoleAccess
  }

  // Other roles cannot approve shifts
  return false
}

/**
 * Check if user can lock shifts for a specific location and role
 * Uses same logic as canApproveShift - manager/supervisor scope logic
 * @param ctx - Permission context
 * @param locationId - Location ID to check
 * @param roleId - Optional role ID to check (required for supervisor scope)
 * @returns True if user can lock shifts
 */
export function canLockShift(
  ctx: PermissionContext,
  locationId: string,
  roleId?: string
): boolean {
  // Admin and super_admin have global access
  if (ctx.role === 'admin' || ctx.role === 'super_admin') {
    return true
  }

  // Manager: check location scope only
  if (ctx.role === 'manager') {
    return ctx.managedLocations.includes(locationId)
  }

  // Supervisor: check both location and role scope
  if (ctx.role === 'supervisor') {
    const hasLocationAccess = ctx.managedLocations.includes(locationId)
    const hasRoleAccess = roleId ? ctx.managedRoles.includes(roleId) : true
    return hasLocationAccess && hasRoleAccess
  }

  // Other roles cannot lock shifts
  return false
}

/**
 * Check if user can access payroll for a specific location
 * Only admin, super_admin, and accounts roles within their scope
 * @param ctx - Permission context
 * @param locationId - Location ID to check
 * @returns True if user can access payroll
 */
export function canAccessPayroll(
  ctx: PermissionContext,
  locationId: string
): boolean {
  // Admin and super_admin have global access
  if (ctx.role === 'admin' || ctx.role === 'super_admin') {
    return true
  }

  // Accounts role: global access if no locations assigned, otherwise location scope
  if (ctx.role === 'accounts') {
    // Empty location array means global access for accounts
    if (ctx.managedLocations.length === 0) {
      return true
    }
    // Otherwise check location scope
    return ctx.managedLocations.includes(locationId)
  }

  // Other roles cannot access payroll
  return false
}

/**
 * Check if user can manage awards
 * Only admin, super_admin, and accounts roles
 * @param ctx - Permission context
 * @returns True if user can manage awards
 */
export function canManageAwards(ctx: PermissionContext): boolean {
  // Only financial roles can manage awards
  return ctx.role === 'admin' || ctx.role === 'super_admin' || ctx.role === 'accounts'
}
