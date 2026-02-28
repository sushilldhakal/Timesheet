import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { ComplianceManager } from "@/lib/managers/compliance-manager"

/**
 * POST /api/rosters/[weekId]/validate-compliance
 * Validate roster for compliance violations
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ weekId: string }> }
) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { weekId } = await context.params

  try {
    const body = await request.json()
    const { organizationId } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const { Roster } = await import("@/lib/db")
    const roster = await Roster.findOne({ weekId })

    if (!roster) {
      return NextResponse.json(
        { error: "Roster not found" },
        { status: 404 }
      )
    }

    const complianceManager = new ComplianceManager()
    const violations = await complianceManager.validateRoster(
      roster._id.toString(),
      organizationId
    )

    // Check if any violations block publishing
    const blockingViolations = violations.filter((v) => v.blockPublish)
    const canPublish = blockingViolations.length === 0

    return NextResponse.json({
      isCompliant: violations.length === 0,
      violations: violations.map((v) => ({
        employeeId: v.employeeId,
        date: v.date,
        ruleType: v.ruleType,
        ruleName: v.ruleName,
        message: v.message,
        severity: v.severity,
      })),
      canPublish,
    })
  } catch (err) {
    console.error("[api/rosters/[weekId]/validate-compliance POST]", err)
    return NextResponse.json(
      { error: "Failed to validate compliance" },
      { status: 500 }
    )
  }
}
