import { User } from '@/lib/db'
import mongoose from 'mongoose'

export interface PermissionContext {
  userId: string
  role: 'admin' | 'user' | 'super_admin'
  managedLocations: string[]
  managedRoles: string[]
}

/**
 * Load user permission context
 */
export async function getUserPermissionContext(
  userId: string
): Promise<PermissionContext | null> {
  const user = await User.findById(userId)
    .select('role location managedRoles')
    .lean()
  
  if (!user) return null
  
  return {
    userId,
    role: user.role,
    managedLocations: Array.isArray(user.location) 
      ? user.location.map(String) 
      : user.location ? [String(user.location)] : [],
    managedRoles: user.managedRoles || []
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
  
  // Regular users can only view their managed locations
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
  
  // Regular users can only view their managed roles
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
  
  return allRoleIds.filter(id => ctx.managedRoles.includes(id))
}
