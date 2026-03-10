import { z } from 'zod';

// Week ID parameter schema
export const weekIdParamSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)")
});

// Shift ID parameter schema
export const shiftIdParamSchema = z.object({
  shiftId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid shift ID format")
});

// Auto-fill request schema
export const autoFillRequestSchema = z.object({
  organizationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid organization ID format"),
  employmentTypes: z.array(z.enum(["FULL_TIME", "PART_TIME", "CASUAL", "CONTRACT"])).optional(),
  validateAvailability: z.boolean().optional(),
  validateCompliance: z.boolean().optional()
});

// Auto-fill response schema
export const autoFillResponseSchema = z.object({
  successCount: z.number(),
  failureCount: z.number(),
  skippedCount: z.number(),
  violations: z.array(z.any())
});

// Gaps query schema
export const gapsQuerySchema = z.object({
  organizationId: z.string().optional(),
  includeSuggestions: z.string().optional()
});

// Gap response schema
export const gapResponseSchema = z.object({
  gaps: z.array(z.any())
});

// Roster generation schema
export const rosterGenerationSchema = z.object({
  mode: z.enum(["copy", "schedules"]),
  copyFromWeekId: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  includeEmploymentTypes: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional()
});

// Roster generation response schema
export const rosterGenerationResponseSchema = z.object({
  message: z.string(),
  shiftsCreated: z.number().optional()
});

// Roster publish response schema
export const rosterPublishResponseSchema = z.object({
  message: z.string(),
  roster: z.any()
});

// Shift update schema
export const shiftUpdateSchema = z.object({
  employeeId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  date: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  locationId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  notes: z.string().optional()
});

// Shift response schema
export const shiftResponseSchema = z.object({
  shift: z.any()
});

// Compliance validation request schema
export const complianceValidationRequestSchema = z.object({
  organizationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid organization ID format")
});

// Compliance validation response schema
export const complianceValidationResponseSchema = z.object({
  isCompliant: z.boolean(),
  violations: z.array(z.object({
    employeeId: z.string(),
    date: z.string(),
    ruleType: z.string(),
    ruleName: z.string(),
    message: z.string(),
    severity: z.string()
  })),
  canPublish: z.boolean()
});