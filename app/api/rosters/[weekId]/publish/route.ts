import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { assertManagerSchedulingScope } from "@/lib/auth/scheduling-scope"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { apiErrors } from "@/lib/api/api-error"
import { rosterService } from "@/lib/services/roster/roster-service"
import { getTenantContext } from "@/lib/auth/tenant-context"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { Roster } from "@/lib/db/schemas/roster"
import { eventBus } from "@/lib/events/event-bus"
import { DOMAIN_EVENTS, makeEventId } from "@/lib/events/domain-events"

// Validation schemas
const weekIdParamSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)")
})

const publishResponseSchema = z.object({
  message: z.string(),
  roster: z.any(),
  publishedCount: z.number().optional(),
})

const publishScopedBodySchema = z.object({
  locationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid location ID"),
  roleIds: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid role ID")).min(1),
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.string().optional()
})

/** PUT /api/rosters/[weekId]/publish - Publish a roster */
export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/rosters/{weekId}/publish',
  summary: 'Publish a roster',
  description: 'Publish a roster to make it visible to employees',
  tags: ['rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema
  },
  responses: {
    200: publishResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    const weekId = params!.weekId
    if (!ctx) throw apiErrors.unauthorized()
    const data = await rosterService.publishRoster(weekId)

    // Fire-and-forget: emit event (new path) + direct notify (DUAL_WRITE_DEPRECATED: remove after 2025-07-01)
    const tenantCtx = await getTenantContext()
    if (tenantCtx && tenantCtx.type === "full") {
      try {
        await connectDB()
        const roster = await scope(Roster, tenantCtx.tenantId).findOne({ weekId }).lean()
        if (roster) {
          const rawIds: string[] = roster.shifts
            .filter((s: any) => s.employeeId)
            .map((s: any) => String(s.employeeId))
          const employeeIds: string[] = Array.from(new Set(rawIds))
          const locationId = roster.shifts[0]?.locationId?.toString() ?? ""

          // Emit domain event (listeners handle notifications)
          eventBus.emit({
            eventType: DOMAIN_EVENTS.ROSTER_PUBLISHED,
            tenantId: tenantCtx.tenantId,
            entityId: roster._id.toString(),
            entityType: 'roster',
            actorId: ctx.auth.sub,
            occurredAt: new Date(),
            eventId: makeEventId(DOMAIN_EVENTS.ROSTER_PUBLISHED, weekId, true),
            payload: { weekId, locationId, employeeIds, shiftCount: roster.shifts.length },
          }).catch(() => {})
        }
      } catch {
        // Non-critical
      }
    }

    return { status: 200, data }
  }
})

/** POST /api/rosters/[weekId]/publish — publish only shifts in location + role scope */
export const POST = createApiRoute({
  method: "POST",
  path: "/api/rosters/{weekId}/publish",
  summary: "Publish scoped shifts",
  description: "Set shift.status to published for shifts matching location and roles",
  tags: ["rosters"],
  security: "adminAuth",
  request: {
    params: weekIdParamSchema,
    body: publishScopedBodySchema,
  },
  responses: {
    200: publishResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()

    const weekId = params!.weekId
    const { locationId, roleIds } = body!

    const scope = await assertManagerSchedulingScope(ctx, locationId, roleIds)
    if (!scope.ok) {
      return { status: scope.status, data: { error: scope.error } }
    }

    const data = await rosterService.publishShiftsInScope({ weekId, locationId, roleIds })
    return { status: 200, data }
  },
})
