import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { createApiRoute } from "@/lib/api/create-api-route"
import { employeeIdParamSchema } from "@/lib/validations/employee"
import { employeeLeaveTypesResponseSchema } from "@/lib/validations/employee-absences"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeLeaveTypesService } from "@/lib/services/employee/employee-leave-types-service"

/**
 * GET /api/employees/[id]/leave-types
 * Leave type options: built-in codes plus award rule `leave` outcomes for this employee's org/awards.
 */
export const GET = createApiRoute({
  method: "GET",
  path: "/api/employees/{id}/leave-types",
  summary: "List leave type options for employee",
  description: "Built-in leave types plus leave accrual types from the employee's configured award(s).",
  tags: ["Employees"],
  security: "adminAuth",
  request: {
    params: employeeIdParamSchema,
  },
  responses: {
    200: employeeLeaveTypesResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    if (!params) {
      return { status: 400, data: { error: "Employee ID is required" } }
    }
    const { id } = params
    try {
      const ctx = await getAuthWithUserLocations()
      if (!ctx) {
        const employee = await getEmployeeFromCookie()
        if (!employee || employee.sub !== id) {
          return { status: 401, data: { error: "Unauthorized" } }
        }
      }
      const data = await employeeLeaveTypesService.listForEmployee(id)
      return { status: 200, data }
    } catch (err) {
      console.error("[api/employees/[id]/leave-types GET]", err)
      return { status: 500, data: { error: "Failed to load leave types" } }
    }
  },
})
