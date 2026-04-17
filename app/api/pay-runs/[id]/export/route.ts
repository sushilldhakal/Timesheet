import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { payrollExportService } from "@/lib/services/payroll/payroll-export-service"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

const bodySchema = z.object({
  system: z.enum(["xero", "myob", "apa", "custom"]),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/pay-runs/{id}/export",
  summary: "Export a pay run",
  description: "Trigger payroll export for a pay run to the specified system",
  tags: ["Payroll"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
    body: bodySchema,
  },
  responses: {
    200: z.object({ export: z.any() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const exportRecord = await payrollExportService.executeExport(
      ctx,
      params!.id,
      body!.system,
      ctx.sub
    )

    return { status: 200, data: { export: exportRecord } }
  },
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/pay-runs/{id}/export",
  summary: "Get export history",
  description: "Get all export records for a pay run",
  tags: ["Payroll"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({ exports: z.array(z.any()) }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const exports = await payrollExportService.getExportHistory(ctx, params!.id)
    return { status: 200, data: { exports } }
  },
})
