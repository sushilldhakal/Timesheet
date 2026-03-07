import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { TemplateManager } from "@/lib/managers/template-manager"

/**
 * POST /api/schedules/copy-from-template
 * Copy a role template to an employee's schedule
 */
export async function POST(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { templateId, employeeId, overwrite } = body

    // Validation
    if (!templateId || !employeeId) {
      return NextResponse.json(
        { error: "templateId and employeeId are required" },
        { status: 400 }
      )
    }

    await connectDB()
    const templateManager = new TemplateManager()

    const schedule = await templateManager.copyTemplateToEmployee(
      templateId,
      employeeId,
      overwrite || false
    )

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (err: any) {
    console.error("[api/schedules/copy-from-template POST]", err)
    
    if (err.message?.includes("already has schedules")) {
      return NextResponse.json(
        { error: err.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to copy template" },
      { status: 500 }
    )
  }
}
