import { scope } from "@/lib/db/tenant-model"
import { PayrollExport } from "@/lib/db/schemas/payroll-export"

const BACKOFF_BASE_MS = 5 * 60_000 // 5 minutes

export const exportRetryService = {
  /**
   * Record a full export failure and schedule a retry with exponential backoff.
   */
  async recordFailure(tenantId: string, exportId: string, error: string): Promise<void> {
    const doc = await scope(PayrollExport, tenantId).findById(exportId)
    if (!doc) return

    const retryCount = (doc.retryCount ?? 0) + 1
    const maxRetries = doc.maxRetries ?? 5
    const status = retryCount >= maxRetries ? "failed" : "pending"
    const backoffMs = BACKOFF_BASE_MS * Math.pow(2, retryCount - 1)

    await scope(PayrollExport, tenantId).findOneAndUpdate(
      { _id: exportId },
      {
        $set: {
          status,
          errorLog: error,
          retryCount,
          lastAttemptAt: new Date(),
          nextRetryAt: status === "pending" ? new Date(Date.now() + backoffMs) : undefined,
        },
      }
    )
  },

  /**
   * Record a per-employee export failure.
   */
  async recordEmployeeFailure(
    tenantId: string,
    exportId: string,
    employeeId: string,
    error: string
  ): Promise<void> {
    await scope(PayrollExport, tenantId).updateOne(
      { _id: exportId, "employeeResults.employeeId": employeeId },
      {
        $set: {
          "employeeResults.$.status": "failed",
          "employeeResults.$.error": error,
        },
        $inc: { "employeeResults.$.retryCount": 1 },
      }
    )
  },

  /**
   * Get all exports due for retry for a tenant.
   */
  async getDueForRetry(tenantId: string) {
    return scope(PayrollExport, tenantId)
      .find({
        status: "pending",
        nextRetryAt: { $lte: new Date() },
        retryCount: { $lt: 5 },
      })
      .lean()
  },
}
