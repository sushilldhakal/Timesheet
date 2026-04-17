import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { 
  weekIdParamSchema,
  addShiftSchema,
  shiftCreateResponseSchema,
} from "@/lib/validations/roster"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { apiErrors } from "@/lib/api/api-error"
import { rosterService } from "@/lib/services/roster/roster-service"
import { shiftAuditService } from "@/lib/services/audit/shift-audit-service"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/rosters/{weekId}/shifts',
  summary: 'Add a shift to a roster',
  description: 'Add a new shift to a roster with validation',
  tags: ['Rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema,
    body: addShiftSchema,
  },
  responses: {
    201: shiftCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()

    const weekId = params!.weekId
    const shiftData = body!

    const data = await rosterService.addShift({ weekId, ...(shiftData as any) })

    // Fire-and-forget audit log
    const shift = (data as any)?.shift
    if (shift?._id && shift?.employeeId) {
      shiftAuditService.log({
        tenantId: ctx.tenantId,
        shiftId: shift._id.toString(),
        employeeId: shift.employeeId.toString(),
        action: 'created',
        changedFields: [],
        actorId: ctx.auth.sub,
        actorType: 'user',
        after: {
          employeeId: shift.employeeId,
          startTime: shift.startTime,
          endTime: shift.endTime,
          locationId: shift.locationId,
          roleId: shift.roleId,
        },
      }).catch(() => {})
    }

    return { status: 201, data }
  }
})