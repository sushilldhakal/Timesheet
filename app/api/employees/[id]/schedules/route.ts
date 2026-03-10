import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { ScheduleManager } from "@/lib/managers/schedule-manager"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  scheduleQuerySchema,
  scheduleCreateSchema,
  schedulesListResponseSchema,
  scheduleCreateResponseSchema
} from "@/lib/validations/employee-schedules"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/schedules',
  summary: 'Get employee schedules',
  description: 'Get schedules for an employee with optional date filtering',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: scheduleQuerySchema
  },
  responses: {
    200: schedulesListResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!params) {
      return { status: 400, data: { error: "Employee ID is required" } };
    }

    const { id } = params!;
    
    // Validate employee ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 400, data: { error: "Invalid employee ID" } };
    }

    try {
      await connectDB()
      
      // Check if employee exists and user has access
      const empFilter: Record<string, unknown> = { _id: id }
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) {
        empFilter.$and = [locFilter]
      }
      
      const employee = await Employee.findOne(empFilter).lean()
      if (!employee) {
        return { status: 404, data: { error: "Employee not found" } };
      }

      // Check for date filtering
      const dateParam = query?.date;
      
      if (dateParam) {
        // Get active schedules for specific date
        const date = new Date(dateParam)
        if (isNaN(date.getTime())) {
          return { status: 400, data: { error: "Invalid date format" } };
        }
        
        const scheduleManager = new ScheduleManager()
        const result = await scheduleManager.getActiveSchedules(id, date)
        
        if (!result.success) {
          return { status: 500, data: { error: result.error, message: result.message } };
        }
        
        return { status: 200, data: { schedules: result.schedules } };
      } else {
        // Return all schedules
        return { status: 200, data: { schedules: employee.schedules || [] } };
      }
    } catch (err) {
      console.error("[api/employees/[id]/schedules GET]", err)
      return { status: 500, data: { error: "Failed to fetch schedules" } };
    }
  }
});

/** POST /api/employees/[id]/schedules - Create a new schedule for an employee */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/schedules',
  summary: 'Create employee schedule',
  description: 'Create a new schedule for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: scheduleCreateSchema
  },
  responses: {
    201: scheduleCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!params || !body) {
      return { status: 400, data: { error: "Employee ID and request body are required" } };
    }

    const { id } = params!;

    // Validate employee ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 400, data: { error: "Invalid employee ID" } };
    }

    try {
      await connectDB()

      // Check if employee exists and user has access
      const empFilter: Record<string, unknown> = { _id: id }
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) {
        empFilter.$and = [locFilter]
      }

      const employee = await Employee.findOne(empFilter)
      if (!employee) {
        return { status: 404, data: { error: "Employee not found" } };
      }

      // Create schedule using ScheduleManager
      const scheduleManager = new ScheduleManager()
      const scheduleData = {
        dayOfWeek: body!.dayOfWeek,
        startTime: new Date(body!.startTime),
        endTime: new Date(body!.endTime),
        locationId: new mongoose.Types.ObjectId(body!.locationId),
        roleId: new mongoose.Types.ObjectId(body!.roleId),
        effectiveFrom: new Date(body!.effectiveFrom),
        effectiveTo: body!.effectiveTo ? new Date(body!.effectiveTo) : null,
      }

      const result = await scheduleManager.createSchedule(id, scheduleData)

      if (!result.success) {
        return { status: 400, data: { error: result.error, message: result.message } };
      }

      return { status: 201, data: { schedule: result.schedule } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/employees/[id]/schedules POST]", err)
      return {
        status: 500,
        data: {
          error: "Failed to create schedule",
          details: process.env.NODE_ENV === "development" ? message : undefined
        }
      };
    }
  }
});
