import { createApiRoute } from "@/lib/api/create-api-route"
import { format, parse, isValid, subDays } from "date-fns"
import { flagsQuerySchema, flagsResponseSchema } from "@/lib/validations/flags"
import { errorResponseSchema } from "@/lib/validations/auth"
import type { FlagIssueType, FlagRow } from "@/lib/types/flags"
import { flagsService } from "@/lib/services/flags/flags-service"

function getIssueType(hasImage: boolean, hasLocation: boolean): FlagIssueType | null {
  if (!hasImage && !hasLocation) return "no_image_no_location"
  if (!hasImage) return "no_image"
  if (!hasLocation) return "no_location"
  return null
}

const TYPE_LABELS: Record<string, string> = {
  in: "Clock In",
  out: "Clock Out",
  break: "Break In",
  endBreak: "End Break",
}

/** GET /api/flags?filter=no_image|no_location|no_image_no_location&limit=50&offset=0 - Flagged punches (last 30 days) */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/flags',
  summary: 'Get flagged punches',
  description: 'Get flagged clock-in/out punches from the last 30 days with optional filtering',
  tags: ['Flags'],
  security: 'adminAuth',
  request: {
    query: flagsQuerySchema,
  },
  responses: {
    200: flagsResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    return {
      status: 200,
      data: await flagsService.list(query),
    }
  }
})