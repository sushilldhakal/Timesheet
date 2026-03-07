import { z } from "zod"
import { mongoIdSchema, dateTimeSchema, dateSchema } from "./common"

export const timesheetCreateSchema = z.object({
  employeeId: mongoIdSchema,
  date: dateSchema,
  clockIn: dateTimeSchema,
  clockOut: dateTimeSchema.optional(),
  breakDuration: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
  locationId: mongoIdSchema,
  shiftId: mongoIdSchema.optional()
})

export const timesheetUpdateSchema = z.object({
  clockOut: dateTimeSchema.optional(),
  breakDuration: z.number().min(0).optional(),
  notes: z.string().max(500).optional()
})

export const clockActionSchema = z.object({
  action: z.enum(["in", "out", "break", "endBreak"]),
  timestamp: dateTimeSchema.optional(),
  locationId: mongoIdSchema.optional(),
  notes: z.string().max(500).optional(),
  photo: z.string().optional()
})

export const timesheetPostSchema = z.object({
  pin: z.string().min(1, "PIN is required"),
  type: z.enum(["in", "out", "break", "endBreak"]),
  date: dateSchema,
  time: z.string().optional(),
  image: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
  where: z.string().optional(),
  flag: z.boolean().optional(),
  working: z.string().optional(),
  source: z.string().optional(),
  deviceId: z.string().optional(),
  deviceLocation: z.string().optional(),
  breakSource: z.string().optional(),
  breakRuleRef: z.string().optional(),
  scheduleShiftId: mongoIdSchema.optional()
})

export const timesheetQuerySchema = z.object({
  employeeId: mongoIdSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  locationId: mongoIdSchema.optional()
})

export const timesheetResponseSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string(),
  clockIn: z.string().datetime(),
  clockOut: z.string().datetime().optional(),
  breakDuration: z.number(),
  totalHours: z.number(),
  notes: z.string().optional(),
  locationId: z.string(),
  shiftId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})
export const pinLoginSchema = z.object({
  pin: z.string().regex(/^\d{4,}$/, "PIN must be 4+ digits").max(10),
})