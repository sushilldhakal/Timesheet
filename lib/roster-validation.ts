import { ICategory } from "@/lib/db/schemas/category"
import { IEmployee } from "@/lib/db/schemas/employee"
import { IShift } from "@/lib/db/schemas/roster"
import { IEmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"

export interface ValidationError {
  type: "error" | "warning"
  message: string
  code: string
}

export interface ShiftValidationResult {
  shiftId?: string
  employeeId?: string
  errors: ValidationError[]
  isValid: boolean
}

export interface RosterValidationResult {
  shifts: ShiftValidationResult[]
  employeeHours: Record<string, number>
  canPublish: boolean
  summary: {
    totalErrors: number
    totalWarnings: number
    understaffedShifts: number
  }
}

/**
 * Format time from Date object to HH:MM string
 */
export function formatTime(date: Date | string): string {
  if (typeof date === "string") {
    const [hours, minutes] = date.split(":").slice(0, 2)
    return `${hours}:${minutes}`
  }
  const d = new Date(date)
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}

/**
 * Extract hour and minute from Date or string
 */
export function getTimeComponents(time: Date | string): { hours: number; minutes: number } {
  if (typeof time === "string") {
    const [h, m] = time.split(":").map(Number)
    return { hours: h, minutes: m }
  }
  const d = new Date(time)
  return { hours: d.getHours(), minutes: d.getMinutes() }
}

/**
 * Calculate shift duration in hours
 */
export function calculateShiftDuration(startTime: Date | string, endTime: Date | string): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

/**
 * Check if employee is assigned to role+location at given date
 */
export function isEmployeeAssignedToRoleLocation(
  employee: IEmployee,
  roleAssignments: IEmployeeRoleAssignment[],
  roleId: string,
  locationId: string,
  shiftDate: Date
): { assigned: boolean; reason?: string } {
  const assignment = roleAssignments.find((ra) => {
    const roleMatch = ra.roleId.toString() === roleId
    const locationMatch = ra.locationId.toString() === locationId
    const dateMatch = ra.validFrom <= shiftDate && (!ra.validTo || ra.validTo >= shiftDate)

    return roleMatch && locationMatch && dateMatch
  })

  if (!assignment) {
    return {
      assigned: false,
      reason: `Employee not assigned to role at this location on ${shiftDate.toDateString()}`,
    }
  }

  return { assigned: true }
}

/**
 * Check if shift time is within location operating hours
 */
export function isShiftWithinLocationHours(
  startTime: Date | string,
  endTime: Date | string,
  location: ICategory
): { valid: boolean; reason?: string } {
  if (location.openingHour === undefined || location.closingHour === undefined) {
    return { valid: true } // No constraints defined
  }

  const { hours: startHour, minutes: startMinutes } = getTimeComponents(startTime)
  const { hours: endHour, minutes: endMinutes } = getTimeComponents(endTime)
  const startDecimal = startHour + startMinutes / 60
  const endDecimal = endHour + endMinutes / 60

  if (startDecimal < location.openingHour) {
    return {
      valid: false,
      reason: `Shift starts at ${formatTime(startTime)} (before location opening at ${location.openingHour}:00)`,
    }
  }

  if (endDecimal > location.closingHour) {
    return {
      valid: false,
      reason: `Shift ends at ${formatTime(endTime)} (after location closing at ${location.closingHour}:00)`,
    }
  }

  return { valid: true }
}

/**
 * Check if shift time is within role's working hours
 */
export function isShiftWithinRoleHours(
  startTime: Date | string,
  endTime: Date | string,
  role: ICategory
): { valid: boolean; reason?: string } {
  // Role's working hours come from defaultScheduleTemplate
  const template = role.defaultScheduleTemplate
  if (!template?.shiftPattern?.startHour || !template?.shiftPattern?.endHour) {
    return { valid: true } // No constraints
  }

  const { hours: startHour, minutes: startMinutes } = getTimeComponents(startTime)
  const { hours: endHour, minutes: endMinutes } = getTimeComponents(endTime)
  const startDecimal = startHour + startMinutes / 60
  const endDecimal = endHour + endMinutes / 60

  const roleStart = template.shiftPattern.startHour
  const roleEnd = template.shiftPattern.endHour

  if (startDecimal < roleStart) {
    return {
      valid: false,
      reason: `Shift starts at ${formatTime(startTime)} (before role's working hours at ${roleStart}:00)`,
    }
  }

  if (endDecimal > roleEnd) {
    return {
      valid: false,
      reason: `Shift ends at ${formatTime(endTime)} (after role's working hours end at ${roleEnd}:00)`,
    }
  }

  return { valid: true }
}

/**
 * Check if employee is not overworked in the week
 */
export function checkEmployeeHoursPerWeek(
  employeeId: string,
  newShiftDuration: number,
  employee: IEmployee,
  weeklyHours: Record<string, number>
): { valid: boolean; warning?: string; totalHours?: number } {
  if (!employee.standardHoursPerWeek) {
    return { valid: true } // No target defined
  }

  const currentHours = weeklyHours[employeeId] || 0
  const totalHours = currentHours + newShiftDuration

  if (totalHours > employee.standardHoursPerWeek * 1.1) {
    // Allow 10% buffer, but warn
    return {
      valid: false,
      warning: `Employee will work ${totalHours.toFixed(1)} hours (target: ${employee.standardHoursPerWeek}, max: ${(employee.standardHoursPerWeek * 1.1).toFixed(1)})`,
      totalHours,
    }
  }

  if (totalHours > employee.standardHoursPerWeek) {
    return {
      valid: true,
      warning: `Employee will work ${totalHours.toFixed(1)} hours (target: ${employee.standardHoursPerWeek})`,
      totalHours,
    }
  }

  return { valid: true, totalHours }
}

/**
 * Validate a single shift
 */
export function validateShift(
  shift: IShift,
  employee: IEmployee,
  roleAssignments: IEmployeeRoleAssignment[],
  location: ICategory,
  role: ICategory,
  weeklyHours: Record<string, number>
): ShiftValidationResult {
  const errors: ValidationError[] = []

  if (!shift.employeeId) {
    return { errors: [], isValid: true } // Empty slot is fine
  }

  const employeeIdStr = shift.employeeId.toString()

  // Check 1: Employee assigned to role+location
  if (shift.employeeId) {
    const assignmentCheck = isEmployeeAssignedToRoleLocation(
      employee,
      roleAssignments,
      shift.roleId.toString(),
      shift.locationId.toString(),
      shift.date
    )
    if (!assignmentCheck.assigned) {
      errors.push({
        type: "error",
        message: assignmentCheck.reason || "Employee not assigned",
        code: "EMPLOYEE_NOT_ASSIGNED",
      })
    }
  }

  // Check 2: Shift within location hours
  const locationCheck = isShiftWithinLocationHours(shift.startTime, shift.endTime, location)
  if (!locationCheck.valid) {
    errors.push({
      type: "error",
      message: locationCheck.reason || "Shift outside location hours",
      code: "OUTSIDE_LOCATION_HOURS",
    })
  }

  // Check 3: Shift within role hours
  const roleCheck = isShiftWithinRoleHours(shift.startTime, shift.endTime, role)
  if (!roleCheck.valid) {
    errors.push({
      type: "error",
      message: roleCheck.reason || "Shift outside role hours",
      code: "OUTSIDE_ROLE_HOURS",
    })
  }

  // Check 4: Employee hours per week
  const duration = calculateShiftDuration(shift.startTime, shift.endTime)
  const hoursCheck = checkEmployeeHoursPerWeek(employeeIdStr, duration, employee, weeklyHours)
  if (!hoursCheck.valid && hoursCheck.warning) {
    errors.push({
      type: "error",
      message: hoursCheck.warning,
      code: "EXCEEDS_WEEKLY_HOURS",
    })
  } else if (hoursCheck.warning) {
    errors.push({
      type: "warning",
      message: hoursCheck.warning,
      code: "EXCEEDS_WEEKLY_TARGET",
    })
  }

  // Check 5: Start time < end time
  if (new Date(shift.startTime) >= new Date(shift.endTime)) {
    errors.push({
      type: "error",
      message: "Start time must be before end time",
      code: "INVALID_TIME_RANGE",
    })
  }

  return {
    shiftId: shift._id?.toString(),
    employeeId: shift.employeeId?.toString(),
    errors,
    isValid: errors.every((e) => e.type !== "error"),
  }
}

/**
 * Validate entire roster
 */
export function validateRoster(
  shifts: IShift[],
  employees: Map<string, IEmployee>,
  roleAssignments: IEmployeeRoleAssignment[],
  locations: Map<string, ICategory>,
  roles: Map<string, ICategory>
): RosterValidationResult {
  const validationResults: ShiftValidationResult[] = []
  const employeeHours: Record<string, number> = {}

  // First pass: Calculate employee hours
  shifts.forEach((shift) => {
    if (shift.employeeId) {
      const employeeIdStr = shift.employeeId.toString()
      const duration = calculateShiftDuration(shift.startTime, shift.endTime)
      employeeHours[employeeIdStr] = (employeeHours[employeeIdStr] || 0) + duration
    }
  })

  // Second pass: Validate each shift
  shifts.forEach((shift) => {
    const employee = employees.get(shift.employeeId?.toString() || "")
    const location = locations.get(shift.locationId.toString())
    const role = roles.get(shift.roleId.toString())

    if (!employee || !location || !role) {
      validationResults.push({
        shiftId: shift._id?.toString(),
        errors: [
          {
            type: "error",
            message: "Missing employee, location, or role reference",
            code: "MISSING_REFERENCE",
          },
        ],
        isValid: false,
      })
      return
    }

    const result = validateShift(shift, employee, roleAssignments, location, role, employeeHours)
    validationResults.push(result)
  })

  // Summary
  const totalErrors = validationResults.reduce((acc, r) => acc + r.errors.filter((e) => e.type === "error").length, 0)
  const totalWarnings = validationResults.reduce((acc, r) => acc + r.errors.filter((e) => e.type === "warning").length, 0)
  const canPublish = totalErrors === 0

  return {
    shifts: validationResults,
    employeeHours,
    canPublish,
    summary: {
      totalErrors,
      totalWarnings,
      understaffedShifts: shifts.filter((s) => s.isUnderstaffed).length,
    },
  }
}
