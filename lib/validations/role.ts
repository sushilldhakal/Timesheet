import { z } from "zod"
import { objectIdSchema } from "./common"

export const roleCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().max(50).optional(),
  color: z.string().optional(),
  defaultScheduleTemplate: z
    .object({
      standardHoursPerWeek: z.number().min(0).max(168).optional(),
      shiftPattern: z.any().optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
})

export const roleUpdateSchema = roleCreateSchema.partial()

export const roleQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

export const roleIdParamSchema = z.object({
  id: objectIdSchema,
})

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