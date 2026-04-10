import { z } from 'zod';

// Re-export from canonical source
export { employeeIdParamSchema } from './employee';

// Timesheet query schema
export const timesheetQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  sortBy: z.string().optional(),
  order: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Timesheet update schema
export const timesheetUpdateSchema = z.object({
  date: z.string(),
  clockIn: z.string().optional(),
  breakIn: z.string().optional(),
  breakOut: z.string().optional(),
  clockOut: z.string().optional()
});

// Daily timesheet row schema
export const dailyTimesheetRowSchema = z.object({
  date: z.string(),
  clockIn: z.string(),
  breakIn: z.string(),
  breakOut: z.string(),
  clockOut: z.string(),
  breakMinutes: z.number(),
  breakHours: z.string(),
  totalMinutes: z.number(),
  totalHours: z.string(),
  clockInImage: z.string().optional(),
  clockInWhere: z.string().optional(),
  breakInImage: z.string().optional(),
  breakInWhere: z.string().optional(),
  breakOutImage: z.string().optional(),
  breakOutWhere: z.string().optional(),
  clockOutImage: z.string().optional(),
  clockOutWhere: z.string().optional(),
  clockInSource: z.string().optional(),
  breakInSource: z.string().optional(),
  breakOutSource: z.string().optional(),
  clockOutSource: z.string().optional()
});

// Pagination schema
export const paginationSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean()
});

// Response schemas
export const timesheetListResponseSchema = z.object({
  data: z.array(dailyTimesheetRowSchema),
  pagination: paginationSchema
});

export const timesheetUpdateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});