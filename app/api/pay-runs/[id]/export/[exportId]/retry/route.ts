import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { payrollExportService } from "@/lib/services/payroll/payroll-export-service"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
  exportId: z.string(),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/pay-runs/{id}/export/{exportId}/retry",
  summary: "Retry a failed export",
  description: "Retry a failed payroll export using the stored payload",
  tags: ["Payroll"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({ export: z.any() }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      const exportRecord = await payrollExportService.retryExport(ctx, params!.exportId)
      return { status: 200, data: { export: exportRecord } }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Retry failed"
      if (message === "Export record not found") {
        return { status: 404, data: { error: message } }
      }
      if (message === "Only failed exports can be retried") {
        return { status: 400, data: { error: message } }
      }
      return { status: 500, data: { error: message } }
    }
  },
})
