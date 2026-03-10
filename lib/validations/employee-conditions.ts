import { z } from 'zod';

// Employee ID parameter schema
export const employeeIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format")
});

// Employee conditions query schema
export const employeeConditionsQuerySchema = z.object({
  date: z.string().optional()
});

// Employee conditions response schema (flexible structure for award conditions)
export const employeeConditionsResponseSchema = z.object({
  awardId: z.string(),
  awardName: z.string(),
  awardLevel: z.string(),
  employmentType: z.string(),
  conditions: z.record(z.string(), z.any()), // Flexible structure for various condition types
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable()
});