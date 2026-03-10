import { Employee } from "@/lib/db/schemas/employee";
import Award from "@/lib/db/schemas/award";
import { connectDB } from "@/lib/db";
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  awardHistoryQuerySchema,
  awardHistoryResponseSchema
} from "@/lib/validations/employee-award"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/award-history',
  summary: 'Get employee award history',
  description: 'Get award assignment history for an employee with optional date filtering',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: awardHistoryQuerySchema
  },
  responses: {
    200: awardHistoryResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    if (!params) {
      return { status: 400, data: { error: "Employee ID is required" } };
    }

    const { id } = params;
    const startDate = query?.startDate;
    const endDate = query?.endDate;

    try {
      await connectDB();

      // Find employee
      const employee = await Employee.findById(id).lean();
      if (!employee) {
        return { status: 404, data: { error: "Employee not found" } };
      }

      let payConditions = employee.payConditions || [];

      // Filter by date range if provided
      if (startDate || endDate) {
        payConditions = payConditions.filter((pc) => {
          const effectiveFrom = new Date(pc.effectiveFrom);
          const effectiveTo = pc.effectiveTo ? new Date(pc.effectiveTo) : null;

          if (startDate && effectiveTo && effectiveTo < new Date(startDate)) {
            return false;
          }
          if (endDate && effectiveFrom > new Date(endDate)) {
            return false;
          }
          return true;
        });
      }

      // Sort by effectiveFrom date (newest first)
      payConditions.sort((a, b) => {
        return new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
      });

      // Populate award names
      const history = await Promise.all(
        payConditions.map(async (pc) => {
          const award = await Award.findById(pc.awardId).lean();
          return {
            ...pc,
            awardName: (award as any)?.name || "Unknown Award",
            isActive: pc.effectiveTo === null,
          };
        })
      );

      return { status: 200, data: { history } };
    } catch (error: any) {
      console.error("Error fetching award history:", error);
      return { 
        status: 500, 
        data: { error: "Failed to fetch award history", details: error.message } 
      };
    }
  }
});
