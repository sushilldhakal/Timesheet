import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  scheduleIdParamSchema,
  scheduleUpdateSchema,
  scheduleUpdateResponseSchema,
  scheduleDeleteResponseSchema
} from "@/lib/validations/employee-schedules"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeSchedulesService } from "@/lib/services/employee/employee-schedules-service"

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

    try {
      const result = await employeeSchedulesService.updateSchedule({ ctx, employeeId: params.id, scheduleId: params.scheduleId, body })
      return { status: 200, data: result }
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

    try {
      const result = await employeeSchedulesService.deleteSchedule({ ctx, employeeId: params.id, scheduleId: params.scheduleId })
      return { status: 200, data: result }
    } catch (err) {
      console.error("[api/employees/[id]/schedules/[scheduleId] DELETE]", err)
      return { status: 500, data: { error: "Failed to delete schedule" } };
    }
  }
});
