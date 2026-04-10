import { z } from 'zod';
import { objectIdSchema } from './common';

// Re-export from canonical source
export { employeeIdParamSchema } from './employee';

// Assignment ID parameter schema
export const assignmentIdParamSchema = z.object({
  assignmentId: objectIdSchema
});

// Role assignment query schema
export const roleAssignmentQuerySchema = z.object({
  locationId: z.string().optional(),
  date: z.string().optional(),
  includeInactive: z.string().optional()
});

// Role assignment create schema
export const roleAssignmentCreateSchema = z.object({
  roleId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid role ID format"),
  locationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid location ID format"),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).optional()
});

// Role assignment update schema
export const roleAssignmentUpdateSchema = z.object({
  validTo: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).optional()
});

// Role assignment response schema
export const roleAssignmentSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  roleColor: z.string().optional(),
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