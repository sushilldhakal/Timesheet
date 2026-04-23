// Re-export scheduling/roster-related schema types (type-only) so managers
// never import from ../db/schemas/* directly.

export type { ISchedule } from "@/lib/db/schemas/schedule"

export type { IRoster, IShift } from "@/lib/db/schemas/roster"
export { getWeekBoundaries } from "@/lib/db/schemas/roster"

export type { IEmployeeDocument } from "@/lib/db/schemas/employee"
export type { IEmployeeTeamAssignment } from "@/lib/db/schemas/employee-team-assignment"
export type { ILocationRoleEnablement } from "@/lib/db/schemas/location-role-enablement"

export type { ComplianceRuleType, IComplianceBreakRule } from "@/lib/db/schemas/compliance-rule"

export type { IRosterTemplateDocument, ITemplateShift } from "@/lib/db/schemas/roster-template"

export type { IShiftSwapRequest, SwapStatus } from "@/lib/db/schemas/shift-swap-request"
export type { ILeaveRecord, LeaveType } from "@/lib/db/schemas/leave-record"

