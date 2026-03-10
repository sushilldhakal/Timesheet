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
  autoPopulate: z.boolean().optional().default(true),
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

// Week ID parameter
export const weekIdParamSchema = z.object({
  weekId: weekIdSchema,
})

// Response schemas
export const shiftResponseSchema = z.object({
  id: z.string(),
  employeeId: z.string().nullable(),
  date: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  locationId: z.string(),
  roleId: z.string(),
  sourceScheduleId: z.string().nullable(),
  notes: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const rosterResponseSchema = z.object({
  id: z.string(),
  weekId: weekIdSchema,
  status: z.enum(['draft', 'published', 'archived']),
  shifts: z.array(shiftResponseSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createRosterResponseSchema = z.object({
  roster: rosterResponseSchema,
  shiftsGenerated: z.number().optional(),
})

export const shiftsListResponseSchema = z.object({
  shifts: z.array(shiftResponseSchema),
})

export const shiftCreateResponseSchema = z.object({
  shift: shiftResponseSchema,
})