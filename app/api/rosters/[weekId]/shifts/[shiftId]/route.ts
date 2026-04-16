import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { apiErrors } from "@/lib/api/api-error"
import { rosterService } from "@/lib/services/roster/roster-service"

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
    const data = await rosterService.updateShift({ weekId, shiftId, update: body! as any })
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
    const data = await rosterService.deleteShift({ weekId, shiftId })
    return { status: 200, data }
  }
});
