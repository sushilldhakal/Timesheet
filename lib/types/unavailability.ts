// Re-export types from API layer for centralized access
export type { AvailabilityConstraint, AvailabilityConstraintsResponse } from '@/lib/api/availability'

// Domain type for availability constraints (alias for AvailabilityConstraint)
export interface AvailabilityConstraintLike {
  _id?: string
  id?: string
  employeeId?: string
  unavailableDays?: number[]
  unavailableTimeRanges?: Array<{ start: string; end: string }>
  preferredShiftTypes?: string[]
  maxConsecutiveDays?: number | null
  minRestHours?: number | null
  temporaryStartDate?: string | null
  temporaryEndDate?: string | null
  reason?: string
  createdAt?: string
  updatedAt?: string
}
