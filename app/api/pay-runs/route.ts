import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import mongoose from "mongoose"

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

    const { tenantId, startDate, endDate, notes } = body!

    if (!tenantId || tenantId === "default" || !mongoose.Types.ObjectId.isValid(tenantId)) {
      return {
        status: 400,
        data: { error: "Valid tenantId is required" }
      }
    }

    // Validate date range
    if (startDate >= endDate) {
      return {
        status: 400,
        data: { error: "Start date must be before end date" }
      }
    }

    try {
      await connectDB()

      // Check for overlapping pay runs
      const existingPayRun = await PayRun.findOne({
        tenantId,
        $or: [
          // New range starts during existing range
          { startDate: { $lte: startDate }, endDate: { $gt: startDate } },
          // New range ends during existing range
          { startDate: { $lt: endDate }, endDate: { $gte: endDate } },
          // New range completely contains existing range
          { startDate: { $gte: startDate }, endDate: { $lte: endDate } },
          // Existing range completely contains new range
          { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
        ]
      })

      if (existingPayRun) {
        return {
          status: 400,
          data: { error: "Pay run date range overlaps with existing pay run" }
        }
      }

      const payRun = await PayRun.create({
        tenantId,
        startDate,
        endDate,
        status: 'draft',
        createdBy: ctx.auth.sub,
        notes,
        totals: {
          gross: 0,
          tax: 0,
          super: 0,
          net: 0,
          totalHours: 0,
          employeeCount: 0
        }
      })

      return {
        status: 201,
        data: {
          success: true,
          payRun
        }
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

    const { tenantId, status, page, limit } = query!

    if (!tenantId || tenantId === "default" || !mongoose.Types.ObjectId.isValid(tenantId)) {
      return {
        status: 400,
        data: { error: "Valid tenantId is required" }
      }
    }

    try {
      await connectDB()

      const filter: any = { tenantId }
      if (status) {
        filter.status = status
      }

      const skip = (page - 1) * limit
      
      const [payRuns, total] = await Promise.all([
        PayRun.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PayRun.countDocuments(filter)
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        status: 200,
        data: {
          payRuns,
          total,
          page,
          limit,
          totalPages
        }
      }
    } catch (err) {
      console.error("[api/pay-runs GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch pay runs" }
      }
    }
  }
})