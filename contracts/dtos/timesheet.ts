import type { EntityId } from "@/shared/types"

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected" | "locked"

export interface TimesheetDTO {
  id: EntityId
  employeeId: EntityId
  payPeriodStart: string
  payPeriodEnd: string
  shiftIds: EntityId[]
  totalShifts: number
  totalHours: number
  totalCost: number
  totalBreakMinutes: number
  status: TimesheetStatus
  submittedBy?: EntityId | null
  submittedAt?: string | null
  submissionNotes?: string
  approvedBy?: EntityId | null
  approvedAt?: string | null
  rejectionReason?: string
  rejectedAt?: string | null
  rejectedBy?: EntityId | null
  lockedBy?: EntityId | null
  lockedAt?: string | null
  payRunId?: EntityId | null
  notes?: string
  createdAt?: string
  updatedAt?: string
}

