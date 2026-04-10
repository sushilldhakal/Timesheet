import { EmployeeRoleAssignment, LocationRoleEnablement, DailyShift, Employee } from '@/lib/db'
import { parseTimeToHour24 } from '@/lib/utils/format/time'
import mongoose from 'mongoose'

const { ObjectId } = mongoose.Types

function processClockEvent(
  event: any,
  breakdown: Record<string, any>,
  type: string
) {
  if (!event?.time) return
  
  const hour = parseTimeToHour24(event.time)
  if (hour !== null && hour >= 6 && hour <= 20) {
    const key = `${hour.toString().padStart(2, '0')}:00`
    if (breakdown[key]) {
      breakdown[key][type] += 1
    }
  }
}

/**
 * Gets active role assignments for given filters
 */
export async function getActiveRoleAssignments(filters: {
  locationId?: string
  roleId?: string
  employeeIds?: string[]
  effectiveDate?: Date
}) {
  const query: any = {}
  
  if (filters.locationId) {
    query.locationId = new ObjectId(filters.locationId)
  }
  
  if (filters.roleId) {
    query.roleId = new ObjectId(filters.roleId)
  }
  
  if (filters.employeeIds) {
    query.employeeId = { 
      $in: filters.employeeIds.map(id => new ObjectId(id)) 
    }
  }
  
  // Time-bound filtering
  const effectiveDate = filters.effectiveDate || new Date()
  query.validFrom = { $lte: effectiveDate }
  query.$or = [
    { validTo: null },
    { validTo: { $gte: effectiveDate } }
  ]
  
  return await EmployeeRoleAssignment.find(query)
    .populate('employeeId roleId locationId')
    .lean()
}

/**
 * Gets enabled location-role pairs
 */
export async function getEnabledLocationRolePairs(filters: {
  locationId?: string
  roleId?: string
  effectiveDate?: Date
}) {
  const query: any = {}
  
  if (filters.locationId) {
    query.locationId = new ObjectId(filters.locationId)
  }
  
  if (filters.roleId) {
    query.roleId = new ObjectId(filters.roleId)
  }
  
  // Time-bound filtering
  const effectiveDate = filters.effectiveDate || new Date()
  query.effectiveFrom = { $lte: effectiveDate }
  query.$or = [
    { effectiveTo: null },
    { effectiveTo: { $gte: effectiveDate } }
  ]
  
  return await LocationRoleEnablement.find(query).lean()
}

/**
 * Aggregates shift data for employees
 */
export async function aggregateShiftData(
  employeePins: string[],
  startDate: Date,
  endDate: Date
) {
  const shifts = await DailyShift.find({
    pin: { $in: employeePins },
    date: { $gte: startDate, $lte: endDate }
  }).lean()
  
  // Calculate totals
  let totalHours = 0
  const activePins = new Set<string>()
  const hourlyBreakdown: Record<string, {
    clockIn: number
    breakIn: number
    breakOut: number
    clockOut: number
  }> = {}
  
  // Initialize hourly breakdown (6 AM to 8 PM)
  for (let h = 6; h <= 20; h++) {
    const key = `${h.toString().padStart(2, '0')}:00`
    hourlyBreakdown[key] = { clockIn: 0, breakIn: 0, breakOut: 0, clockOut: 0 }
  }
  
  for (const shift of shifts) {
    if (shift.clockIn) {
      activePins.add(shift.pin)
    }
    
    if (shift.totalWorkingHours) {
      totalHours += shift.totalWorkingHours
    }
    
    // Process clock events for timeline
    processClockEvent(shift.clockIn, hourlyBreakdown, 'clockIn')
    processClockEvent(shift.breakIn, hourlyBreakdown, 'breakIn')
    processClockEvent(shift.breakOut, hourlyBreakdown, 'breakOut')
    processClockEvent(shift.clockOut, hourlyBreakdown, 'clockOut')
  }
  
  return {
    totalHours: Math.round(totalHours),
    activeEmployees: activePins.size,
    dailyTimeline: Object.entries(hourlyBreakdown)
      .map(([hour, counts]) => ({ hour, ...counts }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
  }
}

/**
 * Gets all active roles for employees with hours breakdown
 */
export async function getEmployeeRolesWithHours(
  employeeIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Map<string, Array<{ roleId: string; roleName: string; hours: number }>>> {
  // Get all active assignments for these employees
  const assignments = await EmployeeRoleAssignment.find({
    employeeId: { $in: employeeIds.map(id => new ObjectId(id)) },
    isActive: true
  }).populate('roleId').lean()
  
  // Get shift data
  const employees = await Employee.find({
    _id: { $in: employeeIds.map(id => new ObjectId(id)) }
  }).select('_id pin').lean()
  
  const pinToId = new Map(employees.map(e => [e.pin, String(e._id)]))
  
  const shifts = await DailyShift.find({
    pin: { $in: employees.map(e => e.pin) },
    date: { $gte: startDate, $lte: endDate }
  }).lean()
  
  // Calculate hours per employee
  const employeeHours = new Map<string, number>()
  for (const shift of shifts) {
    const empId = pinToId.get(shift.pin)
    if (empId && shift.totalWorkingHours) {
      employeeHours.set(
        empId,
        (employeeHours.get(empId) || 0) + shift.totalWorkingHours
      )
    }
  }
  
  // Build result map
  const result = new Map<string, Array<{ roleId: string; roleName: string; hours: number }>>()
  
  for (const assignment of assignments) {
    const empId = String(assignment.employeeId)
    const roleId = String((assignment.roleId as any)._id)
    const roleName = (assignment.roleId as any).name
    const hours = employeeHours.get(empId) || 0
    
    if (!result.has(empId)) {
      result.set(empId, [])
    }
    
    result.get(empId)!.push({ roleId, roleName, hours })
  }
  
  return result
}
