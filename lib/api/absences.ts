import { apiFetch } from './fetch-client'

export interface LeaveRecord {
  _id?: string
  id?: string
  employeeId?: string
  employeeName?: string
  employeePin?: string
  startDate?: string
  endDate?: string
  leaveType?: string
  status?: string
  notes?: string
  approvedBy?: string
  approvedAt?: string
  deniedBy?: string
  deniedAt?: string
  denialReason?: string
  createdAt?: string
  updatedAt?: string
}

export interface AffectedShift {
  shiftId: string
  date: string
  startTime: string
  endTime: string
}

export interface GetAbsencesParams {
  startDate: string
  endDate: string
  employeeIds?: string[]
}

export interface CreateAbsenceRequest {
  startDate: string
  endDate: string
  leaveType: string
  notes?: string
}

export interface ApproveAbsenceRequest {
  approverId: string
}

export interface DenyAbsenceRequest {
  denierId: string
  reason: string
}

export interface ApproveAbsenceResponse {
  leaveRecord?: LeaveRecord
  affectedShifts?: AffectedShift[]
}

// List leave records within a date range
export async function getAbsences(params: GetAbsencesParams): Promise<{ absences: LeaveRecord[] }> {
  const sp = new URLSearchParams()
  sp.set('startDate', params.startDate)
  sp.set('endDate', params.endDate)
  for (const id of params.employeeIds ?? []) {
    sp.append('employeeId', id)
  }
  return apiFetch<{ absences: LeaveRecord[] }>(`/api/absences?${sp.toString()}`, {
    credentials: 'include',
  })
}

// Approve a leave record
export async function approveAbsence(
  absenceId: string,
  data: ApproveAbsenceRequest
): Promise<ApproveAbsenceResponse> {
  return apiFetch<ApproveAbsenceResponse>(`/api/absences/${absenceId}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}

// Deny a leave record
export async function denyAbsence(
  absenceId: string,
  data: DenyAbsenceRequest
): Promise<{ leaveRecord?: LeaveRecord }> {
  return apiFetch<{ leaveRecord?: LeaveRecord }>(`/api/absences/${absenceId}/deny`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}

// Create a leave request for an employee
export async function createEmployeeAbsence(
  employeeId: string,
  data: CreateAbsenceRequest
): Promise<{ leaveRecord: LeaveRecord }> {
  return apiFetch<{ leaveRecord: LeaveRecord }>(`/api/employees/${employeeId}/absences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}

// Get leave records for a specific employee
export async function getEmployeeAbsences(employeeId: string): Promise<{ absences: LeaveRecord[] }> {
  return apiFetch<{ absences: LeaveRecord[] }>(`/api/employees/${employeeId}/absences`, {
    credentials: 'include',
  })
}
