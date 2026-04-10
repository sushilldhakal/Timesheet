import { z } from "zod"
import { objectIdSchema } from "./common"

export const teamCreateSchema = z.object({
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

export const teamUpdateSchema = teamCreateSchema.partial()

export const teamQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

export const teamIdParamSchema = z.object({
  id: objectIdSchema,
})

export const teamAvailabilityQuerySchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  date: z.string().datetime().optional(),
})

export const teamAvailabilityRowSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  teamColor: z.string().optional(),
  employeeCount: z.number(),
  isEnabled: z.boolean(),
})

export const teamsAvailabilityResponseSchema = z.object({
  teams: z.array(teamAvailabilityRowSchema),
})
