import { z } from 'zod'
import { objectIdSchema } from './common'

// Geofence mode enum
export const geofenceModeSchema = z.enum(['strict', 'soft', 'disabled'])

// Working days array (0=Sunday, 1=Monday, ..., 6=Saturday)
export const workingDaysSchema = z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5])

// Create location request
export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  address: z.string().min(1, 'Address is required').max(500, 'Address must be less than 500 characters'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().int().min(1).max(10000).optional().default(100),
  geofenceMode: geofenceModeSchema.optional().default('soft'),
  openingHour: z.number().min(0).max(23).optional(),
  closingHour: z.number().min(0).max(23).optional(),
  workingDays: workingDaysSchema.optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
})

// Update location request
export const updateLocationSchema = createLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
})

// Location query parameters
export const locationQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

// Location ID parameter
export const locationIdParamSchema = z.object({
  locationId: objectIdSchema,
})

// Role ID parameter
export const roleIdParamSchema = z.object({
  roleId: objectIdSchema,
})

// Location and role ID parameters
export const locationRoleParamsSchema = z.object({
  locationId: objectIdSchema,
  roleId: objectIdSchema,
})

// Enable role request
export const enableRoleSchema = z.object({
  roleId: z.string().min(1, "Role ID is required"),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

// Update role enablement request
export const updateEnablementSchema = z.object({
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

// Role enablement query parameters
export const roleEnablementQuerySchema = z.object({
  date: z.string().datetime().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
})

// Role enablement response
export const roleEnablementSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
  roleColor: z.string().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().nullable(),
  isActive: z.boolean(),
  employeeCount: z.number().optional(),
})

// Location roles response
export const locationRolesResponseSchema = z.object({
  roles: z.array(roleEnablementSchema),
})

// Role enablement create/update response
export const roleEnablementResponseSchema = z.object({
  enablement: z.object({
    id: z.string(),
    locationId: z.string(),
    roleId: z.string(),
    roleName: z.string(),
    roleColor: z.string().optional(),
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime().nullable(),
    isActive: z.boolean(),
  }),
})

// Location employees query parameters
export const locationEmployeesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
})