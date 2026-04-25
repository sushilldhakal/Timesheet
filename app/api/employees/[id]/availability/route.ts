import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  availabilityQuerySchema,
  availabilityConstraintCreateSchema,
  availabilityConstraintUpdateSchema,
  availabilityConstraintIdQuerySchema,
  availabilityConstraintsResponseSchema,
  availabilityConstraintCreateResponseSchema,
} from "@/lib/validations/employee-availability"
import { errorResponseSchema } from "@/lib/validations/auth"
import { availabilityService } from "@/lib/services/availability/availability-service"
import { connectDB, Employee } from "@/lib/db"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/availability',
  summary: 'Get employee availability',
  description: 'Get availability constraints for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: availabilityQuerySchema
  },
  responses: {
    200: availabilityConstraintsResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    if (!params) {
      return { status: 400, data: { error: "Employee ID is required" } };
    }

    try {
      const ctx = await getAuthWithUserLocations()
      let tenantId: string | null = ctx?.tenantId ?? null
      if (!ctx) {
        const employee = await getEmployeeFromCookie()
        if (!employee || employee.sub !== params.id) {
          return { status: 401, data: { error: "Unauthorized" } }
        }
      }

      if (!tenantId) {
        await connectDB()
        const emp = await Employee.findById(params.id).select("tenantId").lean()
        tenantId = emp ? String((emp as any).tenantId) : null
      }
      if (!tenantId) return { status: 400, data: { error: "Tenant ID is required" } }

      const result = await availabilityService.listConstraints({ employeeId: params.id, tenantId })
      return { status: 200, data: result }
    } catch (err) {
      console.error("[api/employees/[id]/availability GET]", err)
      return { status: 500, data: { error: "Failed to fetch availability constraints" } };
    }
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/availability',
  summary: 'Create availability constraint',
  description: 'Create or update availability constraints for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: availabilityConstraintCreateSchema
  },
  responses: {
    201: availabilityConstraintCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    if (!params || !body) {
      return { status: 400, data: { error: "Employee ID and request body are required" } };
    }

    try {
      const ctx = await getAuthWithUserLocations()
      let tenantId: string | null = ctx?.tenantId ?? null

      if (!ctx) {
        const employee = await getEmployeeFromCookie()
        if (!employee || employee.sub !== params.id) {
          return { status: 401, data: { error: "Unauthorized" } }
        }
      }

      if (!tenantId) {
        await connectDB()
        const emp = await Employee.findById(params.id).select("tenantId").lean()
        tenantId = emp ? String((emp as any).tenantId) : null
      }
      if (!tenantId) return { status: 400, data: { error: "Tenant ID is required" } }

      const result = await availabilityService.createConstraint({ employeeId: params.id, tenantId, body })
      return { status: 201, data: result }
    } catch (err) {
      console.error("[api/employees/[id]/availability POST]", err)
      return { status: 500, data: { error: "Failed to create availability constraint" } };
    }
  }
});

export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/availability',
  summary: 'Update availability constraint',
  description: 'Update an existing availability constraint for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: availabilityConstraintIdQuerySchema,
    body: availabilityConstraintUpdateSchema,
  },
  responses: {
    200: availabilityConstraintCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, query, body }) => {
    if (!params || !query || !body) {
      return { status: 400, data: { error: "Employee ID, constraint ID, and request body are required" } };
    }

    try {
      const ctx = await getAuthWithUserLocations()
      let tenantId: string | null = ctx?.tenantId ?? null

      if (!ctx) {
        const employee = await getEmployeeFromCookie()
        if (!employee || employee.sub !== params.id) {
          return { status: 401, data: { error: "Unauthorized" } }
        }
      }

      if (!tenantId) {
        await connectDB()
        const emp = await Employee.findById(params.id).select("tenantId").lean()
        tenantId = emp ? String((emp as any).tenantId) : null
      }
      if (!tenantId) return { status: 400, data: { error: "Tenant ID is required" } }

      const result = await availabilityService.updateConstraint({
        employeeId: params.id,
        tenantId,
        constraintId: query.constraintId,
        body,
      })
      return { status: 200, data: result }
    } catch (err) {
      console.error("[api/employees/[id]/availability PATCH]", err)
      return { status: 500, data: { error: "Failed to update availability constraint" } };
    }
  },
});

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/employees/{id}/availability',
  summary: 'Delete availability constraint',
  description: 'Deleting unavailability is disabled.',
  tags: ['Employees'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => ({
    status: 403,
    data: { error: "Deleting unavailability is not allowed.", code: "FORBIDDEN" },
  }),
});
