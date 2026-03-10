import { z } from 'zod';

// Employee ID parameter schema
export const employeeIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format")
});

// Absences query schema
export const absencesQuerySchema = z.object({
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date")
});

// Leave record create schema
export const leaveRecordCreateSchema = z.object({
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
  leaveType: z.enum(['sick', 'vacation', 'personal', 'bereavement', 'jury_duty', 'other']),
  notes: z.string().optional()
});

// Leave record response schema
export const leaveRecordSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  leaveType: z.string(),
  notes: z.string().optional(),
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
});