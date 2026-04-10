import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { PayItem } from "@/lib/db/schemas/pay-item"
import { Employee } from "@/lib/db/schemas/employee"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

const payRunParamsSchema = z.object({
  id: z.string()
})

const payItemSchema = z.object({
  type: z.string(),
  name: z.string(),
  exportName: z.string(),
  from: z.date(),
  to: z.date(),
  hours: z.number(),
  rate: z.number(),
  multiplier: z.number(),
  amount: z.number()
})

const employeePayDataSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  totalHours: z.number(),
  totalAmount: z.number(),
  payItems: z.array(payItemSchema)
})

const exportResponseSchema = z.object({
  payRun: z.object({
    _id: z.string(),
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
    })
  }),
  employees: z.array(employeePayDataSchema)
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/pay-runs/[id]/export',
  summary: 'Export pay run',
  description: 'Export all pay items for this pay run in Tanda-compatible format',
  tags: ['PayRuns'],
  security: 'adminAuth',
  request: {
    params: payRunParamsSchema,
  },
  responses: {
    200: exportResponseSchema,
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

      // Fetch pay run
      const payRun = await PayRun.findById(id).lean()

      if (!payRun) {
        return {
          status: 404,
          data: { error: "Pay run not found" }
        }
      }

      // Fetch all pay items for this pay run
      const payItems = await PayItem.find({ payRunId: payRun._id })
        .sort({ employeeId: 1, from: 1 })
        .lean()

      // Group by employee
      const employeeMap = new Map<string, {
        employeeId: string
        employeeName: string
        totalHours: number
        totalAmount: number
        payItems: any[]
      }>()

      for (const item of payItems) {
        const employeeId = item.employeeId.toString()

        if (!employeeMap.has(employeeId)) {
          // Fetch employee name
          const employee = await Employee.findById(employeeId).select('name').lean()
          
          employeeMap.set(employeeId, {
            employeeId,
            employeeName: employee?.name || 'Unknown Employee',
            totalHours: 0,
            totalAmount: 0,
            payItems: []
          })
        }

        const employeeData = employeeMap.get(employeeId)!
        employeeData.totalHours += item.hours
        employeeData.totalAmount += item.amount
        employeeData.payItems.push({
          type: item.type,
          name: item.name,
          exportName: item.exportName,
          from: item.from,
          to: item.to,
          hours: item.hours,
          rate: item.rate,
          multiplier: item.multiplier,
          amount: item.amount
        })
      }

      // Convert map to array
      const employees = Array.from(employeeMap.values())

      return {
        status: 200,
        data: {
          payRun: {
            _id: payRun._id.toString(),
            startDate: payRun.startDate,
            endDate: payRun.endDate,
            status: payRun.status,
            totals: payRun.totals
          },
          employees
        }
      }

    } catch (err) {
      console.error("[api/pay-runs/[id]/export GET]", err)
      return {
        status: 500,
        data: { error: "Failed to export pay run" }
      }
    }
  }
})
