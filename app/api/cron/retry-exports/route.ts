import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { DomainEventLog } from '@/lib/db/schemas/domain-event-log'
import { exportRetryService } from '@/lib/services/payroll/export-retry-service'
import { payrollExportService } from '@/lib/services/payroll/payroll-export-service'

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Find all tenants with pending export retries
  const pendingExports = await DomainEventLog.distinct('tenantId', {
    // Use PayrollExport directly — find all tenants with pending retries
  })

  // Simpler: query PayrollExport directly across all tenants
  const { PayrollExport } = await import('@/lib/db/schemas/payroll-export')
  const dueExports = await PayrollExport.find({
    status: 'pending',
    nextRetryAt: { $lte: new Date() },
    retryCount: { $lt: 5 },
  }).lean()

  let processed = 0
  let succeeded = 0
  let failed = 0

  for (const exportDoc of dueExports) {
    processed++
    try {
      const ctx = {
        type: 'full' as const,
        sub: exportDoc.exportedBy.toString(),
        email: '',
        role: 'admin',
        tenantId: exportDoc.tenantId.toString(),
        locations: [],
        managedRoles: [],
      }

      await payrollExportService.retryExport(ctx, exportDoc._id.toString())
      succeeded++
    } catch (err) {
      failed++
      const message = err instanceof Error ? err.message : 'Unknown error'
      await exportRetryService.recordFailure(
        exportDoc.tenantId.toString(),
        exportDoc._id.toString(),
        message
      )
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    succeeded,
    failed,
    timestamp: new Date().toISOString(),
  })
}
