import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { EmployeeAwardAssignment } from "@/lib/db/schemas/employee-award-assignment"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
  assignmentId: z.string(),
})

const bodySchema = z.object({
  awardId: z.string().optional(),
  priority: z.number().min(1).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional().nullable(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const PUT = createApiRoute({
  method: "PUT",
  path: "/api/employees/{id}/award-assignments/{assignmentId}",
  summary: "Update award assignment",
  description: "Update an existing award assignment",
  tags: ["Employees", "Awards"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
    body: bodySchema,
  },
  responses: {
    200: z.object({ assignment: z.any() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const update: Record<string, unknown> = {}
    if (body?.awardId !== undefined) update.awardId = body.awardId
    if (body?.priority !== undefined) update.priority = body.priority
    if (body?.validFrom !== undefined) update.validFrom = new Date(body.validFrom)
    if (body?.validTo !== undefined) update.validTo = body.validTo ? new Date(body.validTo) : null
    if (body?.notes !== undefined) update.notes = body.notes
    if (body?.isActive !== undefined) update.isActive = body.isActive

    const assignment = await scope(EmployeeAwardAssignment, ctx.tenantId).findOneAndUpdate(
      { _id: params!.assignmentId, employeeId: params!.id },
      { $set: update },
      { new: true }
    )

    if (!assignment) {
      return { status: 404, data: { error: "Assignment not found" } }
    }

    return { status: 200, data: { assignment } }
  },
})

export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/employees/{id}/award-assignments/{assignmentId}",
  summary: "Deactivate award assignment",
  description: "Deactivate an award assignment (soft delete)",
  tags: ["Employees", "Awards"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({ message: z.string() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const assignment = await scope(EmployeeAwardAssignment, ctx.tenantId).findOneAndUpdate(
      { _id: params!.assignmentId, employeeId: params!.id },
      { $set: { isActive: false } }
    )

    if (!assignment) {
      return { status: 404, data: { error: "Assignment not found" } }
    }

    return { status: 200, data: { message: "Assignment deactivated" } }
  },
})
