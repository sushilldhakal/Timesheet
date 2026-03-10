import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { AbsenceManager } from "@/lib/managers/absence-manager"
import { LeaveType } from "@/lib/db/schemas/leave-record"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  absencesQuerySchema,
  leaveRecordCreateSchema,
  absencesListResponseSchema,
  leaveRecordCreateResponseSchema
} from "@/lib/validations/employee-absences"
import { errorResponseSchema } from "@/lib/validations/auth"

/**
 * GET /api/employees/[id]/absences?startDate=...&endDate=...
 * Get leave records for an employee
 */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/absences',
  summary: 'Get employee absences',
  description: 'Get leave records for an employee within a date range',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: absencesQuerySchema
  },
  responses: {
    200: absencesListResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    if (!params || !query) {
      return {
        status: 400,
        data: { error: "Employee ID and date range are required" }
      };
    }

    const { id } = params;
    const { startDate, endDate } = query;

    try {
      await connectDB()
      const absenceManager = new AbsenceManager()
      const absences = await absenceManager.getLeaveRecords(
        id,
        new Date(startDate),
        new Date(endDate)
      )

      return {
        status: 200,
        data: { absences }
      };
    } catch (err) {
      console.error("[api/employees/[id]/absences GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch leave records" }
      };
    }
  }
});

/**
 * POST /api/employees/[id]/absences
 * Create a new leave record
 */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/absences',
  summary: 'Create employee absence',
  description: 'Create a new leave record for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: leaveRecordCreateSchema
  },
  responses: {
    201: leaveRecordCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    if (!params || !body) {
      return {
        status: 400,
        data: { error: "Employee ID and request body are required" }
      };
    }

    const { id } = params;
    const { startDate, endDate, leaveType, notes } = body;

    try {
      await connectDB()
      const absenceManager = new AbsenceManager()
      const leaveRecord = await absenceManager.createLeaveRecord(
        id,
        new Date(startDate),
        new Date(endDate),
        leaveType as LeaveType,
        notes
      )

      return {
        status: 201,
        data: { leaveRecord }
      };
    } catch (err) {
      console.error("[api/employees/[id]/absences POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create leave record" }
      };
    }
  }
});
