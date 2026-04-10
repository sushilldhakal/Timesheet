import { z } from "zod"
import { objectIdSchema } from "./common"

export const locationCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().int().min(1).max(10000).optional().default(100),
  geofenceMode: z.enum(["hard", "soft"]).optional(),
  openingHour: z.number().int().min(0).max(23).optional(),
  closingHour: z.number().int().min(0).max(24).optional(),
  workingDays: z.array(z.number().int().min(0).max(6)).optional(),
  timezone: z.string().optional().default("Australia/Sydney"),
  costCenterId: z.string().max(100).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const locationUpdateSchema = locationCreateSchema.partial()

export const locationQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

export const locationIdParamSchema = z.object({
  id: objectIdSchema,
})

// ---- Location-team enablement (used by /api/locations/[locationId]/teams/*) ----

export const locationIdPathParamSchema = z.object({
  locationId: objectIdSchema,
})

export const locationTeamParamsSchema = z.object({
  locationId: objectIdSchema,
  teamId: objectIdSchema,
})

/** @deprecated use locationTeamParamsSchema */
export const locationRoleParamsSchema = locationTeamParamsSchema

export const enableTeamSchema = z.object({
  teamId: objectIdSchema,
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

/** @deprecated use enableTeamSchema */
export const enableRoleSchema = enableTeamSchema

export const updateEnablementSchema = z.object({
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

export const roleEnablementQuerySchema = z.object({
  date: z.string().datetime().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
})

export const teamEnablementSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  teamColor: z.string().optional(),
  effectiveFrom: z.any(),
  effectiveTo: z.any().nullable(),
  isActive: z.boolean(),
  employeeCount: z.number().optional(),
})

export const locationTeamsResponseSchema = z.object({
  teams: z.array(teamEnablementSchema),
})

export const teamEnablementResponseSchema = z.object({
  enablement: z.object({
    id: z.string(),
    locationId: z.string(),
    teamId: z.string(),
    teamName: z.string(),
    teamColor: z.string().optional(),
    effectiveFrom: z.any(),
    effectiveTo: z.any().nullable(),
    isActive: z.boolean(),
  }),
})

/** @deprecated use teamEnablementSchema */
export const roleEnablementSchema = teamEnablementSchema

/** @deprecated use locationTeamsResponseSchema */
export const locationRolesResponseSchema = locationTeamsResponseSchema

/** @deprecated use teamEnablementResponseSchema */
export const roleEnablementResponseSchema = teamEnablementResponseSchema
