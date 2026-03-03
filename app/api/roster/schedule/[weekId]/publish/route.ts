import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { Roster } from "@/lib/db/schemas/roster"
import { Category } from "@/lib/db/schemas/category"
import { Employee } from "@/lib/db/schemas/employee"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { verifyAuth } from "@/lib/auth"
import { validateRoster } from "@/lib/roster-validation"

export async function POST(
  req: NextRequest,
  { params }: { params: { weekId: string } }
) {
  try {
    const user = await verifyAuth(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const weekId = params.weekId

    // Get roster
    let roster = await Roster.findOne({ weekId })
      .populate("shifts.employeeId")
      .populate("shifts.locationId")
      .populate("shifts.roleId")

    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 })
    }

    // Check permission
    const accessibleLocations = user.location.length > 0 
      ? await Category.find({ 
          _id: { $in: user.location },
          type: "location"
        })
      : await Category.find({ type: "location" })

    const rosterLocationIds = new Set(
      roster.shifts.map((s) => s.locationId._id.toString())
    )
    const hasAccess = Array.from(rosterLocationIds).some((locId) =>
      accessibleLocations.find((l) => l._id.toString() === locId)
    )

    if (!hasAccess && user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Access denied to this roster" }, { status: 403 })
    }

    // Only allow publishing if draft status
    if (roster.status !== "draft") {
      return NextResponse.json(
        { error: `Cannot publish roster with status: ${roster.status}` },
        { status: 400 }
      )
    }

    // Validate before publishing
    const locations = await Category.find({ type: "location" })
    const roles = await Category.find({ type: "role" })
    const employees = await Employee.find()
    const employeeMap = new Map(employees.map((e) => [e._id.toString(), e]))
    const roleAssignments = await EmployeeRoleAssignment.find()

    const locationsMap = new Map(locations.map((l) => [l._id.toString(), l]))
    const rolesMap = new Map(roles.map((r) => [r._id.toString(), r]))
    
    const validation = validateRoster(
      roster.shifts as any,
      employeeMap,
      roleAssignments,
      locationsMap,
      rolesMap
    )

    // Check if roster can be published (no critical errors)
    if (!validation.canPublish) {
      return NextResponse.json(
        {
          error: "Cannot publish roster with validation errors",
          validation,
        },
        { status: 400 }
      )
    }

    // Update status to published
    roster.status = "published"
    roster.updatedAt = new Date()
    await roster.save()

    return NextResponse.json({
      message: "Roster published successfully",
      roster: {
        _id: roster._id,
        weekId: roster.weekId,
        status: roster.status,
        weekStartDate: roster.weekStartDate,
        weekEndDate: roster.weekEndDate,
        updatedAt: roster.updatedAt,
      },
      validation,
    })
  } catch (error) {
    console.error("POST /api/roster/schedule/publish error:", error)
    return NextResponse.json(
      { error: "Failed to publish roster" },
      { status: 500 }
    )
  }
}
