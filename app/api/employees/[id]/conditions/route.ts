import { getEmployeeConditions } from "@/lib/utils/employees/award-resolver";
import { connectDB } from "@/lib/db";
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  employeeConditionsQuerySchema,
  employeeConditionsResponseSchema
} from "@/lib/validations/employee-conditions"
import { errorResponseSchema } from "@/lib/validations/auth"

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
      await connectDB();

      const conditions = await getEmployeeConditions(id, date);

      if (!conditions) {
        return {
          status: 404,
          data: { error: "No active award conditions found for this employee" }
        };
      }

      return { status: 200, data: conditions };
    } catch (error: any) {
      console.error("Error fetching employee conditions:", error);
      return {
        status: 500,
        data: { error: "Failed to fetch employee conditions", details: error.message }
      };
    }
  }
});
