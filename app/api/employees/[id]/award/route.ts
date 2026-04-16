import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  awardAssignmentSchema,
  employeeWithAwardResponseSchema
} from "@/lib/validations/employee-award"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeAwardService } from "@/lib/services/employee/employee-award-service"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/award',
  summary: 'Assign award to employee',
  description: 'Assign an award and employment conditions to an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: awardAssignmentSchema
  },
  responses: {
    200: employeeWithAwardResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    if (!params || !body) {
      return { status: 400, data: { error: "Employee ID and request body are required" } };
    }

    const { id } = params;

    try {
      return await employeeAwardService.assignAward(id, body)
    } catch (error: any) {
      console.error("Error assigning award to employee:", error);

      // Handle validation errors
      if (error.name === "ValidationError") {
        return { 
          status: 400, 
          data: { error: "Validation failed", details: error.message } 
        };
      }

      return { 
        status: 500, 
        data: { error: "Failed to assign award", details: error.message } 
      };
    }
  }
});
