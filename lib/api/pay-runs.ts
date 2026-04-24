import { apiFetch } from './fetch-client'

const BASE_URL = '/api/pay-runs'

export interface PayRun {
  _id: string
  tenantId: string
  startDate: string
  endDate: string
  status: 'draft' | 'calculated' | 'approved' | 'exported' | 'failed'
  totals: {
    gross: number
    tax: number
    super: number
    net: number
    totalHours: number
    employeeCount: number
  }
  notes?: string
  approvedBy?: string
  approvedAt?: string
  exportedAt?: string
  exportType?: string
  exportReference?: string
  exportedBy?: string
  jobError?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface PayItem {
  sourceShiftId: string
  type: string
  name: string
  exportName: string
  from: string
  to: string
  hours: number
  rate: number
  multiplier: number
  amount: number
  awardLevel: string
  baseRate: number
}

export interface PayRunDetailEmployee {
  employeeId: string
  employeeName: string
  totalHours: number
  totalAmount: number
  averageRate: number
  payItemCount: number
  payItems: PayItem[]
}

export interface PayRunDetailExport {
  _id: string
  exportSystem: string
  status: string
  exportedAt?: string
  rowCount: number
  retryCount: number
  errorLog?: string
  externalRef?: string
  createdAt?: string
  updatedAt?: string
}

export interface PayRunDetail {
  payRun: PayRun
  summary: {
    periodDays: number
    lineItemCount: number
    averageHourlyCost: number
    averageEmployeeCost: number
  }
  breakdown: {
    byType: Array<{
      type: string
      amount: number
      hours: number
      lineCount: number
    }>
  }
  employees: PayRunDetailEmployee[]
  exports: PayRunDetailExport[]
}

export interface PayRunJobStatusResponse {
  payRunStatus: PayRun['status'] | 'not_found' | 'unavailable'
  job?: {
    status?: string
    progress?: number | object
    result?: {
      success: boolean
      payRunId: string
      totalEmployees?: number
      totalShifts?: number
      totals?: PayRun['totals']
    }
  }
  jobError?: string
  totals?: PayRun['totals']
}

export interface CreatePayRunRequest {
  tenantId: string
  startDate: string
  endDate: string
  notes?: string
}

// List pay runs for a tenant
export async function getPayRuns(tenantId: string): Promise<{ payRuns: PayRun[] }> {
  return apiFetch<{ payRuns: PayRun[] }>(`${BASE_URL}?tenantId=${tenantId}`)
}

// Get detail for a pay run
export async function getPayRunDetail(payRunId: string): Promise<PayRunDetail> {
  return apiFetch<PayRunDetail>(`${BASE_URL}/${payRunId}`)
}

// Create a new pay run
export async function createPayRun(data: CreatePayRunRequest): Promise<{ payRun: PayRun }> {
  return apiFetch<{ payRun: PayRun }>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Kick off calculation job for a pay run
export async function calculatePayRun(payRunId: string): Promise<void> {
  return apiFetch<void>(`${BASE_URL}/${payRunId}/calculate`, { method: 'POST' })
}

// Poll pay run status while calculation is in progress
export async function getPayRunJobStatus(payRunId: string): Promise<PayRunJobStatusResponse> {
  return apiFetch<PayRunJobStatusResponse>(`${BASE_URL}/${payRunId}/status`)
}

// Approve a pay run
export async function approvePayRun(payRunId: string): Promise<void> {
  return apiFetch<void>(`${BASE_URL}/${payRunId}/approve`, { method: 'POST' })
}
