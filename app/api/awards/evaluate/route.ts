import { NextRequest, NextResponse } from "next/server"
import { AwardEngine } from "@/lib/engines/award-engine"
import { Award, ShiftContext, awardSchema, shiftContextSchema } from "@/lib/validations/awards"

/**
 * POST /api/awards/evaluate
 * 
 * Evaluates a shift against an award using the proper AwardEngine
 * 
 * Body: {
 *   award: Award,
 *   context: ShiftContext
 * }
 * 
 * Returns: AwardEngineResult with pay line items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const awardResult = awardSchema.safeParse(body.award)
    if (!awardResult.success) {
      return NextResponse.json(
        { error: "Invalid award data", details: awardResult.error.issues },
        { status: 400 }
      )
    }
    
    const contextResult = shiftContextSchema.safeParse({
      ...body.context,
      startTime: new Date(body.context.startTime),
      endTime: new Date(body.context.endTime),
      rosteredStart: body.context.rosteredStart ? new Date(body.context.rosteredStart) : undefined,
      rosteredEnd: body.context.rosteredEnd ? new Date(body.context.rosteredEnd) : undefined,
      breaks: body.context.breaks?.map((b: any) => ({
        ...b,
        startTime: new Date(b.startTime),
        endTime: new Date(b.endTime),
      })) || [],
    })
    
    if (!contextResult.success) {
      return NextResponse.json(
        { error: "Invalid shift context", details: contextResult.error.issues },
        { status: 400 }
      )
    }
    
    const award = awardResult.data
    const context = contextResult.data
    
    // 🔥 FIXED: Use proper AwardEngine instead of award.evaluateRules
    const engine = new AwardEngine(award)
    const result = engine.processShift(context)
    
    return NextResponse.json({
      success: true,
      result,
      metadata: {
        awardName: award.name,
        employeeId: context.employeeId,
      }
    })
    
  } catch (error) {
    console.error("Award evaluation error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/awards/evaluate/test
 * 
 * Test endpoint with sample data
 */
export async function GET() {
  try {
    // Sample award with proper exportName fields
    const sampleAward: Award = {
      name: "Test Retail Award",
      description: "Sample award for testing",
      rules: [
        {
          name: "Ordinary Time",
          description: "Standard 1x rate",
          priority: 1,
          isActive: true,
          canStack: false,
          conditions: {},
          outcome: {
            type: "ordinary",
            multiplier: 1.0,
            exportName: "ORD 1x",
            description: "Standard rate"
          }
        },
        {
          name: "Daily Overtime",
          description: "1.5x rate after 8 hours",
          priority: 10,
          isActive: true,
          canStack: false,
          conditions: {
            afterHoursWorked: 8
          },
          outcome: {
            type: "overtime",
            multiplier: 1.5,
            exportName: "OT 1.5x",
            description: "Daily overtime"
          }
        }
      ],
      availableTags: [
        { name: "TOIL" },
        { name: "BrokenShift" }
      ],
      isActive: true,
      version: "1.0.0"
    }
    
    // Sample shift context with baseRate
    const sampleContext: ShiftContext = {
      employeeId: "emp123",
      employmentType: "full_time",
      baseRate: 25.50, // $25.50/hour
      startTime: new Date("2024-01-15T09:00:00Z"),
      endTime: new Date("2024-01-15T18:00:00Z"), // 9 hour shift
      awardTags: [],
      isPublicHoliday: false,
      weeklyHoursWorked: 32,
      dailyHoursWorked: 9,
      consecutiveShifts: 0,
      breaks: []
    }
    
    const engine = new AwardEngine(sampleAward)
    const result = engine.processShift(sampleContext)
    
    return NextResponse.json({
      success: true,
      sampleAward,
      sampleContext,
      result,
      explanation: "This shows a 9-hour shift with 8 hours ordinary time and 1 hour overtime at 1.5x rate"
    })
    
  } catch (error) {
    console.error("Test evaluation error:", error)
    return NextResponse.json(
      { error: "Test failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}