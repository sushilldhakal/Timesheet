import { z } from 'zod'
import { objectIdSchema, dateStringSchema } from './common'

// Week ID format: YYYY-Www (e.g., "2024-W01")
export const weekIdSchema = z.string().regex(/^\d{4}-W\d{2}$/, 'Invalid week ID format (expected YYYY-Www)')

// Shift validation
export const shiftSchema = z.object({
  employeeId: objectIdSchema.nullable().optional(),
  date: dateStringSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  locationId: objectIdSchema,
  roleId: objectIdSchema,
  sourceScheduleId: objectIdSchema.nullable().optional(),
  notes: z.string().optional().default(''),
})

// Create roster request
export const createRosterSchema = z.object({
  weekId: weekIdSchema,
  includeEmploymentTypes: z.array(z.string()).optional(),
  locationIds: z.array(objectIdSchema).optional(),
})

// Add shift request
export const addShiftSchema = shiftSchema

// Update shift request
export const updateShiftSchema = shiftSchema.partial()

// Roster query parameters
export const rosterQuerySchema = z.object({
  weekId: weekIdSchema,
})

// Shift ID parameter
export const shiftIdParamSchema = z.object({
  shiftId: objectIdSchema,
})