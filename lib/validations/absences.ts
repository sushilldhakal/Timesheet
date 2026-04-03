import { z } from 'zod'

// Parameter schemas
export const absenceIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid absence ID format"),
})

// Request schemas
export const approveAbsenceSchema = z.object({
  approverId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid approver ID format"),
})

// Response schemas
export const affectedShiftSchema = z.object({
  shiftId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  locationId: z.string(),
  roleId: z.string(),
})

export const affectedShiftsResponseSchema = z.object({
  affectedShifts: z.array(affectedShiftSchema),
})

export const approveAbsenceResponseSchema = z.object({
  leaveRecord: z.any(), // Complex leave record structure
  affectedShifts: z.array(z.object({
    shiftId: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  })),
})

// GET /api/absences — bulk list
export const absencesBulkQuerySchema = z.object({
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
  employeeId: z
    .array(z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID"))
    .optional(),
  status: z.enum(["PENDING", "APPROVED", "DENIED"]).optional(),
  leaveType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
  offset: z.coerce.number().int().min(0).default(0),
})

export const absenceListItemSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  employeePin: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  leaveType: z.string(),
  status: z.string(),
  notes: z.string(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  deniedBy: z.string().optional(),
  deniedAt: z.string().optional(),
  denialReason: z.string().optional(),
  blockAutoFill: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const absencesBulkListResponseSchema = z.object({
  absences: z.array(absenceListItemSchema),
  total: z.number(),
})

// PATCH /api/absences/[id]/deny
export const denyAbsenceSchema = z.object({
  denierId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid denier ID"),
  reason: z.string().min(1, "Denial reason is required"),
})

export const denyAbsenceResponseSchema = z.object({
  leaveRecord: z.any(),
})