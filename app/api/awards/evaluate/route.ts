import { createApiRoute } from "@/lib/api/create-api-route"
import { awardEvaluateRawService } from "@/lib/services/award/award-evaluate-raw-service"
import { z } from "zod"

const evaluateBodySchema = z.any()
const evaluateResponseSchema = z.any()

/**
 * GET /api/awards/evaluate/test
 * 
 * Test endpoint with sample data
 */
export const POST = createApiRoute({
  method: "POST",
  path: "/api/awards/evaluate",
  summary: "Evaluate award (inline)",
  description: "Evaluate a shift against a provided award definition",
  tags: ["Awards"],
  request: { body: evaluateBodySchema },
  responses: { 200: evaluateResponseSchema, 400: z.any(), 500: z.any() },
  handler: async ({ body }) => {
    try {
      return awardEvaluateRawService.evaluate(body)
    } catch (error) {
      console.error("Award evaluation error:", error)
      return {
        status: 500,
        data: {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  },
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/awards/evaluate/test",
  summary: "Award evaluation test",
  description: "Returns a sample evaluation payload for testing",
  tags: ["Awards"],
  responses: { 200: z.any(), 500: z.any() },
  handler: async () => {
    try {
      return awardEvaluateRawService.sample()
    } catch (error) {
      console.error("Test evaluation error:", error)
      return {
        status: 500,
        data: { error: "Test failed", message: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  },
})