/**
 * Employee Field Guard
 * 
 * Protects sensitive employee fields from unauthorized modification
 * when employees call PATCH endpoints directly.
 */

const EMPLOYEE_LOCKED_FIELDS = [
  'legalFirstName',
  'legalLastName',
  'legalMiddleNames',
  'nationality',
  'certifications',
  'awardId',
  'awardLevel',
  'employmentType',
  'standardHoursPerWeek',
  'isActive',
  'isProbationary',
  'probationEndDate',
  'terminatedAt',
  'terminationReason',
  'onboardingCompleted',
  'onboardingCompletedAt',
  'onboardingStatus',
  'taxInfoId',
  'bankDetailsId',
  'contractId',
  'certifications',
  'tenantId',
  'pin',
  'employer',
  'location',
  'locationIds',
  'employerIds',
  'primaryLocationId',
  'employerId',
  'payConditions',
  'schedules',
  'password',
  'passwordSetByAdmin',
  'requirePasswordChange',
  'passwordChangedAt',
  'passwordSetupToken',
  'passwordSetupExpiry',
  'passwordResetToken',
  'passwordResetExpiry',
] as const

/**
 * Strip locked fields from request body when employee auth is detected
 * @param body - Request body object
 * @returns Sanitized body with locked fields removed
 */
export function stripLockedFieldsForEmployee(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...body }
  for (const field of EMPLOYEE_LOCKED_FIELDS) {
    delete sanitized[field]
  }
  return sanitized
}

/**
 * Check if a field is locked for employee modification
 * @param fieldName - Field name to check
 * @returns True if field is locked
 */
export function isFieldLockedForEmployee(fieldName: string): boolean {
  return EMPLOYEE_LOCKED_FIELDS.includes(fieldName as any)
}
