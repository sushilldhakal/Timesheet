// Re-export types from API layer for centralized access
export type { LeaveRecord, AffectedShift, GetAbsencesParams, CreateAbsenceRequest, ApproveAbsenceRequest, DenyAbsenceRequest, ApproveAbsenceResponse } from '@/lib/api/absences'

// Import for type alias
import type { LeaveRecord } from '@/lib/api/absences'

// Type alias for backward compatibility
export type LeaveRecordLike = LeaveRecord
