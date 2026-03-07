import { z } from 'zod'
import { objectIdSchema, dateStringSchema } from './common'

// Shift swap status enum
export const shiftSwapStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled'])

// Create shift swap request
export const createShiftSwapSchema = z.object({
  originalShiftId: objectIdSchema,
  targetId: objectIdSchema.nullable().optional(),
  replacementShiftId: objectIdSchema.nullable().optional(),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be less than 500 characters'),
})

// Respond to shift swap request
export const respondToShiftSwapSchema = z.object({
  response: z.enum(['approve', 'reject']),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
})

// Shift swap query parameters
export const shiftSwapQuerySchema = z.object({
  status: shiftSwapStatusSchema.optional(),
  requesterId: objectIdSchema.optional(),
  targetId: objectIdSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
})

// Shift swap ID parameter
export const shiftSwapIdParamSchema = z.object({
  id: objectIdSchema,
})