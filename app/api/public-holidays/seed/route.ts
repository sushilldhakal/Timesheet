import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { publicHolidaySeedService } from "@/lib/services/public-holiday/public-holiday-seed-service"

const seedBodySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200),
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/public-holidays/seed',
  summary: 'Seed Australian public holidays',
  description: 'Bulk upsert Australian public holidays for a given year',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    body: seedBodySchema,
  },
  responses: {
    200: z.object({
      success: z.boolean(),
      year: z.number(),
      upserted: z.number(),
      matchedOrModified: z.number(),
    }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      return {
        status: 200,
        data: await publicHolidaySeedService.seedYear(body!.year),
      }
    } catch (err) {
      console.error("[api/public-holidays/seed POST]", err)
      return { status: 500, data: { error: "Failed to seed public holidays" } }
    }
  },
})
