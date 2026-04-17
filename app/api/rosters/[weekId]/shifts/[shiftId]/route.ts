import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { apiErrors } from "@/lib/api/api-error"
import { rosterService } from "@/lib/services/roster/roster-service"
import { shiftAuditService } from "@/lib/services/audit/shift-audit-service"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { Roster } from "@/lib/db/schemas/roster"

// Validation schemas
const shiftParamsSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)"),
  shiftId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid shift ID")
})

// Validation schema for shift update (all fields optional)
const shiftUpdateSchema = z.object({
  employeeId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  date: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  locationId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  notes: z.string().optional(),
})

const shiftResponseSchema = z.object({
  shift: z.any()
})

const deleteResponseSchema = z.object({
  message: z.string()
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  issues: z.record(z.string(), z.array(z.string())).optional(),
  details: z.string().optional()
})

/** PUT /api/rosters/[weekId]/shifts/[shiftId] - Update a shift */
export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/rosters/{weekId}/shifts/{shiftId}',
  summary: 'Update a shift',
  description: 'Update a roster shift with new details',
  tags: ['rosters'],
  security: 'adminAuth',
  request: {
    params: shiftParamsSchema,
    body: shiftUpdateSchema
  },
  responses: {
    200: shiftResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, params }) => {
    const ctx = await getAuthWithUserLocations()
    const weekId = params!.weekId
    const shiftId = params!.shiftId
    if (!ctx) throw apiErrors.unauthorized()

    // Capture before-snapshot for audit diff
    let beforeSnapshot: Record<string, unknown> | undefined
    try {
      await connectDB()
      const roster = await scope(Roster, ctx.tenantId).findOne({ weekId }).lean()
      const shift = roster?.shifts.find((s: any) => s._id.toString() === shiftId)
      if (shift) {
        beforeSnapshot = {
          employeeId: (shift as any).employeeId,
          startTime: (shift as any).startTime,
          endTime: (shift as any).endTime,
          locationId: (shift as any).locationId,
          roleId: (shift as any).roleId,
          notes: (shift as any).notes,
        }
      }
    } catch { /* non-critical */ }

    const data = await rosterService.updateShift({ weekId, shiftId, update: body! as any })

    // Fire-and-forget audit log with auto-diff
    const updatedShift = (data as any)?.shift
    if (updatedShift && beforeSnapshot) {
      const afterSnapshot: Record<string, unknown> = {
        employeeId: updatedShift.employeeId,
        startTime: updatedShift.startTime,
        endTime: updatedShift.endTime,
        locationId: updatedShift.locationId,
        roleId: updatedShift.roleId,
        notes: updatedShift.notes,
      }
      shiftAuditService.log({
        tenantId: ctx.tenantId,
        shiftId,
        employeeId: (updatedShift.employeeId ?? beforeSnapshot.employeeId ?? '').toString(),
        actorId: ctx.auth.sub,
        actorType: 'user',
        before: beforeSnapshot,
        after: afterSnapshot,
        // action and changedFields are auto-derived from before/after diff
      }).catch(() => {})
    }

    return { status: 200, data }
  }
});

/** DELETE /api/rosters/[weekId]/shifts/[shiftId] - Delete a shift */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/rosters/{weekId}/shifts/{shiftId}',
  summary: 'Delete a shift',
  description: 'Delete a roster shift',
  tags: ['rosters'],
  security: 'adminAuth',
  request: {
    params: shiftParamsSchema
  },
  responses: {
    200: deleteResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    const weekId = params!.weekId
    const shiftId = params!.shiftId
    if (!ctx) throw apiErrors.unauthorized()

    // Capture shift before deletion for audit
    let deletedShift: any
    try {
      await connectDB()
      const roster = await scope(Roster, ctx.tenantId).findOne({ weekId }).lean()
      deletedShift = roster?.shifts.find((s: any) => s._id.toString() === shiftId)
    } catch { /* non-critical */ }

    const data = await rosterService.deleteShift({ weekId, shiftId })

    // Fire-and-forget audit log
    if (deletedShift) {
      shiftAuditService.log({
        tenantId: ctx.tenantId,
        shiftId,
        employeeId: deletedShift.employeeId?.toString() ?? 'unknown',
        action: 'deleted',
        changedFields: [],
        actorId: ctx.auth.sub,
        actorType: 'user',
        before: {
          employeeId: deletedShift.employeeId,
          startTime: deletedShift.startTime,
          endTime: deletedShift.endTime,
          locationId: deletedShift.locationId,
          roleId: deletedShift.roleId,
        },
      }).catch(() => {})
    }

    return { status: 200, data }
  }
});
