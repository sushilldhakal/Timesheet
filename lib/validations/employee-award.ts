import { z } from 'zod';

// Re-export from canonical source
export { employeeIdParamSchema } from './employee';

// Award assignment schema
export const awardAssignmentSchema = z.object({
  awardId: z.string(),
  awardLevel: z.string(),
  employmentType: z.string(),
  effectiveFrom: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid effective from date"),
  overridingRate: z.number().nullable().optional()
});

// Award history query schema
export const awardHistoryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Pay condition schema
export const payConditionSchema = z.object({
  awardId: z.string(),
  awardLevel: z.string(),
  employmentType: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  overridingRate: z.number().nullable(),
  awardName: z.string().optional(),
  isActive: z.boolean().optional()
});

// Employee with award response schema
export const employeeWithAwardResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  awardId: z.string(),
  awardLevel: z.string(),
  employmentType: z.string(),
  payConditions: z.array(payConditionSchema)
});

// Award history response schema
export const awardHistoryResponseSchema = z.object({
  history: z.array(payConditionSchema)
});