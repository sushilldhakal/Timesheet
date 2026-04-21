import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { getEmployeeFromWebCookie } from "@/lib/auth/employee-auth"
import { stripLockedFieldsForEmployee } from "@/lib/auth/employee-field-guard"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema, 
  employeeDetailResponseSchema,
  employeeDeleteResponseSchema
} from "@/lib/validations/employee-detail"
import { employeeUpdateSchema } from "@/lib/validations/employee"
import { errorResponseSchema } from "@/lib/validations/auth"
import { apiErrors } from "@/lib/api/api-error"
import { employeeService } from "@/lib/services/employee/employee-service"

/** GET /api/employees/[id] - Get single employee */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}',
  summary: 'Get single employee',
  description: 'Get detailed employee information including roles, locations, and assignments',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema
  },
  responses: {
    200: employeeDetailResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    if (!params) throw apiErrors.badRequest("Employee ID is required")
    const data = await employeeService.getEmployeeDetail(ctx, params.id)
    return { status: 200, data }
  }
});

/** PATCH /api/employees/[id] - Update employee */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}',
  summary: 'Update employee',
  description: 'Update employee information and role assignments',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: employeeUpdateSchema
  },
  responses: {
    200: employeeDetailResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    // Check for both admin and employee auth
    const ctx = await getAuthWithUserLocations()
    const employeeAuth = await getEmployeeFromWebCookie()
    
    if (!ctx && !employeeAuth) throw apiErrors.unauthorized()
    if (!params || !body) throw apiErrors.badRequest("Employee ID and request body are required")
    
    // If employee is calling this endpoint, strip locked fields
    let sanitizedBody = body
    if (employeeAuth && !ctx) {
      // Employee auth only (not admin)
      sanitizedBody = stripLockedFieldsForEmployee(body) as typeof body
      
      // Ensure employee can only update their own record
      if (params.id !== employeeAuth.sub) {
        throw apiErrors.unauthorized("You can only update your own profile")
      }
    }
    
    // Use admin context if available, otherwise create minimal context for employee
    const effectiveCtx = ctx || {
      userId: employeeAuth!.sub,
      tenantId: '', // Employee auth doesn't have tenantId in the token
      userLocations: [],
      isAdmin: false,
    }
    
    const data = await employeeService.updateEmployee(effectiveCtx as any, params.id, sanitizedBody)
    return { status: 200, data }
  }
});

/** DELETE /api/employees/[id] - Delete employee */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/employees/{id}',
  summary: 'Delete employee',
  description: 'Delete an employee by ID',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema
  },
  responses: {
    200: employeeDeleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    if (!params) throw apiErrors.badRequest("Employee ID is required")
    const data = await employeeService.deleteEmployee(ctx, params.id)
    return { status: 200, data }
  }
});
