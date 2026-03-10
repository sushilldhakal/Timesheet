import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { AvailabilityConstraint } from "@/lib/db/schemas/availability-constraint"
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

    const { id } = params;
    const organizationId = query?.organizationId;

    try {
      await connectDB()

      const queryFilter: any = { employeeId: new mongoose.Types.ObjectId(id) }
      if (organizationId) {
        queryFilter.organizationId = organizationId
      }

      const constraints = await AvailabilityConstraint.find(queryFilter)

      return { status: 200, data: { constraints } };
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

    const { id } = params;
    const {
      organizationId,
      unavailableDays,
      unavailableTimeRanges,
      preferredShiftTypes,
      maxConsecutiveDays,
      minRestHours,
      temporaryStartDate,
      temporaryEndDate,
      reason,
    } = body;

    try {
      await connectDB()

      const constraint = await AvailabilityConstraint.create({
        employeeId: new mongoose.Types.ObjectId(id),
        organizationId,
        unavailableDays: unavailableDays || [],
        unavailableTimeRanges: unavailableTimeRanges || [],
        preferredShiftTypes: preferredShiftTypes || [],
        maxConsecutiveDays: maxConsecutiveDays || null,
        minRestHours: minRestHours || null,
        temporaryStartDate: temporaryStartDate ? new Date(temporaryStartDate) : null,
        temporaryEndDate: temporaryEndDate ? new Date(temporaryEndDate) : null,
        reason: reason || "",
      })

      return { status: 201, data: { constraint } };
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

    const { constraintId } = query;

    try {
      await connectDB()

      const result = await AvailabilityConstraint.findByIdAndDelete(constraintId)

      if (!result) {
        return { status: 404, data: { error: "Constraint not found" } };
      }

      return { status: 200, data: { success: true } };
    } catch (err) {
      console.error("[api/employees/[id]/availability DELETE]", err)
      return { status: 500, data: { error: "Failed to delete availability constraint" } };
    }
  }
});
