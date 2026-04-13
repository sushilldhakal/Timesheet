import { NextRequest, NextResponse } from 'next/server'
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { generatePayrollExport, convertRowsToCSV } from "@/lib/payroll/export-payrun"

export async function POST(req: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { payRunId, payrollSystemType, fileName, options } = await req.json()

    if (!payRunId || !payrollSystemType) {
      return NextResponse.json(
        { error: 'Missing payRunId or payrollSystemType' },
        { status: 400 }
      )
    }

    if (!['xero', 'myob', 'apa', 'custom'].includes(payrollSystemType)) {
      return NextResponse.json(
        { error: 'Invalid payrollSystemType' },
        { status: 400 }
      )
    }

    const { rows, summary, errors } = await generatePayrollExport(
      payRunId,
      payrollSystemType,
      options
    )

    if (!rows.length) {
      return NextResponse.json(
        { error: 'No shifts to export', errors },
        { status: 400 }
      )
    }

    const csv = convertRowsToCSV(rows)

    await connectDB()

    await PayRun.findByIdAndUpdate(payRunId, {
      exportedAt: new Date(),
      exportType: payrollSystemType,
      exportReference: fileName || `payroll-export-${payRunId}.csv`,
      exportedBy: ctx.auth.sub,
      status: 'exported'
    })

    await DailyShift.updateMany(
      { 'paySnapshot.payRunId': payRunId },
      {
        exportedAt: new Date(),
        status: 'exported'
      }
    )

    const finalFileName = fileName || `payroll-export-${payRunId}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${finalFileName}"`,
        'X-Export-Summary': JSON.stringify(summary)
      }
    })
  } catch (err) {
    console.error("[api/payroll/export POST]", err)
    const message = err instanceof Error ? err.message : 'Failed to export payroll'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const payRunId = searchParams.get('payRunId')
    const payrollSystemType = searchParams.get('payrollSystemType') as 'xero' | 'myob' | 'apa' | 'custom'

    if (!payRunId || !payrollSystemType) {
      return NextResponse.json(
        { error: 'Missing payRunId or payrollSystemType' },
        { status: 400 }
      )
    }

    const { rows, summary, errors } = await generatePayrollExport(
      payRunId,
      payrollSystemType
    )

    return NextResponse.json({
      rows,
      summary,
      errors,
      rowCount: rows.length
    })
  } catch (err) {
    console.error("[api/payroll/export GET]", err)
    const message = err instanceof Error ? err.message : 'Failed to preview payroll export'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
