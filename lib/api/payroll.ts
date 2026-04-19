import { apiFetch } from './fetch-client'

export type PayrollSystemType = 'xero' | 'myob' | 'apa' | 'custom'

export interface RuleMapping {
  exportName: string
  payrollCode: string
  description: string
}

export interface PayItemMapping {
  type: 'pay' | 'deduction' | 'leave_accrual'
  exportName: string
  payrollCode: string
  description: string
}

export interface BreakMapping {
  breakType: string
  exportName: string
  payrollCode: string
}

export interface PayrollMappingData {
  _id: string
  payrollSystemType: PayrollSystemType
  ruleMapping: RuleMapping[]
  payItemMapping: PayItemMapping[]
  breakMapping: BreakMapping[]
  isDefault: boolean
  notes?: string
}

export interface PayrollMappingsResponse {
  mappings: PayrollMappingData[]
}

export interface CreatePayrollMappingRequest {
  payrollSystemType: PayrollSystemType
  ruleMapping: RuleMapping[]
  payItemMapping: PayItemMapping[]
  breakMapping: BreakMapping[]
  isDefault: boolean
  notes?: string
}

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
  source: string
}

export interface ExportSummary {
  totalEmployees: number
  totalShifts: number
  totalHours: number
  totalCost: number
  includesBreaks: boolean
  includesLeaveAccruals: boolean
}

export interface PayrollExportPreview {
  rows: ExportRow[]
  summary: ExportSummary
  errors: string[]
  rowCount: number
}

// Get payroll mappings by system type
export async function getPayrollMappings(payrollSystemType: PayrollSystemType): Promise<PayrollMappingsResponse> {
  return apiFetch<PayrollMappingsResponse>(`/api/payroll/mappings?payrollSystemType=${payrollSystemType}`)
}

// Create a new payroll mapping
export async function createPayrollMapping(data: CreatePayrollMappingRequest): Promise<PayrollMappingData> {
  return apiFetch<PayrollMappingData>('/api/payroll/mappings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Update an existing payroll mapping
export async function updatePayrollMapping(id: string, data: CreatePayrollMappingRequest): Promise<PayrollMappingData> {
  return apiFetch<PayrollMappingData>(`/api/payroll/mappings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete a payroll mapping
export async function deletePayrollMapping(id: string): Promise<void> {
  return apiFetch<void>(`/api/payroll/mappings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// Get payroll export preview (returns JSON preview data)
export async function getPayrollExportPreview(payRunId: string, payrollSystemType: PayrollSystemType): Promise<PayrollExportPreview> {
  return apiFetch<PayrollExportPreview>(
    `/api/payroll/export?payRunId=${encodeURIComponent(payRunId)}&payrollSystemType=${payrollSystemType}`,
  )
}

// Trigger payroll export (returns a Blob for download — handled in the component)
export async function exportPayroll(data: {
  payRunId: string
  payrollSystemType: PayrollSystemType
  fileName?: string
  options?: { includeBreaks?: boolean; includeLeaveAccruals?: boolean }
}): Promise<Response> {
  const response = await fetch('/api/payroll/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response
}

// Export payroll data and return as Blob for download
export async function exportPayrollData(data: {
  payRunId: string
  payrollSystemType: PayrollSystemType
  fileName?: string
  options?: { includeBreaks?: boolean; includeLeaveAccruals?: boolean }
}): Promise<Blob> {
  const response = await fetch('/api/payroll/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
    throw new Error(errorData.error || 'Export failed')
  }
  
  return response.blob()
}
