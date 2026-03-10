import { z } from 'zod'

// Common parameter schemas
export const analyticsEmployeeIdParamSchema = z.object({
  employeeId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format"),
})

export const analyticsWeekIdParamSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)"),
})

export const analyticsShiftIdParamSchema = z.object({
  shiftId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid shift ID format"),
})

// Employee report query schema
export const employeeReportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD"),
})

// Response schemas (generic since we don't know the exact structure)
export const analyticsReportResponseSchema = z.object({
  report: z.any(), // The actual report structure varies by endpoint
})

// No-shows response schema
export const noShowsResponseSchema = z.object({
  noShows: z.array(z.any()), // The actual no-show structure varies
  count: z.number(),
})

export const analyticsErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.string().optional(),
})

// Punctuality response schema
export const punctualityResponseSchema = z.object({
  status: z.string(), // The punctuality status
  minutes: z.number(), // Minutes early/late
})

// Variance response schema
export const varianceResponseSchema = z.object({
  scheduledHours: z.number(),
  actualHours: z.number(),
  variance: z.number(),
  timesheetCount: z.number(),
})