import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { TemplateManager } from "@/lib/managers/template-manager"

/**
 * GET /api/schedules/templates?organizationId=...
 * List all role templates for an organization
 */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get("organizationId")

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    )
  }

  try {
    await connectDB()
    const templateManager = new TemplateManager()
    const templates = await templateManager.listRoleTemplates(organizationId)

    return NextResponse.json({ templates })
  } catch (err) {
    console.error("[api/schedules/templates GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/schedules/templates
 * Create a new role template
 */
export async function POST(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { roleId, organizationId, shiftPattern } = body

    // Validation
    if (!roleId || !organizationId || !shiftPattern) {
      return NextResponse.json(
        { error: "roleId, organizationId, and shiftPattern are required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(shiftPattern.dayOfWeek) || shiftPattern.dayOfWeek.length === 0) {
      return NextResponse.json(
        { error: "shiftPattern.dayOfWeek must be a non-empty array" },
        { status: 400 }
      )
    }

    if (!shiftPattern.startTime || !shiftPattern.endTime) {
      return NextResponse.json(
        { error: "shiftPattern must include startTime and endTime" },
        { status: 400 }
      )
    }

    await connectDB()
    const templateManager = new TemplateManager()

    const template = await templateManager.createRoleTemplate(
      roleId,
      organizationId,
      {
        dayOfWeek: shiftPattern.dayOfWeek,
        startTime: new Date(shiftPattern.startTime),
        endTime: new Date(shiftPattern.endTime),
        locationId: shiftPattern.locationId,
        roleId: shiftPattern.roleId,
        isRotating: shiftPattern.isRotating || false,
        rotationCycle: shiftPattern.rotationCycle,
        rotationStartDate: shiftPattern.rotationStartDate
          ? new Date(shiftPattern.rotationStartDate)
          : undefined,
      }
    )

    return NextResponse.json({ template }, { status: 201 })
  } catch (err) {
    console.error("[api/schedules/templates POST]", err)
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }
}
