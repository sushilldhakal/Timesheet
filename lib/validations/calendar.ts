import { z } from 'zod'
import { mongoIdSchema, dateSchema } from './common'

// Calendar events query schema
export const calendarEventsQuerySchema = z.object({
  startDate: z.string().refine((val) => {
    // Accept both datetime and date formats
    return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(val) || !isNaN(Date.parse(val))
  }, "Invalid startDate format"),
  endDate: z.string().refine((val) => {
    // Accept both datetime and date formats
    return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(val) || !isNaN(Date.parse(val))
  }, "Invalid endDate format"),
  userId: z.string().optional().default("all"),
  locationId: z.string().optional().default("all"),
  /** When true, only shifts with status published are returned (staff-safe). */
  publishedOnly: z.enum(["true", "false"]).optional().default("false"),
})

// Calendar event creation schema
export const calendarEventCreateSchema = z.object({
  employeeId: mongoIdSchema.optional(),
  roleId: mongoIdSchema,
  locationId: mongoIdSchema,
  employerId: mongoIdSchema,
  startDate: dateSchema,
  startTime: z.object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }),
  endDate: dateSchema,
  endTime: z.object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }),
  breakMinutes: z.number().int().min(0).optional(),
  /** Explicit break window as decimal hours — takes precedence over breakMinutes */
  breakStartH: z.number().min(0).max(24).optional(),
  breakEndH: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
})

// Calendar event response schema
export const calendarEventSchema = z.object({
  id: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  title: z.string(),
  color: z.enum(["blue", "green", "red", "yellow", "purple", "orange"]),
  description: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    picturePath: z.string().nullable(),
  }),
  roleId: z.string().optional(),
  locationId: z.string().optional(),
  shiftStatus: z.string().optional(),
  employerBadge: z.string().optional(),
  breakStartH: z.number().optional(),
  breakEndH: z.number().optional(),
  breakMinutes: z.number().optional(),
})

// Calendar events list response
export const calendarEventsResponseSchema = z.object({
  events: z.array(calendarEventSchema),
})

// Calendar event creation response
export const calendarEventCreateResponseSchema = z.object({
  message: z.string(),
  shift: z.object({
    _id: z.string(),
    employeeId: z.string().nullable(),
    date: z.string().datetime(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    locationId: z.string(),
    roleId: z.string(),
    sourceScheduleId: z.string().nullable(),
    estimatedCost: z.number(),
    notes: z.string(),
    breakStartTime: z.string().optional(),
    breakEndTime: z.string().optional(),
    breakMinutes: z.number().optional(),
  }),
  weekId: z.string(),
})