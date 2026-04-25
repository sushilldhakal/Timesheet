import { z } from 'zod';

// Re-export from canonical source
export { employeeIdParamSchema } from './employee';

// Absences query schema
export const absencesQuerySchema = z.object({
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid start date")
    .optional(),
  endDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid end date")
    .optional(),
});

const hm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24h)")

// Leave record create schema
export const leaveRecordCreateSchema = z
  .object({
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
    leaveType: z.string().min(1, "Leave type is required"),
    notes: z.string().optional(),
    partialStartTime: hm.optional(),
    partialEndTime: hm.optional(),
  })
  .superRefine((data, ctx) => {
    const ps = data.partialStartTime?.trim()
    const pe = data.partialEndTime?.trim()
    if (ps && !pe) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End time is required with start time", path: ["partialEndTime"] })
    }
    if (!ps && pe) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Start time is required with end time", path: ["partialStartTime"] })
    }
    if (ps && pe) {
      const sd = data.startDate.slice(0, 10)
      const ed = data.endDate.slice(0, 10)
      if (sd !== ed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Part-day leave must use the same start and end calendar date",
          path: ["endDate"],
        })
      }
      if (ps >= pe) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End time must be after start time", path: ["partialEndTime"] })
      }
    }
  })

// Leave record response schema
export const leaveRecordSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  leaveType: z.string(),
  notes: z.string().optional(),
  partialStartTime: z.string().optional(),
  partialEndTime: z.string().optional(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Response schemas
export const absencesListResponseSchema = z.object({
  absences: z.array(leaveRecordSchema)
});

export const leaveRecordCreateResponseSchema = z.object({
  leaveRecord: leaveRecordSchema
})

export const employeeLeaveTypesResponseSchema = z.object({
  leaveTypes: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    }),
  ),
})