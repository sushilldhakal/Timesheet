import { z } from 'zod';
import { objectIdSchema } from './common';

// Re-export from canonical source
export { employeeIdParamSchema } from './employee';

// Assignment ID parameter schema
export const assignmentIdParamSchema = z.object({
  assignmentId: objectIdSchema
});

// Team assignment query schema
export const roleAssignmentQuerySchema = z.object({
  locationId: z.string().optional(),
  date: z.string().optional(),
  includeInactive: z.string().optional()
});

// Team assignment form schema (for dialog/form submission)
export const roleAssignmentFormSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  teamId: z.string().min(1, "Team is required"),
  validFrom: z.date({
    message: "Valid from date is required",
  }),
  validTo: z.date().nullable().optional(),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
}).refine(
  (data) => {
    if (data.validTo && data.validFrom) {
      return data.validTo >= data.validFrom
    }
    return true
  },
  {
    message: "Valid to date must be after or equal to valid from date",
    path: ["validTo"],
  }
)

// Team assignment create schema
export const roleAssignmentCreateSchema = z.object({
  teamId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid team ID format"),
  locationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid location ID format"),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).optional()
});

// Team assignment update schema
export const roleAssignmentUpdateSchema = z.object({
  validTo: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).optional()
});

// Team assignment response schema
export const roleAssignmentSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  teamId: z.string(),
  teamName: z.string(),
  teamColor: z.string().optional(),
  locationId: z.string(),
  locationName: z.string(),
  locationColor: z.string().optional(),
  validFrom: z.string(),
  validTo: z.string().nullable(),
  isActive: z.boolean(),
  notes: z.string().optional(),
  assignedAt: z.string().optional()
});

// API response wrapper schemas
export const apiSuccessResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  meta: z.record(z.string(), z.any()).optional()
});

// Response schemas
export const roleAssignmentsListResponseSchema = apiSuccessResponseSchema;
export const roleAssignmentCreateResponseSchema = apiSuccessResponseSchema;
export const roleAssignmentUpdateResponseSchema = apiSuccessResponseSchema;
export const roleAssignmentDeleteResponseSchema = apiSuccessResponseSchema;