import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { rosterService } from "@/lib/services/roster/roster-service"

// Validation schemas
const weekIdParamSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)")
})

const validateComplianceRequestSchema = z.object({
  organizationId: z.string()
})

const violationSchema = z.object({
  employeeId: z.string(),
  date: z.string(),
  ruleType: z.string(),
  ruleName: z.string(),
  message: z.string(),
  severity: z.string()
})

const validateComplianceResponseSchema = z.object({
  isCompliant: z.boolean(),
  violations: z.array(violationSchema),
  canPublish: z.boolean()
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional()
})

/**
 * POST /api/rosters/[weekId]/validate-compliance
 * Validate roster for compliance violations
 */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/rosters/{weekId}/validate-compliance',
  summary: 'Validate roster for compliance violations',
  description: 'Check roster for compliance violations and determine if it can be published',
  tags: ['rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema,
    body: validateComplianceRequestSchema
  },
  responses: {
    200: validateComplianceResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { weekId } = params!

    try {
      const { organizationId } = body!
      return await rosterService.validateCompliance(weekId, organizationId)
    } catch (err) {
      console.error("[api/rosters/[weekId]/validate-compliance POST]", err)
      return { 
        status: 500, 
        data: { error: "Failed to validate compliance" } 
      }
    }
  }
});
