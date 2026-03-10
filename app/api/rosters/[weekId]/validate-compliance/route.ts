import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { ComplianceManager } from "@/lib/managers/compliance-manager"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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

      await connectDB()

      const { Roster } = await import("@/lib/db")
      const roster = await Roster.findOne({ weekId })

      if (!roster) {
        return { 
          status: 404, 
          data: { error: "Roster not found" } 
        }
      }

      const complianceManager = new ComplianceManager()
      const violations = await complianceManager.validateRoster(
        roster._id.toString(),
        organizationId
      )

      // Check if any violations block publishing
      const blockingViolations = violations.filter((v) => v.blockPublish)
      const canPublish = blockingViolations.length === 0

      return { 
        status: 200, 
        data: {
          isCompliant: violations.length === 0,
          violations: violations.map((v) => ({
            employeeId: v.employeeId,
            date: v.date,
            ruleType: v.ruleType,
            ruleName: v.ruleName,
            message: v.message,
            severity: v.severity,
          })),
          canPublish,
        } 
      }
    } catch (err) {
      console.error("[api/rosters/[weekId]/validate-compliance POST]", err)
      return { 
        status: 500, 
        data: { error: "Failed to validate compliance" } 
      }
    }
  }
});
