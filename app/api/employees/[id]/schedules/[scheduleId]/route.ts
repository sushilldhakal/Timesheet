import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { ScheduleManager } from "@/lib/managers/schedule-manager"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  scheduleIdParamSchema,
  scheduleUpdateSchema,
  scheduleUpdateResponseSchema,
  scheduleDeleteResponseSchema
} from "@/lib/validations/employee-schedules"
import { errorResponseSchema } from "@/lib/validations/auth"

/** PUT /api/employees/[id]/schedules/[scheduleId] - Update a schedule */
export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/employees/{id}/schedules/{scheduleId}',
  summary: 'Update employee schedule',
  description: 'Update a schedule for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema.merge(scheduleIdParamSchema),
    body: scheduleUpdateSchema
  },
  responses: {
    200: scheduleUpdateResponseSchema,
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
      return { status: 400, data: { error: "Employee ID, schedule ID and request body are required" } };
    }

    const { id, scheduleId } = params!;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 400, data: { error: "Invalid employee ID" } };
    }
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      return { status: 400, data: { error: "Invalid schedule ID" } };
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

      // Build update data
      const updateData: Record<string, unknown> = {}
      if (body!.dayOfWeek !== undefined) {
        updateData.dayOfWeek = body!.dayOfWeek
      }
      if (body!.startTime !== undefined) {
        updateData.startTime = new Date(body!.startTime)
      }
      if (body!.endTime !== undefined) {
        updateData.endTime = new Date(body!.endTime)
      }
      if (body!.locationId !== undefined) {
        updateData.locationId = new mongoose.Types.ObjectId(body!.locationId)
      }
      if (body!.roleId !== undefined) {
        updateData.roleId = new mongoose.Types.ObjectId(body!.roleId)
      }
      if (body!.effectiveFrom !== undefined) {
        updateData.effectiveFrom = new Date(body!.effectiveFrom)
      }
      if (body!.effectiveTo !== undefined) {
        updateData.effectiveTo = body!.effectiveTo ? new Date(body!.effectiveTo) : null
      }

      // Update schedule using ScheduleManager
      const scheduleManager = new ScheduleManager()
      const result = await scheduleManager.updateSchedule(id, scheduleId, updateData)

      if (!result.success) {
        const statusCode = result.error === "SCHEDULE_NOT_FOUND" ? 404 : 400
        return { status: statusCode, data: { error: result.error, message: result.message } };
      }

      return { status: 200, data: { schedule: result.schedule } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/employees/[id]/schedules/[scheduleId] PUT]", err)
      return {
        status: 500,
        data: {
          error: "Failed to update schedule",
          details: process.env.NODE_ENV === "development" ? message : undefined
        }
      };
    }
  }
});

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/employees/{id}/schedules/{scheduleId}',
  summary: 'Delete employee schedule',
  description: 'Delete a schedule for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema.merge(scheduleIdParamSchema)
  },
  responses: {
    200: scheduleDeleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!params) {
      return { status: 400, data: { error: "Employee ID and schedule ID are required" } };
    }

    const { id, scheduleId } = params!;
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 400, data: { error: "Invalid employee ID" } };
    }
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      return { status: 400, data: { error: "Invalid schedule ID" } };
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

      // Delete schedule using ScheduleManager
      const scheduleManager = new ScheduleManager()
      const result = await scheduleManager.deleteSchedule(id, scheduleId)
      
      if (!result.success) {
        const statusCode = result.error === "SCHEDULE_NOT_FOUND" ? 404 : 400
        return { status: statusCode, data: { error: result.error, message: result.message } };
      }
      
      return { status: 200, data: { success: true } };
    } catch (err) {
      console.error("[api/employees/[id]/schedules/[scheduleId] DELETE]", err)
      return { status: 500, data: { error: "Failed to delete schedule" } };
    }
  }
});
