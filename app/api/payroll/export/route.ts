import { NextRequest, NextResponse } from 'next/server'
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { getApiKeyContext } from "@/lib/auth/api-key-middleware"
import { payrollExportService } from "@/lib/services/payroll/payroll-export-service"

export async function POST(req: NextRequest) {
  let ctx = await getAuthWithUserLocations()
  if (!ctx) {
    const apiCtx = await getApiKeyContext(req)
    if (!apiCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    ctx = { auth: { sub: apiCtx.keyId, role: "api_key" as any, email: "", tenantId: apiCtx.tenantId, locations: [], managedRoles: [] }, tenantId: apiCtx.tenantId, userLocations: null, managedRoles: null }
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

    const result = await payrollExportService.exportCsv({ ctx, payRunId, payrollSystemType, fileName, options })
    if (result.status !== 200) return NextResponse.json(result.data, { status: result.status })

    return new Response(result.data.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.data.fileName}"`,
        "X-Export-Summary": JSON.stringify(result.data.summary),
      },
    })
  } catch (err) {
    console.error("[api/payroll/export POST]", err)
    const message = err instanceof Error ? err.message : 'Failed to export payroll'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  let ctx = await getAuthWithUserLocations()
  if (!ctx) {
    const apiCtx = await getApiKeyContext(req)
    if (!apiCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    ctx = { auth: { sub: apiCtx.keyId, role: "api_key" as any, email: "", tenantId: apiCtx.tenantId, locations: [], managedRoles: [] }, tenantId: apiCtx.tenantId, userLocations: null, managedRoles: null }
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

    const { rows, summary, errors, rowCount } = await payrollExportService.preview({ payRunId, payrollSystemType })

    return NextResponse.json({
      rows,
      summary,
      errors,
      rowCount
    })
  } catch (err) {
    console.error("[api/payroll/export GET]", err)
    const message = err instanceof Error ? err.message : 'Failed to preview payroll export'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
