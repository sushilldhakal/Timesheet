import { connectDB } from "@/lib/db"
import Award from "@/lib/db/schemas/award"
import { AwardEngine } from "@/lib/engines/award-engine"
import { createApiRoute } from "@/lib/api/create-api-route"
import { awardIdParamSchema, awardEvaluationRequestSchema, awardEvaluationResponseSchema } from "@/lib/validations/award"
import { shiftContextSchema } from "@/lib/validations/awards"
import { errorResponseSchema } from "@/lib/validations/auth"

type RouteContext = { params: Promise<{ id: string }> }

/** POST /api/awards/[id]/evaluate - Evaluate award rules for given context */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/awards/{id}/evaluate',
  summary: 'Evaluate award rules',
  description: 'Evaluate which award rules apply for a given employee and work context',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    params: awardIdParamSchema,
    body: shiftContextSchema
  },
  responses: {
    200: awardEvaluationResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    if (!params || !body) {
      return {
        status: 400,
        data: { error: "Award ID and shift context are required" }
      };
    }

    const { id } = params;

    try {
      await connectDB()
      
      const award = await Award.findById(id)
      if (!award) {
        return {
          status: 404,
          data: { error: "Award not found" }
        };
      }

      if (!award.isActive) {
        return {
          status: 400,
          data: { error: "Award is not active" }
        };
      }

      // Use the new AwardEngine to process the shift
      const engine = new AwardEngine(award)
      const result = engine.processShift(body)

      return {
        status: 200,
        data: result
      };
    } catch (err) {
      console.error("[api/awards/[id]/evaluate POST]", err)
      return {
        status: 500,
        data: { error: "Failed to evaluate award rules" }
      };
    }
  }
});