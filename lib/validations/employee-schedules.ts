import { z } from 'zod';
import { objectIdSchema } from './common';

// Re-export from canonical source
export { employeeIdParamSchema } from './employee';

// Schedule ID parameter schema
export const scheduleIdParamSchema = z.object({
  scheduleId: objectIdSchema
});

// Schedule query schema
export const scheduleQuerySchema = z.object({
  date: z.string().optional()
});

// Schedule create schema
export const scheduleCreateSchema = z.object({
  dayOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  locationId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().nullable().optional()
});

// Schedule update schema
export const scheduleUpdateSchema = z.object({
  dayOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  locationId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional()
});

// Schedule response schema
export const scheduleSchema = z.object({
  id: z.string(),
  dayOfWeek: z.array(z.number()),
  startTime: z.string(),
  endTime: z.string(),
  locationId: z.string(),
  roleId: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

// Schedule manager response schema
export const scheduleManagerResponseSchema = z.object({
  success: z.boolean(),
  schedule: scheduleSchema.optional(),
  schedules: z.array(scheduleSchema).optional(),
  error: z.string().optional(),
  message: z.string().optional()
});

// Response schemas
export const schedulesListResponseSchema = z.object({
  schedules: z.array(scheduleSchema)
});

export const scheduleCreateResponseSchema = z.object({
  schedule: scheduleSchema
});

export const scheduleUpdateResponseSchema = z.object({
  schedule: scheduleSchema
});

export const scheduleDeleteResponseSchema = z.object({
  success: z.boolean()
});