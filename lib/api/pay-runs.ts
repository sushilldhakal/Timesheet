import { apiFetch } from './fetch-client'

const BASE_URL = '/api/pay-runs'

export interface PayRun {
  _id: string
  tenantId: string
  startDate: string
  endDate: string
  status: 'draft' | 'calculated' | 'approved' | 'exported'
  totals: {
    gross: number
    tax: number
    super: number
    net: number
    totalHours: number
    employeeCount: number
  }
  notes?: string
  exportedAt?: string
  exportType?: string
  exportReference?: string
  createdAt: string
  updatedAt: string
}

export interface PayItem {
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

export interface PayRunExport {
  payRun: PayRun
  employees: Array<{
    employeeId: string
    employeeName: string
    totalHours: number
    totalAmount: number
    payItems: PayItem[]
  }>
}

export interface JobStatus {
  status: string
  progress?: number
  result?: {
    success: boolean
    payRunId: string
    totalEmployees: number
    totalShifts: number
    totals: PayRun['totals']
  }
  error?: string
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

// Get export detail for a pay run
export async function getPayRunExport(payRunId: string): Promise<{ data: PayRunExport }> {
  return apiFetch<{ data: PayRunExport }>(`${BASE_URL}/${payRunId}/export`)
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

// Poll job status for a pay run calculation
export async function getPayRunJobStatus(payRunId: string): Promise<JobStatus> {
  return apiFetch<JobStatus>(`${BASE_URL}/${payRunId}/status`)
}

// Approve a pay run
export async function approvePayRun(payRunId: string): Promise<void> {
  return apiFetch<void>(`${BASE_URL}/${payRunId}/approve`, { method: 'POST' })
}
