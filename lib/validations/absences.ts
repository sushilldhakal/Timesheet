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