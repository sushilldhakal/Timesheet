import { NextRequest, NextResponse } from "next/server"
import { awardEvaluateRulesService } from "@/lib/services/award/award-evaluate-rules-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await awardEvaluateRulesService.evaluate(body)
    return NextResponse.json(result.data, { status: result.status })
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
