import { z } from 'zod'
import { objectIdSchema, dateStringSchema } from './common'

// Base analytics query parameters
const baseAnalyticsQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  locationId: objectIdSchema.optional(),
  employeeId: objectIdSchema.optional(),
})

// Employee report query parameters
export const employeeReportQuerySchema = baseAnalyticsQuerySchema.extend({
  roleId: objectIdSchema.optional(),
})

// No-shows report query parameters
export const noShowsQuerySchema = baseAnalyticsQuerySchema

// Punctuality report query parameters
export const punctualityQuerySchema = baseAnalyticsQuerySchema

// Variance report query parameters
export const varianceQuerySchema = baseAnalyticsQuerySchema.extend({
  minVariance: z.coerce.number().min(0).optional(),
})

// Weekly report query parameters
export const weeklyReportQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  locationId: objectIdSchema.optional(),
})