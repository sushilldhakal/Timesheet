import { z } from 'zod';

// Re-export from canonical source
export { employeeIdParamSchema } from './employee';

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