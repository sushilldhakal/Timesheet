import { z } from 'zod';

// Re-export from canonical source
export { employeeIdParamSchema } from './employee';

// Time range schema
const timeRangeSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)")
});

// Availability query schema (for GET)
export const availabilityQuerySchema = z.object({
  organizationId: z.string().optional()
});

// Availability constraint create schema (for POST)
export const availabilityConstraintCreateSchema = z.object({
  // Optional: API infers tenantId from auth/employee if omitted
  organizationId: z.string().optional(),
  unavailableDays: z.array(z.number().min(0).max(6)).optional(),
  unavailableTimeRanges: z.array(timeRangeSchema).optional(),
  preferredShiftTypes: z.array(z.enum(["MORNING", "AFTERNOON", "NIGHT"])).optional(),
  maxConsecutiveDays: z.number().min(1).nullable().optional(),
  minRestHours: z.number().min(0).nullable().optional(),
  /** ISO datetime or null (e.g. ongoing weekly has no end) */
  temporaryStartDate: z.string().datetime().nullable().optional(),
  temporaryEndDate: z.string().datetime().nullable().optional(),
  reason: z.string().optional()
});

/** PATCH body — same fields as create, all optional */
export const availabilityConstraintUpdateSchema = availabilityConstraintCreateSchema.partial();

// Query: constraint id (PATCH / DELETE)
export const availabilityConstraintIdQuerySchema = z.object({
  constraintId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid constraint ID format")
});

// Availability delete query schema (for DELETE)
export const availabilityDeleteQuerySchema = availabilityConstraintIdQuerySchema;

// Response schemas
export const availabilityConstraintsResponseSchema = z.object({
  constraints: z.array(z.object({
    _id: z.string(),
    employeeId: z.string(),
    organizationId: z.string().optional(),
    unavailableDays: z.array(z.number()),
    unavailableTimeRanges: z.array(timeRangeSchema),
    preferredShiftTypes: z.array(z.enum(["MORNING", "AFTERNOON", "NIGHT"])),
    maxConsecutiveDays: z.number().nullable(),
    minRestHours: z.number().nullable(),
    temporaryStartDate: z.string().nullable(),
    temporaryEndDate: z.string().nullable(),
    reason: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  }))
});

export const availabilityConstraintCreateResponseSchema = z.object({
  constraint: z.object({
    _id: z.string(),
    employeeId: z.string(),
    organizationId: z.string().optional(),
    unavailableDays: z.array(z.number()),
    unavailableTimeRanges: z.array(timeRangeSchema),
    preferredShiftTypes: z.array(z.enum(["MORNING", "AFTERNOON", "NIGHT"])),
    maxConsecutiveDays: z.number().nullable(),
    minRestHours: z.number().nullable(),
    temporaryStartDate: z.string().nullable(),
    temporaryEndDate: z.string().nullable(),
    reason: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
});

export const availabilityDeleteResponseSchema = z.object({
  success: z.boolean()
});

// Employee availability query schema (for the other endpoint)
export const employeeAvailabilityQuerySchema = z.object({
  roleId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid role ID format"),
  locationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid location ID format"),
  date: z.string().optional()
});

// Employee availability response schema
export const employeeAvailabilitySchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  assignmentId: z.string(),
  validFrom: z.string(),
  validTo: z.string().nullable()
});

export const employeeAvailabilityResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    employees: z.array(employeeAvailabilitySchema)
  }),
  meta: z.object({
    count: z.number(),
    roleId: z.string(),
    locationId: z.string(),
    date: z.string()
  }).optional()
});