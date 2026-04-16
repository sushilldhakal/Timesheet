import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  availabilityQuerySchema,
  availabilityConstraintCreateSchema,
  availabilityDeleteQuerySchema,
  availabilityConstraintsResponseSchema,
  availabilityConstraintCreateResponseSchema,
  availabilityDeleteResponseSchema
} from "@/lib/validations/employee-availability"
import { errorResponseSchema } from "@/lib/validations/auth"
import { availabilityService } from "@/lib/services/availability/availability-service"

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
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!params) {
      return { status: 400, data: { error: "Employee ID is required" } };
    }

    try {
      const result = await availabilityService.listConstraints({ employeeId: params.id, organizationId: query?.organizationId })
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
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!params || !body) {
      return { status: 400, data: { error: "Employee ID and request body are required" } };
    }

    try {
      const result = await availabilityService.createConstraint({ employeeId: params.id, body })
      return { status: 201, data: result }
    } catch (err) {
      console.error("[api/employees/[id]/availability POST]", err)
      return { status: 500, data: { error: "Failed to create availability constraint" } };
    }
  }
});

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/employees/{id}/availability',
  summary: 'Delete availability constraint',
  description: 'Delete an availability constraint by constraint ID',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: availabilityDeleteQuerySchema
  },
  responses: {
    200: availabilityDeleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!query) {
      return { status: 400, data: { error: "Constraint ID is required" } };
    }

    try {
      const result = await availabilityService.deleteConstraint({ constraintId: query.constraintId })
      return { status: 200, data: result }
    } catch (err) {
      console.error("[api/employees/[id]/availability DELETE]", err)
      return { status: 500, data: { error: "Failed to delete availability constraint" } };
    }
  }
});
