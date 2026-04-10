import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

const payRunParamsSchema = z.object({
  id: z.string()
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/pay-runs/[id]',
  summary: 'Get pay run by ID',
  description: 'Get a single pay run with its pay items summary',
  tags: ['PayRuns'],
  security: 'adminAuth',
  request: {
    params: payRunParamsSchema,
  },
  responses: {
    200: z.object({
      payRun: z.object({
        _id: z.string(),
        tenantId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        status: z.string(),
        totals: z.object({
          gross: z.number(),
          tax: z.number(),
          super: z.number(),
          net: z.number(),
          totalHours: z.number(),
          employeeCount: z.number()
        }),
        notes: z.string().optional(),
        createdBy: z.string(),
        approvedBy: z.string().optional(),
        approvedAt: z.date().optional(),
        exportedAt: z.date().optional(),
        createdAt: z.date(),
        updatedAt: z.date()
      })
    }),
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const { id } = params!

    try {
      await connectDB()

      const payRun = await PayRun.findById(id).lean()

      if (!payRun) {
        return {
          status: 404,
          data: { error: "Pay run not found" }
        }
      }

      return {
        status: 200,
        data: { payRun }
      }
    } catch (err) {
      console.error("[api/pay-runs/[id] GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch pay run" }
      }
    }
  }
})
