import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  scheduleQuerySchema,
  scheduleCreateSchema,
  schedulesListResponseSchema,
  scheduleCreateResponseSchema
} from "@/lib/validations/employee-schedules"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeSchedulesService } from "@/lib/services/employee/employee-schedules-service"

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

    try {
      const result = await employeeSchedulesService.listSchedules({ ctx, employeeId: params.id, query })
      return { status: 200, data: result }
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

    try {
      const result = await employeeSchedulesService.createSchedule({ ctx, employeeId: params.id, body })
      return { status: 201, data: result }
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
