import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { connectDB } from "@/lib/db"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { PayItem } from "@/lib/db/schemas/pay-item"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { Employee } from "@/lib/db/schemas/employee"
import Award from "@/lib/db/schemas/award"
import { AwardEngine } from "@/lib/engines/award-engine"
import { timesheetEntryToShiftContext } from "@/lib/utils/timesheet-to-shift-context"
import { checkPublicHoliday } from "@/lib/utils/public-holidays"
import { PayRunJobData } from '../queue'

export type PayRunJobResult = {
  success: boolean
  payRunId: string
  totals: {
    gross: number
    tax: number
    super: number
    net: number
    totalHours: number
    employeeCount: number
  }
}

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// Helper function to format time for timesheet row
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5) // HH:MM format
}

// Helper function to format hours from minutes
function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}:${mins.toString().padStart(2, '0')}`
}

// Main pay run calculation processor
async function processPayRunCalculation(job: Job<PayRunJobData>): Promise<PayRunJobResult> {
  const { payRunId, tenantId, startDate, endDate } = job.data
  
  try {
    await connectDB()

    // Update job progress
    await job.updateProgress(10)

    const payRun = await PayRun.findById(payRunId)
    if (!payRun) {
      throw new Error("Pay run not found")
    }

    if (payRun.status !== 'draft') {
      throw new Error("Pay run must be in draft status to calculate")
    }

    // Update job progress
    await job.updateProgress(20)

    // Find all completed shifts in the date range for this tenant
    const shifts = await DailyShift.find({
      employerId: tenantId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      clockOut: { $exists: true }, // Only completed shifts
      status: { $in: ['completed', 'approved'] } // Only finalized shifts
    }).populate('employeeId')

    if (shifts.length === 0) {
      throw new Error("No completed shifts found in the pay run date range")
    }

    // Update job progress
    await job.updateProgress(30)

    // Clear existing pay items for this pay run
    await PayItem.deleteMany({ payRunId: payRun._id })

    let totalGross = 0
    let totalHours = 0
    const processedEmployees = new Set<string>()
    let processedShifts = 0

    // Process shifts in batches to avoid memory issues
    const batchSize = 50
    const totalShiftsCount = shifts.length

    for (let i = 0; i < shifts.length; i += batchSize) {
      const batch = shifts.slice(i, i + batchSize)
      
      // Update progress based on batch processing
      const progressPercent = 30 + Math.floor((i / totalShiftsCount) * 60)
      await job.updateProgress(progressPercent)

      for (const shift of batch) {
        try {
          const employee = shift.employeeId as any
          if (!employee || !employee.awardId) {
            console.warn(`Skipping shift ${shift._id}: No employee or award found`)
            continue
          }

          // Load the employee's award
          const award = await Award.findById(employee.awardId)
          if (!award) {
            console.warn(`Skipping shift ${shift._id}: Award ${employee.awardId} not found`)
            continue
          }

          // Get the employee's current award level and rate
          const currentRate = award.levelRates.find((rate: any) => 
            rate.level === employee.awardLevel &&
            rate.employmentType === employee.employmentType &&
            (!rate.effectiveTo || rate.effectiveTo >= shift.date)
          )

          if (!currentRate) {
            console.warn(`Skipping shift ${shift._id}: No current rate found for employee`)
            continue
          }

          // Check if this date is a public holiday
          const isPublicHoliday = await checkPublicHoliday(shift.date, employee.state)

          // Convert shift to timesheet format for processing
          const timesheetRow = {
            date: shift.date.toISOString().split('T')[0],
            clockIn: shift.clockIn?.time ? formatTime(shift.clockIn.time) : '',
            clockOut: shift.clockOut?.time ? formatTime(shift.clockOut.time) : '',
            breakIn: shift.breakIn?.time ? formatTime(shift.breakIn.time) : '',
            breakOut: shift.breakOut?.time ? formatTime(shift.breakOut.time) : '',
            breakMinutes: shift.totalBreakMinutes || 0,
            breakHours: formatHours(shift.totalBreakMinutes || 0),
            totalMinutes: shift.totalWorkingHours ? shift.totalWorkingHours * 60 : 0,
            totalHours: formatHours(shift.totalWorkingHours ? shift.totalWorkingHours * 60 : 0)
          }

          // Create shift context
          const shiftContext = timesheetEntryToShiftContext(
            timesheetRow,
            {
              id: employee._id.toString(),
              employmentType: employee.employmentType,
              baseRate: currentRate.hourlyRate,
              awardTags: shift.awardTags || []
            },
            0, // TODO: Calculate weekly hours worked so far
            isPublicHoliday
          )

          // Process shift through award engine
          const awardEngine = new AwardEngine(award)
          const result = awardEngine.processShift(shiftContext)

          // Create pay items from the result
          for (const payLine of result.payLines) {
            // Determine pay item type based on the pay line
            let payItemType: 'ordinary' | 'overtime' | 'penalty' | 'allowance' | 'leave' | 'public_holiday' = 'ordinary'
            
            if (payLine.name.toLowerCase().includes('overtime')) {
              payItemType = 'overtime'
            } else if (payLine.multiplier && payLine.multiplier > 1) {
              payItemType = 'penalty'
            } else if (isPublicHoliday) {
              payItemType = 'public_holiday'
            } else if (payLine.name.toLowerCase().includes('allowance')) {
              payItemType = 'allowance'
            } else if (payLine.name.toLowerCase().includes('leave')) {
              payItemType = 'leave'
            }

            await PayItem.create({
              payRunId: payRun._id,
              employeeId: employee._id,
              sourceShiftId: shift._id,
              type: payItemType,
              name: payLine.name,
              exportName: payLine.exportName,
              from: payLine.from,
              to: payLine.to,
              hours: payLine.units,
              rate: payLine.baseRate,
              multiplier: payLine.multiplier || 1,
              amount: payLine.cost,
              awardId: award._id,
              awardLevel: employee.awardLevel,
              baseRate: currentRate.hourlyRate
            })

            totalGross += payLine.cost
            totalHours += payLine.units
          }

          // Update shift with pay snapshot
          await DailyShift.findByIdAndUpdate(shift._id, {
            paySnapshot: {
              awardId: award._id,
              awardLevel: employee.awardLevel,
              baseRate: currentRate.hourlyRate,
              calculatedAt: new Date(),
              payRunId: payRun._id
            }
          })

          processedEmployees.add(employee._id.toString())
          processedShifts++

        } catch (shiftError) {
          console.error(`Error processing shift ${shift._id}:`, shiftError)
          // Continue processing other shifts
        }
      }
    }

    // Update job progress
    await job.updateProgress(90)

    // Calculate totals (simplified - no tax/super calculation yet)
    const totals = {
      gross: totalGross,
      tax: 0, // TODO: Implement tax calculation
      super: totalGross * 0.11, // 11% superannuation (simplified)
      net: totalGross, // TODO: Implement net calculation (gross - tax)
      totalHours,
      employeeCount: processedEmployees.size
    }

    // Update pay run with totals and status
    await PayRun.findByIdAndUpdate(payRunId, {
      status: 'calculated',
      totals,
      jobError: undefined,
    })

    // Update job progress to complete
    await job.updateProgress(100)

    return {
      success: true,
      payRunId,
      totals
    }

  } catch (error) {
    console.error(`Pay run calculation failed for ${payRunId}:`, error)
    
    // Update pay run status to indicate failure
    try {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      await PayRun.findByIdAndUpdate(payRunId, {
        status: 'failed',
        jobError: msg,
      })
    } catch (updateError) {
      console.error('Failed to update pay run status after error:', updateError)
    }

    throw error
  }
}

// Create and start the worker
export function createPayRunWorker() {
  const worker = new Worker('pay-run-calculations', processPayRunCalculation, {
    connection: redis,
    concurrency: parseInt(process.env.PAYRUN_WORKER_CONCURRENCY || '2'), // Process 2 pay runs concurrently
    maxStalledCount: 1, // Retry stalled jobs once
    stalledInterval: 30 * 1000, // Check for stalled jobs every 30 seconds
    maxMemoryUsage: 1024 * 1024 * 1024, // 1GB memory limit per worker
  })

  // Worker event handlers
  worker.on('completed', (job, result: PayRunJobResult) => {
    console.log(`✅ Pay run calculation completed: ${job.id}`, {
      payRunId: result.payRunId,
      totalHours: result.totals.totalHours,
      totalGross: result.totals.gross
    })
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Pay run calculation failed: ${job?.id}`, {
      error: err.message,
      payRunId: job?.data?.payRunId
    })
  })

  worker.on('progress', (job, progress) => {
    console.log(`🔄 Pay run calculation progress: ${job.id} - ${progress}%`)
  })

  worker.on('stalled', (jobId) => {
    console.warn(`⚠️ Pay run calculation stalled: ${jobId}`)
  })

  return worker
}

// Export for use in standalone worker process
export { processPayRunCalculation }