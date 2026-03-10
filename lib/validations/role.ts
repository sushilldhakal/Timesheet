import { z } from 'zod'
import { objectIdSchema } from './common'

// Role availability query schema
export const roleAvailabilityQuerySchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  date: z.string().datetime().optional(),
})

// Role availability response
export const roleAvailabilitySchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
  roleColor: z.string().optional(),
  employeeCount: z.number(),
  isEnabled: z.boolean(),
})

export const rolesAvailabilityResponseSchema = z.object({
  roles: z.array(roleAvailabilitySchema),
})