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

// Enhanced query schema for dashboard timesheets
export const timesheetDashboardQuerySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  employeeId: z.array(mongoIdSchema).optional(),
  employer: z.array(z.string()).optional(),
  location: z.array(z.string()).optional(),
  role: z.array(z.string()).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z.enum(['date', 'name', 'comment', 'employer', 'role', 'location', 'clockIn', 'breakIn', 'breakOut', 'clockOut', 'breakHours', 'totalHours']).optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})

// Dashboard timesheet row response
export const dashboardTimesheetRowSchema = z.object({
  date: z.string(),
  employeeId: z.string(),
  name: z.string(),
  pin: z.string(),
  comment: z.string(),
  employer: z.string(),
  role: z.string(),
  location: z.string(),
  clockIn: z.string(),
  breakIn: z.string(),
  breakOut: z.string(),
  clockOut: z.string(),
  breakMinutes: z.number(),
  breakHours: z.string(),
  totalMinutes: z.number(),
  totalHours: z.string(),
  clockInDeviceId: z.string().optional(),
  clockInDeviceLocation: z.string().optional(),
  breakInDeviceId: z.string().optional(),
  breakInDeviceLocation: z.string().optional(),
  breakOutDeviceId: z.string().optional(),
  breakOutDeviceLocation: z.string().optional(),
  clockOutDeviceId: z.string().optional(),
  clockOutDeviceLocation: z.string().optional(),
})

// Dashboard timesheets response
export const timesheetsDashboardResponseSchema = z.object({
  timesheets: z.array(dashboardTimesheetRowSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  totalWorkingMinutes: z.number(),
  totalBreakMinutes: z.number(),
  totalWorkingHours: z.string(),
  totalBreakHours: z.string(),
})

// Timesheet creation response
export const timesheetCreateResponseSchema = z.object({
  success: z.boolean(),
  timesheet: timesheetResponseSchema,
  shiftMatched: z.boolean(),
})