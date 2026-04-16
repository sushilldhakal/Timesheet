import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import mongoose from "mongoose"
import { payRunService } from "@/lib/services/pay-run/pay-run-service"

const createPayRunSchema = z.object({
  tenantId: z.string(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  notes: z.string().optional()
})

const payRunQuerySchema = z.object({
  tenantId: z.string().optional(),
  status: z.enum(['draft', 'calculated', 'approved', 'exported']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/pay-runs',
  summary: 'Create a new pay run',
  description: 'Create a new draft pay run for a tenant',
  tags: ['PayRuns'],
  security: 'adminAuth',
  request: {
    body: createPayRunSchema,
  },
  responses: {
    201: z.object({
      success: z.boolean(),
      payRun: z.object({
        _id: z.string(),
        tenantId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        status: z.string(),
        notes: z.string().optional(),
        createdAt: z.date(),
        updatedAt: z.date()
      })
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    try {
      const result = await payRunService.createPayRun({ ctx, body: body! })
      return {
        status: 201,
        data: result
      }
    } catch (err) {
      console.error("[api/pay-runs POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create pay run" }
      }
    }
  }
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/pay-runs',
  summary: 'List pay runs',
  description: 'Get paginated list of pay runs for a tenant',
  tags: ['PayRuns'],
  security: 'adminAuth',
  request: {
    query: payRunQuerySchema,
  },
  responses: {
    200: z.object({
      payRuns: z.array(z.object({
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
        createdAt: z.date(),
        updatedAt: z.date()
      })),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number()
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    try {
      const result = await payRunService.listPayRuns({ bodyQuery: query! })
      return { status: 200, data: result }
    } catch (err) {
      console.error("[api/pay-runs GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch pay runs" }
      }
    }
  }
})