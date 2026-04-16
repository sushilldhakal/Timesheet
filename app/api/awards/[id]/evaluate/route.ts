import { createApiRoute } from "@/lib/api/create-api-route"
import { awardIdParamSchema, awardEvaluationRequestSchema, awardEvaluationResponseSchema } from "@/lib/validations/award"
import { shiftContextSchema } from "@/lib/validations/awards"
import { errorResponseSchema } from "@/lib/validations/auth"
import { awardEvaluationService } from "@/lib/services/award/award-evaluation-service"

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

    return await awardEvaluationService.evaluateById({ id, context: body })
  }
});