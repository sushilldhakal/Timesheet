import { connectDB } from "@/lib/db"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { Employee } from "@/lib/db/schemas/employee"
import Award from "@/lib/db/schemas/award"
import { AwardEngine } from "@/lib/engines/award-engine"
import { 
  timesheetEntryToShiftContext, 
  payLinesToTandaFormat, 
  validateTimesheetEntry,
  type EmployeeContext 
} from "@/lib/utils/timesheet-to-shift-context"
import { checkPublicHoliday } from "@/lib/utils/public-holidays"
import { DailyTimesheetRow } from "@/lib/types/timesheet"
import { createApiRoute } from "@/lib/api/create-api-route"
import { formatTimeFromDate } from "@/lib/utils/format/time"
import { z } from "zod"
import { errorResponseSchema } from "@/lib/validations/auth"

const timesheetIdParamSchema = z.object({
  id: z.string().min(1, "Timesheet ID is required"),
})

const evaluateTimesheetResponseSchema = z.object({
  timesheetId: z.string(),
  employee: z.object({
    id: z.string(),
    name: z.string(),
    employmentType: z.string(),
    baseRate: z.number(),
    awardTags: z.array(z.string()),
  }),
  award: z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  shiftContext: z.object({
    employeeId: z.string(),
    employmentType: z.string(),
    baseRate: z.number(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    awardTags: z.array(z.string()),
    isPublicHoliday: z.boolean(),
    weeklyHoursWorked: z.number(),
    dailyHoursWorked: z.number(),
    breaks: z.array(z.object({
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      isPaid: z.boolean(),
    })),
  }),
  awardEngineResult: z.object({
    payLines: z.array(z.object({
      units: z.number(),
      from: z.string().datetime(),
      to: z.string().datetime(),
      name: z.string(),
      exportName: z.string(),
      ordinaryHours: z.number(),
      cost: z.number(),
      baseRate: z.number(),
      multiplier: z.number().optional(),
      ruleId: z.string().optional(),
    })),
    totalCost: z.number(),
    totalHours: z.number(),
    breakEntitlements: z.array(z.any()),
    leaveAccruals: z.array(z.any()),
  }),
  tandaComparison: z.array(z.object({
    units: z.number(),
    from: z.string(),
    to: z.string(),
    name: z.string(),
    exportName: z.string(),
    cost: z.number(),
    multiplier: z.number(),
  })),
})

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/timesheets/[id]/evaluate - Evaluate timesheet entry through AwardEngine */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/timesheets/{id}/evaluate',
  summary: 'Evaluate timesheet entry with AwardEngine',
  description: 'Process a timesheet entry through the AwardEngine and return results in Tanda-compatible format for comparison',
  tags: ['Timesheets', 'Awards'],
  security: 'adminAuth',
  request: {
    params: timesheetIdParamSchema,
  },
  responses: {
    200: evaluateTimesheetResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    if (!params) {
      return {
        status: 400,
        data: { error: "Timesheet ID is required" }
      };
    }

    const { id } = params;

    try {
      await connectDB()
      
      // Load the timesheet entry (DailyShift)
      const dailyShift = await DailyShift.findById(id).populate('employeeId')
      if (!dailyShift) {
        return {
          status: 404,
          data: { error: "Timesheet entry not found" }
        };
      }

      // Load the employee record
      const employee = await Employee.findById(dailyShift.employeeId)
      if (!employee) {
        return {
          status: 404,
          data: { error: "Employee not found for this timesheet entry" }
        };
      }

      // Load the applicable award
      if (!employee.awardId) {
        return {
          status: 400,
          data: { error: "Employee has no award assigned" }
        };
      }

      const award = await Award.findById(employee.awardId)
      if (!award) {
        return {
          status: 404,
          data: { error: "Award not found for this employee" }
        };
      }

      // Convert DailyShift to DailyTimesheetRow format
      const timesheetRow: DailyTimesheetRow = convertDailyShiftToTimesheetRow(dailyShift)
      
      // Validate the timesheet entry
      validateTimesheetEntry(timesheetRow)

      // Get employee context for shift processing
      const employeeContext: EmployeeContext = {
        id: employee._id.toString(),
        employmentType: employee.employmentType || 'casual',
        baseRate: await getEmployeeBaseRate(employee),
        awardTags: dailyShift.awardTags || []
      }

      // Calculate weekly hours worked so far (simplified - could be enhanced)
      const weeklyHoursWorked = await calculateWeeklyHours(employee._id.toString(), dailyShift.date)

      // Check if this date is a public holiday
      const isPublicHoliday = await checkPublicHoliday(dailyShift.date)

      // Convert to ShiftContext
      const shiftContext = timesheetEntryToShiftContext(
        timesheetRow,
        employeeContext,
        weeklyHoursWorked,
        isPublicHoliday
      )

      // Run through AwardEngine
      const engine = new AwardEngine(award)
      const awardEngineResult = engine.processShift(shiftContext)

      // Convert to Tanda-compatible format for comparison
      const tandaComparison = payLinesToTandaFormat(awardEngineResult.payLines)

      return {
        status: 200,
        data: {
          timesheetId: id,
          employee: {
            id: employee._id.toString(),
            name: employee.name,
            employmentType: employee.employmentType || 'casual',
            baseRate: employeeContext.baseRate,
            awardTags: employeeContext.awardTags,
          },
          award: {
            id: award._id.toString(),
            name: award.name,
            version: award.version,
          },
          shiftContext: {
            employeeId: shiftContext.employeeId,
            employmentType: shiftContext.employmentType,
            baseRate: shiftContext.baseRate,
            startTime: shiftContext.startTime.toISOString(),
            endTime: shiftContext.endTime.toISOString(),
            awardTags: shiftContext.awardTags,
            isPublicHoliday: shiftContext.isPublicHoliday,
            weeklyHoursWorked: shiftContext.weeklyHoursWorked,
            dailyHoursWorked: shiftContext.dailyHoursWorked,
            breaks: shiftContext.breaks.map(b => ({
              startTime: b.startTime.toISOString(),
              endTime: b.endTime.toISOString(),
              isPaid: b.isPaid,
            })),
          },
          awardEngineResult: {
            payLines: awardEngineResult.payLines.map(line => ({
              units: line.units,
              from: line.from.toISOString(),
              to: line.to.toISOString(),
              name: line.name,
              exportName: line.exportName,
              ordinaryHours: line.ordinaryHours,
              cost: line.cost,
              baseRate: line.baseRate,
              multiplier: line.multiplier,
              ruleId: line.ruleId,
            })),
            totalCost: awardEngineResult.totalCost,
            totalHours: awardEngineResult.totalHours,
            breakEntitlements: awardEngineResult.breakEntitlements,
            leaveAccruals: awardEngineResult.leaveAccruals,
          },
          tandaComparison,
        }
      };
    } catch (err) {
      console.error("[api/timesheets/[id]/evaluate GET]", err)
      return {
        status: 500,
        data: { error: `Failed to evaluate timesheet: ${err instanceof Error ? err.message : 'Unknown error'}` }
      };
    }
  }
});

/**
 * Convert DailyShift to DailyTimesheetRow format for processing
 */
function convertDailyShiftToTimesheetRow(dailyShift: any): DailyTimesheetRow {
  // Format date as YYYY-MM-DD
  const dateStr = dailyShift.date.toISOString().split('T')[0]
  
  // Format times as HH:MM
  const clockIn = dailyShift.clockIn?.time ? formatTimeFromDate(dailyShift.clockIn.time) : ''
  const clockOut = dailyShift.clockOut?.time ? formatTimeFromDate(dailyShift.clockOut.time) : ''
  const breakIn = dailyShift.breakIn?.time ? formatTimeFromDate(dailyShift.breakIn.time) : ''
  const breakOut = dailyShift.breakOut?.time ? formatTimeFromDate(dailyShift.breakOut.time) : ''
  
  // Calculate totals
  const totalMinutes = dailyShift.totalWorkingHours ? dailyShift.totalWorkingHours * 60 : 0
  const breakMinutes = dailyShift.totalBreakMinutes || 0
  
  return {
    date: dateStr,
    clockIn,
    clockOut,
    breakIn,
    breakOut,
    breakMinutes,
    breakHours: (breakMinutes / 60).toFixed(2),
    totalMinutes,
    totalHours: (totalMinutes / 60).toFixed(2),
    clockInImage: dailyShift.clockIn?.image,
    clockInWhere: dailyShift.clockIn?.deviceLocation,
    breakInImage: dailyShift.breakIn?.image,
    breakInWhere: dailyShift.breakIn?.deviceLocation,
    breakOutImage: dailyShift.breakOut?.image,
    breakOutWhere: dailyShift.breakOut?.deviceLocation,
    clockOutImage: dailyShift.clockOut?.image,
    clockOutWhere: dailyShift.clockOut?.deviceLocation,
  }
}

/**
 * Get employee's base hourly rate from their pay conditions, award level rates, or defaults
 */
async function getEmployeeBaseRate(employee: any): Promise<number> {
  // Check for current pay condition with overriding rate
  const currentPayCondition = employee.payConditions?.find((pc: any) => 
    pc.effectiveTo === null || pc.effectiveTo > new Date()
  )
  
  if (currentPayCondition?.overridingRate) {
    return currentPayCondition.overridingRate
  }
  
  // If employee has award and award level, look up the rate from the award's levelRates
  if (employee.awardId && employee.awardLevel) {
    try {
      const award = await Award.findById(employee.awardId)
      if (award && award.levelRates) {
        // Find current rate for this level and employment type
        const currentRate = award.levelRates.find((rate: any) => 
          rate.level === employee.awardLevel &&
          rate.employmentType === employee.employmentType &&
          rate.effectiveFrom <= new Date() &&
          (rate.effectiveTo === null || rate.effectiveTo > new Date())
        )
        
        if (currentRate) {
          return currentRate.hourlyRate
        }
      }
    } catch (error) {
      console.warn('Failed to lookup award rate:', error)
    }
  }
  
  // TODO: Add baseHourlyRate field to Employee schema for direct rate storage
  // For now, return employment type-based defaults
  // NOTE: These hardcoded rates should match the actual award document levelRates
  // or be replaced with a baseHourlyRate field on the Employee schema
  const defaultRates = {
    'casual': 25.0,
    'part_time': 23.0,
    'full_time': 22.0
  }
  
  return defaultRates[employee.employmentType as keyof typeof defaultRates] || 25.0
}

/**
 * DEPRECATED: Get base rate for an award level and employment type
 * This function is no longer used - rates should come from Award.levelRates
 * Keeping for reference only
 */
function getAwardLevelRate(awardLevel: string, employmentType: string): number {
  // DEPRECATED: This hardcoded lookup table should be replaced with
  // Award.levelRates from the database to prevent drift when rates change
  console.warn('getAwardLevelRate is deprecated - use Award.levelRates instead')
  
  const awardRates: Record<string, Record<string, number>> = {
    'level_1': {
      'casual': 23.50,
      'part_time': 21.50,
      'full_time': 20.50
    },
    'level_2': {
      'casual': 25.00,
      'part_time': 23.00,
      'full_time': 22.00
    },
    'level_3': {
      'casual': 27.50,
      'part_time': 25.50,
      'full_time': 24.50
    },
    'level_4': {
      'casual': 30.00,
      'part_time': 28.00,
      'full_time': 27.00
    }
  }
  
  return awardRates[awardLevel]?.[employmentType] || 0
}

/**
 * Calculate total hours worked this week before the given date
 */
async function calculateWeeklyHours(employeeId: string, shiftDate: Date): Promise<number> {
  // Get start of week (Monday)
  const startOfWeek = new Date(shiftDate)
  const dayOfWeek = startOfWeek.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday = 0, so 6 days back
  startOfWeek.setDate(startOfWeek.getDate() - daysToMonday)
  startOfWeek.setHours(0, 0, 0, 0)
  
  // Get shifts for this week before the current shift
  const weeklyShifts = await DailyShift.find({
    employeeId,
    date: {
      $gte: startOfWeek,
      $lt: shiftDate
    },
    status: { $ne: 'rejected' }
  })
  
  // Sum up the hours
  return weeklyShifts.reduce((total, shift) => {
    return total + (shift.totalWorkingHours || 0)
  }, 0)
}