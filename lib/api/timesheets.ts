import { apiFetch } from './fetch-client'

// Types
export interface TimesheetRow {
  _id: string
  tenantId: string
  employeeId: {
    _id: string
    name: string
    pin: string
    email?: string
  } | string
  payPeriodStart: string
  payPeriodEnd: string
  shiftIds: string[]
  totalShifts: number
  totalHours: number
  totalCost: number
  totalBreakMinutes: number
  status: "draft" | "submitted" | "approved" | "rejected" | "locked"
  submittedBy?: { email: string } | null
  submittedAt?: string | null
  submissionNotes?: string
  approvedBy?: { email: string } | null
  approvedAt?: string | null
  rejectedBy?: { email: string } | null
  rejectedAt?: string | null
  rejectionReason?: string
  lockedBy?: { email: string } | null
  lockedAt?: string | null
  payRunId?: string | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ShiftDetail {
  _id: string
  date: string
  clockIn?: { time: string; deviceLocation?: string }
  clockOut?: { time: string; deviceLocation?: string }
  totalWorkingHours?: number
  totalBreakMinutes?: number
  status: string
  computed?: {
    totalCost: number
    totalHours: number
    payLines?: Array<{
      name: string
      exportName: string
      units: number
      cost: number
      multiplier?: number
    }>
  }
  awardTags?: string[]
}

export interface TimesheetDetail extends TimesheetRow {
  shifts: ShiftDetail[]
}

export interface TimesheetApprovalsParams {
  tenantId: string
  status?: string
}

export interface CreateTimesheetParams {
  tenantId: string
  employeeId: string
  payPeriodStart: string
  payPeriodEnd: string
}

export interface TimesheetActionParams {
  submissionNotes?: string
  rejectionReason?: string
  payRunId?: string
}

// Get timesheet approvals list
export async function getTimesheetApprovals(params: TimesheetApprovalsParams): Promise<{ timesheets: TimesheetRow[] }> {
  const searchParams = new URLSearchParams({ tenantId: params.tenantId })
  if (params.status) {
    searchParams.set('status', params.status)
  }
  
  const response = await apiFetch<{ data?: { timesheets: TimesheetRow[] }; timesheets?: TimesheetRow[] }>(
    `/api/timesheets/approvals?${searchParams}`
  )
  
  return {
    timesheets: response.data?.timesheets || response.timesheets || []
  }
}

// Get single timesheet detail
export async function getTimesheet(timesheetId: string): Promise<{ timesheet: TimesheetDetail }> {
  const response = await apiFetch<{ data?: { timesheet: TimesheetDetail }; timesheet?: TimesheetDetail }>(
    `/api/timesheets/${timesheetId}`
  )
  
  return {
    timesheet: response.data?.timesheet || response.timesheet!
  }
}

// Create timesheet
export async function createTimesheet(params: CreateTimesheetParams): Promise<{ timesheet: TimesheetRow }> {
  return apiFetch<{ timesheet: TimesheetRow }>('/api/timesheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

// Submit timesheet
export async function submitTimesheet(timesheetId: string, params?: TimesheetActionParams): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/timesheets/${timesheetId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  })
}

// Approve timesheet
export async function approveTimesheet(timesheetId: string, params?: TimesheetActionParams): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/timesheets/${timesheetId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  })
}

// Reject timesheet
export async function rejectTimesheet(timesheetId: string, params: TimesheetActionParams): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/timesheets/${timesheetId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

// Lock timesheet
export async function lockTimesheet(timesheetId: string, params: TimesheetActionParams): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/timesheets/${timesheetId}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}
