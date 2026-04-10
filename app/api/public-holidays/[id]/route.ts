import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { PublicHoliday } from "@/lib/db/schemas/public-holiday"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

const updateBodySchema = z.object({
  date: z.string().transform((s) => new Date(s)).optional(),
  name: z.string().min(1).optional(),
  state: z.enum(['NAT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']).optional(),
  isRecurring: z.boolean().optional(),
})

function normalizeDateToLocalStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/public-holidays/[id]',
  summary: 'Get public holiday',
  description: 'Get a single public holiday by id',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({
      publicHoliday: z.object({
        _id: z.string(),
        date: z.date(),
        name: z.string(),
        state: z.string(),
        isRecurring: z.boolean(),
        createdAt: z.date(),
      }),
    }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      await connectDB()
      const holiday = await PublicHoliday.findById(params!.id).lean()
      if (!holiday) return { status: 404, data: { error: "Public holiday not found" } }

      return {
        status: 200,
        data: {
          publicHoliday: {
            _id: String((holiday as any)._id),
            date: (holiday as any).date,
            name: (holiday as any).name,
            state: (holiday as any).state,
            isRecurring: (holiday as any).isRecurring,
            createdAt: (holiday as any).createdAt,
          },
        },
      }
    } catch (err) {
      console.error("[api/public-holidays/[id] GET]", err)
      return { status: 500, data: { error: "Failed to fetch public holiday" } }
    }
  },
})

export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/public-holidays/[id]',
  summary: 'Update public holiday',
  description: 'Update an existing public holiday by id',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    params: paramsSchema,
    body: updateBodySchema,
  },
  responses: {
    200: z.object({
      success: z.boolean(),
      publicHoliday: z.object({
        _id: z.string(),
        date: z.date(),
        name: z.string(),
        state: z.string(),
        isRecurring: z.boolean(),
        createdAt: z.date(),
      }),
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      await connectDB()

      const updates: Record<string, unknown> = {}
      if (body?.date) updates.date = normalizeDateToLocalStartOfDay(body.date)
      if (typeof body?.name === 'string') updates.name = body.name
      if (typeof body?.state === 'string') updates.state = body.state
      if (typeof body?.isRecurring === 'boolean') updates.isRecurring = body.isRecurring

      const updated = await PublicHoliday.findByIdAndUpdate(
        params!.id,
        { $set: updates },
        { new: true, runValidators: true }
      )

      if (!updated) return { status: 404, data: { error: "Public holiday not found" } }

      return {
        status: 200,
        data: {
          success: true,
          publicHoliday: {
            _id: String((updated as any)._id),
            date: (updated as any).date,
            name: (updated as any).name,
            state: (updated as any).state,
            isRecurring: (updated as any).isRecurring,
            createdAt: (updated as any).createdAt,
          },
        },
      }
    } catch (err: any) {
      const isDup = err?.code === 11000
      console.error("[api/public-holidays/[id] PUT]", err)
      return {
        status: isDup ? 400 : 500,
        data: { error: isDup ? "Public holiday already exists for that date/state" : "Failed to update public holiday" },
      }
    }
  },
})

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/public-holidays/[id]',
  summary: 'Delete public holiday',
  description: 'Delete a public holiday by id',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({ success: z.boolean() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      await connectDB()
      const deleted = await PublicHoliday.findByIdAndDelete(params!.id)
      if (!deleted) return { status: 404, data: { error: "Public holiday not found" } }
      return { status: 200, data: { success: true } }
    } catch (err) {
      console.error("[api/public-holidays/[id] DELETE]", err)
      return { status: 500, data: { error: "Failed to delete public holiday" } }
    }
  },
})
