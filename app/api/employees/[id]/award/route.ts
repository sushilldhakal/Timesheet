import { Employee } from "@/lib/db/schemas/employee";
import Award from "@/lib/db/schemas/award";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  awardAssignmentSchema,
  employeeWithAwardResponseSchema
} from "@/lib/validations/employee-award"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { awardId, awardLevel, employmentType, effectiveFrom, overridingRate } = body;

    try {
      await connectDB();

      // Validate award exists
      const award = await Award.findById(awardId);
      if (!award) {
        return { status: 404, data: { error: "Award not found" } };
      }

      // Validate awardLevel exists in award
      const level = award.levels.find((l: any) => l.label === awardLevel);
      if (!level) {
        return { 
          status: 400, 
          data: { error: `Award level "${awardLevel}" not found in award` } 
        };
      }

      // Validate employmentType exists in level
      const conditionSet = level.conditions.find(
        (c: any) => c.employmentType === employmentType
      );
      if (!conditionSet) {
        return { 
          status: 400, 
          data: { error: `Employment type "${employmentType}" not found in level "${awardLevel}"` } 
        };
      }

      // Find employee
      const employee = await Employee.findById(id);
      if (!employee) {
        return { status: 404, data: { error: "Employee not found" } };
      }

      // Prepare update operations
      const updateOps: any = {
        awardId: new mongoose.Types.ObjectId(awardId),
        awardLevel,
        employmentType,
      };

      // Get current pay conditions
      const payConditions = employee.payConditions || [];

      // Set effectiveTo on previous assignment (if exists)
      if (payConditions.length > 0) {
        const lastCondition = payConditions[payConditions.length - 1];
        if (!lastCondition.effectiveTo) {
          const effectiveFromDate = new Date(effectiveFrom);
          const dayBefore = new Date(effectiveFromDate);
          dayBefore.setDate(dayBefore.getDate() - 1);
          lastCondition.effectiveTo = dayBefore;
        }
      }

      // Add new pay condition
      const newCondition = {
        awardId: new mongoose.Types.ObjectId(awardId),
        awardLevel,
        employmentType,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: null,
        overridingRate: overridingRate || null,
      };

      payConditions.push(newCondition);
      updateOps.payConditions = payConditions;

      // Update employee using findByIdAndUpdate to avoid validation issues
      const updatedEmployee = await Employee.findByIdAndUpdate(
        id,
        updateOps,
        { new: true, runValidators: false }
      );

      return { status: 200, data: updatedEmployee };
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
