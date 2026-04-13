import { NextRequest, NextResponse } from "next/server"
import { evaluateAwardRules } from "@/lib/rules/evaluate-rules"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      awardId,
      shiftDate,
      startTime,
      endTime,
      employmentType,
      awardTags,
      isPublicHoliday,
      dailyHoursWorked,
      weeklyHoursWorked,
      locationId,
    } = body

    if (!awardId) {
      return NextResponse.json(
        { error: "awardId is required" },
        { status: 400 }
      )
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "startTime and endTime are required" },
        { status: 400 }
      )
    }

    const result = await evaluateAwardRules({
      awardId,
      shiftDate: new Date(shiftDate || startTime),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      employmentType: employmentType || "full_time",
      awardTags: awardTags || [],
      isPublicHoliday: isPublicHoliday ?? false,
      dailyHoursWorked: dailyHoursWorked ?? 0,
      weeklyHoursWorked: weeklyHoursWorked ?? 0,
      locationId,
    })

    if (result.error) {
      const isNotFound = result.error.includes("not found")
      return NextResponse.json(result, { status: isNotFound ? 404 : 200 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[api/awards/evaluate-rules POST]", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
