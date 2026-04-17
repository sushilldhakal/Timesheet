import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { EmployeeAwardAssignment } from "@/lib/db/schemas/employee-award-assignment"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

const bodySchema = z.object({
  awardId: z.string(),
  priority: z.number().min(1).default(1),
  validFrom: z.string(),
  validTo: z.string().optional(),
  notes: z.string().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/employees/{id}/award-assignments",
  summary: "List award assignments",
  description: "List all award assignments for an employee",
  tags: ["Employees", "Awards"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({ assignments: z.array(z.any()) }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const assignments = await scope(EmployeeAwardAssignment, ctx.tenantId)
      .find({ employeeId: params!.id })
      .sort({ priority: 1, validFrom: -1 })
      .lean()

    return { status: 200, data: { assignments } }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/employees/{id}/award-assignments",
  summary: "Create award assignment",
  description: "Assign an award to an employee with a validity period",
  tags: ["Employees", "Awards"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
    body: bodySchema,
  },
  responses: {
    201: z.object({ assignment: z.any() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const assignment = await scope(EmployeeAwardAssignment, ctx.tenantId).create({
      tenantId: ctx.tenantId,
      employeeId: params!.id,
      awardId: body!.awardId,
      priority: body!.priority,
      validFrom: new Date(body!.validFrom),
      validTo: body!.validTo ? new Date(body!.validTo) : undefined,
      notes: body!.notes,
      isActive: true,
      assignedBy: ctx.sub,
      assignedAt: new Date(),
    })

    return { status: 201, data: { assignment } }
  },
})
