import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { 
  employeeCreateSchema, 
  employeeQuerySchema, 
  employeesListResponseSchema, 
  employeeCreateResponseSchema 
} from "@/lib/validations/employee"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { apiErrors } from "@/lib/api/api-error"
import { employeeService } from "@/lib/services/employee/employee-service"

/** GET /api/employees?search=...&limit=50&offset=0&location=...&role=...&employer=... - List employees with search and pagination */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees',
  summary: 'List employees',
  description: 'Get a paginated list of employees with optional search and filtering',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    query: employeeQuerySchema
  },
  responses: {
    200: employeesListResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    const result = await employeeService.listEmployees(ctx, data.query)
    return { status: 200, data: result }
  }
})

/** POST /api/employees - Create employee */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees',
  summary: 'Create employee',
  description: 'Create a new employee with optional role assignments and email setup',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    body: employeeCreateSchema
  },
  responses: {
    200: employeeCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    const result = await employeeService.createEmployee(ctx, data.body)
    return { status: 200, data: result }
  }
})
