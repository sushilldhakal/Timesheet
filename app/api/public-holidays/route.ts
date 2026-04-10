import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { PublicHoliday } from "@/lib/db/schemas/public-holiday"
import { z } from "zod"

const listQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  state: z.enum(['NAT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']).optional(),
})

const createBodySchema = z.object({
  date: z.string().transform((s) => new Date(s)),
  name: z.string().min(1),
  state: z.enum(['NAT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']),
  isRecurring: z.boolean(),
})

function normalizeDateToLocalStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/public-holidays',
  summary: 'List public holidays',
  description: 'List public holidays with optional year and state filters',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    query: listQuerySchema,
  },
  responses: {
    200: z.object({
      publicHolidays: z.array(z.object({
        _id: z.string(),
        date: z.date(),
        name: z.string(),
        state: z.string(),
        isRecurring: z.boolean(),
        createdAt: z.date(),
      })),
    }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      await connectDB()

      const filter: Record<string, unknown> = {}
      if (query?.state) filter.state = query.state
      if (query?.year) {
        const start = new Date(query.year, 0, 1)
        const end = new Date(query.year, 11, 31, 23, 59, 59, 999)
        filter.date = { $gte: start, $lte: end }
      }

      const publicHolidays = await PublicHoliday.find(filter).sort({ date: 1, state: 1 }).lean()

      return {
        status: 200,
        data: {
          publicHolidays: publicHolidays.map((h: any) => ({
            _id: String(h._id),
            date: h.date,
            name: h.name,
            state: h.state,
            isRecurring: h.isRecurring,
            createdAt: h.createdAt,
          })),
        },
      }
    } catch (err) {
      console.error("[api/public-holidays GET]", err)
      return { status: 500, data: { error: "Failed to fetch public holidays" } }
    }
  },
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/public-holidays',
  summary: 'Create a public holiday',
  description: 'Create a single public holiday entry',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    body: createBodySchema,
  },
  responses: {
    201: z.object({
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
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      await connectDB()

      const payload = body!
      const normalizedDate = normalizeDateToLocalStartOfDay(payload.date)

      const publicHoliday = await PublicHoliday.create({
        date: normalizedDate,
        name: payload.name,
        state: payload.state,
        isRecurring: payload.isRecurring,
      })

      return {
        status: 201,
        data: {
          success: true,
          publicHoliday: {
            _id: String((publicHoliday as any)._id),
            date: (publicHoliday as any).date,
            name: (publicHoliday as any).name,
            state: (publicHoliday as any).state,
            isRecurring: (publicHoliday as any).isRecurring,
            createdAt: (publicHoliday as any).createdAt,
          },
        },
      }
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : 'Failed to create public holiday'
      const isDup = err?.code === 11000
      console.error("[api/public-holidays POST]", err)
      return { status: isDup ? 400 : 500, data: { error: isDup ? "Public holiday already exists for that date/state" : message } }
    }
  },
})
