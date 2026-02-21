/**
 * Authentication logging utility for security events
 * Logs authentication failures, device revocations, and other security-related events
 */

export type AuthLogEvent = 
  | "device_token_validation_failure"
  | "staff_session_validation_failure"
  | "device_revocation"
  | "device_disabled"
  | "device_registration_failure"

export interface AuthLogEntry {
  event: AuthLogEvent
  timestamp: string
  deviceId?: string
  employeeId?: string
  adminId?: string
  reason?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an authentication failure or security event
 */
export function logAuthEvent(entry: Omit<AuthLogEntry, "timestamp">): void {
  const logEntry: AuthLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  // In production, this would integrate with a proper logging service
  // For now, we use console with structured logging
  console.warn("[AUTH_EVENT]", JSON.stringify(logEntry))
}

/**
 * Log device token validation failure
 */
export function logDeviceTokenFailure(deviceId?: string, reason?: string): void {
  logAuthEvent({
    event: "device_token_validation_failure",
    deviceId,
    reason,
  })
}

/**
 * Log staff session validation failure
 */
export function logStaffSessionFailure(deviceId?: string, employeeId?: string, reason?: string): void {
  logAuthEvent({
    event: "staff_session_validation_failure",
    deviceId,
    employeeId,
    reason,
  })
}

/**
 * Log device revocation event
 */
export function logDeviceRevocation(deviceId: string, adminId: string, reason?: string): void {
  logAuthEvent({
    event: "device_revocation",
    deviceId,
    adminId,
    reason,
  })
}

/**
 * Log device disabled event
 */
export function logDeviceDisabled(deviceId: string, reason?: string): void {
  logAuthEvent({
    event: "device_disabled",
    deviceId,
    reason,
  })
}

/**
 * Log device registration failure
 */
export function logDeviceRegistrationFailure(reason?: string, metadata?: Record<string, unknown>): void {
  logAuthEvent({
    event: "device_registration_failure",
    reason,
    metadata,
  })
}
