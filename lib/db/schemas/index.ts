/**
 * Central export file for all database schemas
 * Enhanced Staff Scheduling System
 */

// Existing schemas
export * from "./employee"
export * from "./user"
export * from "./schedule"
export * from "./roster"
export * from "./roster-template"
export * from "./daily-shift"
export * from "./toil-balance"
export * from "./award"
export * from "./award-version-history"
export * from "./device"

// Core master-data schemas
export * from "./location"
export * from "./team"
export * from "./team-group"
export * from "./employer"

// New schemas for enhanced scheduling
export * from "./availability-constraint"
export * from "./leave-record"
export * from "./compliance-rule"
export * from "./shift-swap-request"
export * from "./audit-log"

// Location-scoped role system
export * from "./location-role-enablement"
export * from "./employee-role-assignment"

// OAuth 2 authentication
export * from "./oauth-token"

// Face recognition for buddy punch detection
export * from "./staff-face-profile"
export * from "./buddy-punch-alert"

// Payroll system
export * from "./pay-run"
export * from "./pay-item"
export * from "./public-holiday"

// Timesheet approval workflow
export * from "./timesheet"

// Employee payroll & compliance
export * from "./employee-tax-info"
export * from "./employee-bank-details"
export * from "./employee-contract"
export * from "./employee-qualification"
export * from "./employee-compliance"
export * from "./employee-self-audit-log"

// Tanda parity collections (schema layer)
export * from "./sales-target"
export * from "./location-sales-target"
export * from "./team-sales-target"
export * from "./timeclock-question"
export * from "./qualification"
export * from "./custom-event"
export * from "./custom-event-team"
export * from "./award-tag"
export * from "./award-template"

// Execution layer — Phase 1: Compliance Engine
export * from "./compliance-violation"

// Execution layer — Phase 2: Clock-in Validation
export * from "./clock-session"
export * from "./clock-audit"

// Execution layer — Phase 4: Payroll Export
export * from "./payroll-export"

// Execution layer — Phase 5: Break Rule Enforcement
export * from "./break-violation"

// Execution layer — Phase 6: Labour Cost Analysis
export * from "./labour-cost-analysis"

// Execution layer — Phase 7: Notifications
export * from "./notification"

// Execution layer — Phase 8: API Keys
export * from "./api-key"

// Execution layer — Phase 9: Multi-Award Assignment
export * from "./employee-award-assignment"

// Execution layer — Phase 10: Demand Forecasting
export * from "./demand-forecast"
export * from "./auto-roster-suggestion"

// Execution layer — Phase 11: Push Tokens
export * from "./push-token"

// Architecture hardening — event system + audit
export * from "./domain-event-log"
export * from "./shift-event-log"

// Architecture hardening — notification preferences
export * from "./notification-preference"
