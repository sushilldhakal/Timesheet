import { z } from 'zod'
import { objectIdSchema, dateStringSchema } from './common'

// Dashboard stats query parameters
export const dashboardStatsQuerySchema = z.object({
  locationId: objectIdSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
})

// Hours summary query parameters
export const hoursSummaryQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  locationId: objectIdSchema.optional(),
})

// Inactive employees query parameters
export const inactiveEmployeesQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  locationId: objectIdSchema.optional(),
})

// Location stats query parameters
export const locationStatsQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
})

// Role stats query parameters
export const roleStatsQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
})

// User stats query parameters (no additional params needed)
export const userStatsQuerySchema = z.object({}).optional()