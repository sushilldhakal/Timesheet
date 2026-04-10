import { z } from "zod"

/**
 * Query schema for dashboard timesheet view
 * Supports filtering by date range, employees, employers, locations, roles
 */
export const timesheetDashboardQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  employeeId: z.union([z.string(), z.array(z.string())]).optional().transform(val => 
    val ? (Array.isArray(val) ? val : [val]) : []
  ),
  employer: z.union([z.string(), z.array(z.string())]).optional().transform(val => 
    val ? (Array.isArray(val) ? val : [val]) : []
  ),
  location: z.union([z.string(), z.array(z.string())]).optional().transform(val => 
    val ? (Array.isArray(val) ? val : [val]) : []
  ),
  role: z.union([z.string(), z.array(z.string())]).optional().transform(val => 
    val ? (Array.isArray(val) ? val : [val]) : []
  ),
  view: z.enum(["day", "week", "month"]).optional().default("day"),
  limit: z.coerce.number().int().positive().optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  sortBy: z.string().optional().default("date"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
})

/**
 * Response schema for dashboard timesheets
 */
export const timesheetsDashboardResponseSchema = z.object({
  timesheets: z.array(z.any()),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  totalWorkingMinutes: z.number(),
  totalBreakMinutes: z.number(),
  totalWorkingHours: z.string(),
  totalBreakHours: z.string(),
})
