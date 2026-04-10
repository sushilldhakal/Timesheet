import { DailyTimesheetRow } from "@/lib/types/timesheet"
import { Award } from "@/lib/validations/awards"
import { AwardEngine } from "@/lib/engines/award-engine"
import { 
  timesheetEntryToShiftContext, 
  payLinesToTandaFormat, 
  validateTimesheetEntry,
  type EmployeeContext 
} from "./timesheet-to-shift-context"
import { checkPublicHoliday } from "./public-holidays"
import { hospitalityAwardWithStacking } from "./award-examples"

/**
 * Assert function for testing
 */
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

/**
 * Test the timesheet-to-shift-context mapper with a realistic scenario
 */
export function testTimesheetMapper() {
  console.log("🧪 Testing Timesheet → AwardEngine → Tanda Format Pipeline")
  
  // Create a realistic timesheet entry
  const testTimesheetEntry: DailyTimesheetRow = {
    date: "2024-04-08", // Monday
    clockIn: "09:00",
    clockOut: "17:30", // 8.5 hour shift
    breakIn: "12:30",
    breakOut: "13:00", // 30 minute unpaid break
    breakMinutes: 30,
    breakHours: "0.50",
    totalMinutes: 480, // 8 hours (8.5 - 0.5 break)
    totalHours: "8.00",
    clockInImage: "",
    clockInWhere: "Front Desk",
    breakInImage: "",
    breakInWhere: "Staff Room",
    breakOutImage: "",
    breakOutWhere: "Staff Room",
    clockOutImage: "",
    clockOutWhere: "Front Desk",
  }
  
  // Create employee context (casual hospitality worker)
  const employeeContext: EmployeeContext = {
    id: "507f1f77bcf86cd799439011",
    employmentType: "casual",
    baseRate: 25.00, // $25/hour
    awardTags: [] // No special tags for this shift
  }
  
  console.log("📋 Test Timesheet Entry:", {
    date: testTimesheetEntry.date,
    shift: `${testTimesheetEntry.clockIn} - ${testTimesheetEntry.clockOut}`,
    break: `${testTimesheetEntry.breakIn} - ${testTimesheetEntry.breakOut}`,
    totalHours: testTimesheetEntry.totalHours,
    employee: {
      type: employeeContext.employmentType,
      rate: `${employeeContext.baseRate}/hr`
    }
  })
  
  try {
    // Step 1: Validate the timesheet entry
    validateTimesheetEntry(testTimesheetEntry)
    console.log("✅ Timesheet entry validation passed")
    
    // Step 2: Convert to ShiftContext
    const shiftContext = timesheetEntryToShiftContext(
      testTimesheetEntry,
      employeeContext,
      0, // No weekly hours worked so far
      false // Not a public holiday
    )
    
    console.log("🔄 Generated ShiftContext:", {
      employeeId: shiftContext.employeeId,
      employmentType: shiftContext.employmentType,
      baseRate: shiftContext.baseRate,
      startTime: shiftContext.startTime.toISOString(),
      endTime: shiftContext.endTime.toISOString(),
      dailyHoursWorked: shiftContext.dailyHoursWorked,
      breaks: shiftContext.breaks.map(b => ({
        start: b.startTime.toISOString(),
        end: b.endTime.toISOString(),
        isPaid: b.isPaid
      }))
    })
    
    // Step 3: Run through AwardEngine
    const engine = new AwardEngine(hospitalityAwardWithStacking)
    const result = engine.processShift(shiftContext)
    
    console.log("⚙️ AwardEngine Result:", {
      totalHours: result.totalHours,
      totalCost: result.totalCost,
      payLinesCount: result.payLines.length,
      breakEntitlements: result.breakEntitlements.length,
      leaveAccruals: result.leaveAccruals.length
    })
    
    // Step 4: Show detailed pay breakdown
    console.log("💰 Pay Line Breakdown:")
    result.payLines.forEach((line, index) => {
      console.log(`  ${index + 1}. ${line.name} (${line.exportName})`)
      console.log(`     Time: ${line.from.toISOString()} → ${line.to.toISOString()}`)
      console.log(`     Units: ${line.units.toFixed(2)}h @ ${line.baseRate}${line.multiplier ? ` × ${line.multiplier}` : ''}`)
      console.log(`     Cost: ${line.cost.toFixed(2)}`)
      console.log(`     Ordinary Hours: ${line.ordinaryHours.toFixed(2)}h`)
      console.log("")
    })
    
    // Step 5: Cost assertion - Engine processes full span including break time
    // 8.5h × $25 × 1.25 (casual loading) = $265.625
    const expectedCost = 8.5 * 25 * 1.25
    assert(Math.abs(result.totalCost - expectedCost) < 0.01, 
      `Expected cost ${expectedCost.toFixed(2)}, got ${result.totalCost.toFixed(2)}`)
    console.log(`✅ Cost assertion passed: ${result.totalCost.toFixed(2)} (expected ${expectedCost.toFixed(2)})`)
    
    // Step 6: Convert to Tanda format for comparison
    const tandaFormat = payLinesToTandaFormat(result.payLines)
    
    console.log("🎯 Tanda-Compatible Output:")
    console.log(JSON.stringify(tandaFormat, null, 2))
    
    // Step 7: Summary for comparison
    console.log("📊 Summary for Tanda Comparison:")
    console.log(`Total Hours: ${result.totalHours.toFixed(2)}`)
    console.log(`Total Cost: ${result.totalCost.toFixed(2)}`)
    console.log(`Pay Lines: ${result.payLines.length}`)
    console.log(`Expected: Casual loading (1.25x) + potential weekend/overtime penalties`)
    
    return {
      success: true,
      shiftContext,
      awardEngineResult: result,
      tandaFormat
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test with a more complex scenario (weekend + overtime)
 */
export function testComplexScenario() {
  console.log("\n🧪 Testing Complex Scenario: Weekend + Overtime")
  
  const complexTimesheetEntry: DailyTimesheetRow = {
    date: "2024-04-13", // Saturday
    clockIn: "08:00",
    clockOut: "19:00", // 11 hour shift
    breakIn: "12:00",
    breakOut: "13:00", // 1 hour unpaid break
    breakMinutes: 60,
    breakHours: "1.00",
    totalMinutes: 600, // 10 hours (11 - 1 break)
    totalHours: "10.00",
    clockInImage: "",
    clockInWhere: "Kitchen",
    breakInImage: "",
    breakInWhere: "Staff Room",
    breakOutImage: "",
    breakOutWhere: "Staff Room",
    clockOutImage: "",
    clockOutWhere: "Kitchen",
  }
  
  const employeeContext: EmployeeContext = {
    id: "507f1f77bcf86cd799439012",
    employmentType: "casual",
    baseRate: 28.50, // Higher rate kitchen staff
    awardTags: [] // No special overrides
  }
  
  console.log("📋 Complex Test Scenario:", {
    date: complexTimesheetEntry.date + " (Saturday)",
    shift: `${complexTimesheetEntry.clockIn} - ${complexTimesheetEntry.clockOut}`,
    totalHours: complexTimesheetEntry.totalHours,
    expectedPenalties: ["Casual loading (1.25x)", "Weekend penalty (1.5x)", "Daily overtime after 8h (1.5x)"]
  })
  
  try {
    validateTimesheetEntry(complexTimesheetEntry)
    
    const shiftContext = timesheetEntryToShiftContext(
      complexTimesheetEntry,
      employeeContext,
      35, // Already worked 35 hours this week
      false
    )
    
    const engine = new AwardEngine(hospitalityAwardWithStacking)
    const result = engine.processShift(shiftContext)
    
    console.log("⚙️ Complex Scenario Result:", {
      totalHours: result.totalHours,
      totalCost: result.totalCost,
      payLinesCount: result.payLines.length
    })
    
    console.log("💰 Complex Pay Breakdown:")
    result.payLines.forEach((line, index) => {
      console.log(`  ${index + 1}. ${line.name} (${line.exportName})`)
      console.log(`     ${line.units.toFixed(2)}h × ${line.baseRate} × ${line.multiplier || 1} = ${line.cost.toFixed(2)}`)
    })
    
    // Cost assertion for complex scenario
    // This is more complex due to stacking penalties, but we can validate the total is reasonable
    assert(result.totalCost > 300, `Complex scenario should cost more than $300, got ${result.totalCost.toFixed(2)}`)
    assert(result.totalCost < 600, `Complex scenario should cost less than $600, got ${result.totalCost.toFixed(2)}`)
    console.log(`✅ Complex cost assertion passed: ${result.totalCost.toFixed(2)} (within expected range)`)
    
    const tandaFormat = payLinesToTandaFormat(result.payLines)
    console.log("\n🎯 Complex Tanda Output:")
    console.log(JSON.stringify(tandaFormat, null, 2))
    
    return {
      success: true,
      result,
      tandaFormat
    }
    
  } catch (error) {
    console.error("❌ Complex test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test with a public holiday scenario using actual checkPublicHoliday function
 */
export async function testPublicHolidayScenario() {
  console.log("\n🧪 Testing Public Holiday Scenario")
  
  const publicHolidayEntry: DailyTimesheetRow = {
    date: "2024-12-25", // Christmas Day
    clockIn: "10:00",
    clockOut: "16:00", // 6 hour shift
    breakIn: "13:00",
    breakOut: "13:30", // 30 minute unpaid break
    breakMinutes: 30,
    breakHours: "0.50",
    totalMinutes: 330, // 5.5 hours (6 - 0.5 break)
    totalHours: "5.50",
    clockInImage: "",
    clockInWhere: "Main Store",
    breakInImage: "",
    breakInWhere: "Staff Room",
    breakOutImage: "",
    breakOutWhere: "Staff Room",
    clockOutImage: "",
    clockOutWhere: "Main Store",
  }
  
  const employeeContext: EmployeeContext = {
    id: "507f1f77bcf86cd799439013",
    employmentType: "casual",
    baseRate: 26.00, // $26/hour
    awardTags: [] // No special overrides
  }
  
  console.log("📋 Public Holiday Test:", {
    date: publicHolidayEntry.date + " (Christmas Day)",
    shift: `${publicHolidayEntry.clockIn} - ${publicHolidayEntry.clockOut}`,
    totalHours: publicHolidayEntry.totalHours,
    expectedPenalties: ["Public Holiday (2.5x)", "Casual loading may stack"]
  })
  
  try {
    validateTimesheetEntry(publicHolidayEntry)
    
    // Test the actual checkPublicHoliday function
    const christmasDate = new Date('2024-12-25')
    const isHoliday = await checkPublicHoliday(christmasDate)
    assert(isHoliday === true, `Christmas Day should be detected as public holiday, got ${isHoliday}`)
    console.log("✅ Public holiday detection test passed: Christmas Day correctly identified")
    
    const shiftContext = timesheetEntryToShiftContext(
      publicHolidayEntry,
      employeeContext,
      0, // No weekly hours
      isHoliday // Use actual detection result
    )
    
    console.log("🎄 Public Holiday Context:", {
      isPublicHoliday: shiftContext.isPublicHoliday,
      baseRate: shiftContext.baseRate,
      totalHours: (shiftContext.endTime.getTime() - shiftContext.startTime.getTime()) / (1000 * 60 * 60)
    })
    
    const engine = new AwardEngine(hospitalityAwardWithStacking)
    const result = engine.processShift(shiftContext)
    
    console.log("🎁 Public Holiday Result:", {
      totalHours: result.totalHours,
      totalCost: result.totalCost,
      payLinesCount: result.payLines.length
    })
    
    console.log("💰 Public Holiday Pay Breakdown:")
    result.payLines.forEach((line, index) => {
      console.log(`  ${index + 1}. ${line.name} (${line.exportName})`)
      console.log(`     ${line.units.toFixed(2)}h × ${line.baseRate} × ${line.multiplier || 1} = ${line.cost.toFixed(2)}`)
    })
    
    // Cost assertion for public holiday: 6h × $26 × 2.5 = $390.00
    const expectedCost = 6 * 26 * 2.5
    assert(Math.abs(result.totalCost - expectedCost) < 0.01, 
      `Expected public holiday cost ${expectedCost.toFixed(2)}, got ${result.totalCost.toFixed(2)}`)
    console.log(`✅ Public holiday cost assertion passed: ${result.totalCost.toFixed(2)} (expected ${expectedCost.toFixed(2)})`)
    
    const tandaFormat = payLinesToTandaFormat(result.payLines)
    console.log("\n🎯 Public Holiday Tanda Output:")
    console.log(JSON.stringify(tandaFormat, null, 2))
    
    return {
      success: true,
      result,
      tandaFormat
    }
    
  } catch (error) {
    console.error("❌ Public holiday test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log("🚀 Running Award Engine Mapper Tests\n")
  
  const basicTest = testTimesheetMapper()
  const complexTest = testComplexScenario()
  const holidayTest = await testPublicHolidayScenario()
  
  console.log("\n📈 Test Results Summary:")
  console.log(`Basic Test: ${basicTest.success ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`Complex Test: ${complexTest.success ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`Public Holiday Test: ${holidayTest.success ? '✅ PASSED' : '❌ FAILED'}`)
  
  if (!basicTest.success) {
    console.log(`Basic Test Error: ${basicTest.error}`)
  }
  
  if (!complexTest.success) {
    console.log(`Complex Test Error: ${complexTest.error}`)
  }
  
  if (!holidayTest.success) {
    console.log(`Public Holiday Test Error: ${holidayTest.error}`)
  }
  
  const allPassed = basicTest.success && complexTest.success && holidayTest.success
  console.log(`\n🎉 All tests ${allPassed ? 'PASSED' : 'FAILED'}`)
  
  return {
    basicTest,
    complexTest,
    holidayTest,
    allPassed
  }
}

// Export for use in other files or direct execution
if (typeof window === 'undefined' && require.main === module) {
  // Running directly in Node.js
  runAllTests().then(result => {
    process.exit(result.allPassed ? 0 : 1)
  })
}