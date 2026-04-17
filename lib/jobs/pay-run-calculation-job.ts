import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { payCalculationService } from "@/lib/services/payroll/pay-calculation-service"

/**
 * Background job for pay run calculation.
 * Large pay runs (100+ employees) should not block the HTTP request.
 *
 * The API route starts this job and returns { jobId, status: "processing" }.
 * The client polls GET /api/pay-runs/[id] which returns current status.
 */
export async function runPayCalculationJob(tenantId: string, payRunId: string): Promise<void> {
  await connectDB()

  // Build a minimal TenantContext for the job
  const ctx = {
    type: "full" as const,
    sub: "system",
    email: "system@internal",
    role: "admin",
    tenantId,
    locations: [],
    managedRoles: [],
  }

  try {
    // Mark pay run as processing
    await scope(PayRun, tenantId).findOneAndUpdate(
      { _id: payRunId },
      { $set: { status: "draft", jobError: null } }
    )

    await payCalculationService.calculatePayRun(ctx, payRunId)

    console.log(`[PayRunJob] Completed calculation for payRunId=${payRunId}`)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    console.error(`[PayRunJob] Failed for payRunId=${payRunId}:`, errorMessage)

    // Mark pay run as failed
    await scope(PayRun, tenantId).findOneAndUpdate(
      { _id: payRunId },
      { $set: { status: "failed", jobError: errorMessage } }
    )
  }
}
