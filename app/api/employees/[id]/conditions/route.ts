import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  employeeConditionsQuerySchema,
  employeeConditionsResponseSchema
} from "@/lib/validations/employee-conditions"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeConditionsService } from "@/lib/services/employee/employee-conditions-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/conditions',
  summary: 'Get employee award conditions',
  description: 'Get active award conditions for an employee on a specific date',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: employeeConditionsQuerySchema
  },
  responses: {
    200: employeeConditionsResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    if (!params) {
      return { status: 400, data: { error: "Employee ID is required" } };
    }

    const { id } = params;
    const dateParam = query?.date;
    const date = dateParam ? new Date(dateParam) : new Date();

    try {
      return await employeeConditionsService.get(id, date)
    } catch (error: any) {
      console.error("Error fetching employee conditions:", error);
      return {
        status: 500,
        data: { error: "Failed to fetch employee conditions", details: error.message }
      };
    }
  }
});
