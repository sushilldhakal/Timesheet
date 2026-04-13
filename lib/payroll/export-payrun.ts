import { format } from 'date-fns'
import { connectDB } from '@/lib/db'
import { PayRun } from '@/lib/db/schemas/pay-run'
import { DailyShift } from '@/lib/db/schemas/daily-shift'
import { Employee } from '@/lib/db/schemas/employee'
import { PayrollMapping } from '@/lib/db/schemas/payroll-mapping'

export interface ExportRow {
  employeeId: string
  employeeName: string
  pinNumber: string
  payPeriodStart: string
  payPeriodEnd: string
  payItemCode: string
  payItemDescription: string
  units: number
  cost: number
  lineReference: string
  source: 'shift' | 'leave' | 'adjustment'
}

export async function generatePayrollExport(
  payRunId: string,
  payrollSystemType: 'xero' | 'myob' | 'apa' | 'custom',
  options?: {
    includeBreaks?: boolean
    includeLeaveAccruals?: boolean
    groupByEmployee?: boolean
  }
): Promise<{
  rows: ExportRow[]
  summary: {
    totalEmployees: number
    totalShifts: number
    totalHours: number
    totalCost: number
    includesBreaks: boolean
    includesLeaveAccruals: boolean
  }
  errors: string[]
}> {
  await connectDB()

  const payRun = await PayRun.findById(payRunId).lean()
  if (!payRun) throw new Error('PayRun not found')

  const mapping = await PayrollMapping.findOne({
    tenantId: payRun.tenantId,
    payrollSystemType,
    isDefault: true
  }).lean()

  if (!mapping) {
    throw new Error(`No default payroll mapping found for ${payrollSystemType}`)
  }

  const shifts = await DailyShift.find({
    'paySnapshot.payRunId': payRun._id,
    status: { $in: ['approved', 'locked', 'processed'] }
  }).lean()

  const rows: ExportRow[] = []
  const errors: string[] = []
  const employeeMap = new Map<string, { id: string; name: string; pin: string }>()
  const employeeCache = new Map<string, { name: string; pin: string } | null>()

  for (const shift of shifts) {
    const empId = shift.employeeId?.toString()
    if (!empId) continue

    if (!employeeCache.has(empId)) {
      const employee = await Employee.findById(empId).select('name pin').lean()
      employeeCache.set(empId, employee ? { name: employee.name, pin: employee.pin } : null)
    }

    const emp = employeeCache.get(empId)
    if (!emp) {
      errors.push(`Employee ${empId} not found for shift ${shift._id}`)
      continue
    }

    employeeMap.set(empId, { id: empId, name: emp.name, pin: emp.pin })

    const payLines = shift.computed?.payLines || []

    for (const lineItem of payLines) {
      const mappedRule = mapping.ruleMapping.find(
        (m: { exportName: string }) => m.exportName === lineItem.exportName
      )

      if (!mappedRule) {
        errors.push(`No payroll code mapping for exportName "${lineItem.exportName}"`)
      }

      rows.push({
        employeeId: empId,
        employeeName: emp.name,
        pinNumber: emp.pin || '',
        payPeriodStart: format(payRun.startDate, 'yyyy-MM-dd'),
        payPeriodEnd: format(payRun.endDate, 'yyyy-MM-dd'),
        payItemCode: mappedRule?.payrollCode || lineItem.exportName,
        payItemDescription: lineItem.exportName,
        units: lineItem.units,
        cost: lineItem.cost,
        lineReference: `SHIFT-${shift._id}`,
        source: 'shift'
      })
    }

    if (options?.includeBreaks && shift.computed?.breakEntitlements?.length) {
      for (const breakRecord of shift.computed.breakEntitlements) {
        const breakMappingEntry = mapping.breakMapping.find(
          (m: { breakType: string }) =>
            m.breakType === (breakRecord.isPaid ? 'rest' : 'meal')
        )

        if (breakMappingEntry) {
          rows.push({
            employeeId: empId,
            employeeName: emp.name,
            pinNumber: emp.pin || '',
            payPeriodStart: format(payRun.startDate, 'yyyy-MM-dd'),
            payPeriodEnd: format(payRun.endDate, 'yyyy-MM-dd'),
            payItemCode: breakMappingEntry.payrollCode,
            payItemDescription: breakMappingEntry.exportName,
            units: breakRecord.durationMinutes / 60,
            cost: 0,
            lineReference: `BREAK-${shift._id}`,
            source: 'shift'
          })
        }
      }
    }

    if (options?.includeLeaveAccruals && shift.computed?.leaveAccruals?.length) {
      for (const accrual of shift.computed.leaveAccruals) {
        const payItemEntry = mapping.payItemMapping.find(
          (m: { exportName: string }) => m.exportName === accrual.exportName
        )

        if (payItemEntry) {
          rows.push({
            employeeId: empId,
            employeeName: emp.name,
            pinNumber: emp.pin || '',
            payPeriodStart: format(payRun.startDate, 'yyyy-MM-dd'),
            payPeriodEnd: format(payRun.endDate, 'yyyy-MM-dd'),
            payItemCode: payItemEntry.payrollCode,
            payItemDescription: accrual.exportName,
            units: accrual.hoursAccrued,
            cost: 0,
            lineReference: `LEAVE-${shift._id}`,
            source: 'leave'
          })
        }
      }
    }
  }

  if (options?.groupByEmployee) {
    rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  }

  const summary = {
    totalEmployees: employeeMap.size,
    totalShifts: shifts.length,
    totalHours: rows.reduce((sum, r) => sum + r.units, 0),
    totalCost: rows.reduce((sum, r) => sum + r.cost, 0),
    includesBreaks: options?.includeBreaks ?? false,
    includesLeaveAccruals: options?.includeLeaveAccruals ?? false
  }

  return { rows, summary, errors }
}

export function convertRowsToCSV(rows: ExportRow[]): string {
  const headers = [
    'EmployeeID',
    'EmployeeName',
    'PINNumber',
    'PayPeriodStart',
    'PayPeriodEnd',
    'PayItemCode',
    'PayItemDescription',
    'Units',
    'Cost',
    'LineReference'
  ]

  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      [
        escapeCSV(row.employeeId),
        escapeCSV(row.employeeName),
        escapeCSV(row.pinNumber),
        row.payPeriodStart,
        row.payPeriodEnd,
        escapeCSV(row.payItemCode),
        escapeCSV(row.payItemDescription),
        row.units.toFixed(2),
        row.cost.toFixed(2),
        escapeCSV(row.lineReference)
      ].join(',')
    )
  ]

  return csvRows.join('\n')
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return '""'
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
