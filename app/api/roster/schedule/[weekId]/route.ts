import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Roster } from "@/lib/db/schemas/roster"
import { Category } from "@/lib/db/schemas/category"
import { Employee } from "@/lib/db/schemas/employee"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { verifyAuth } from "@/lib/auth-api"
import { validateRoster } from "@/lib/roster-validation"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const user = await verifyAuth(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { weekId } = await params

    // Validate weekId format (YYYY-Www)
    if (!/^\d{4}-W\d{2}$/.test(weekId)) {
      return NextResponse.json({ error: "Invalid week ID format" }, { status: 400 })
    }

    // Get roster
    const roster = await Roster.findOne({ weekId })
      .populate("shifts.employeeId")
      .populate("shifts.locationId")
      .populate("shifts.roleId")

    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 })
    }

    // Get all locations and roles for the manager's scope
    const locations = await Category.find({ type: "location" })
    const roles = await Category.find({ type: "role" })

    // Filter based on user permissions
    // user.location contains location names, not IDs
    const accessibleLocations = user.location.length > 0 
      ? locations.filter((l) => user.location.includes(l.name))
      : locations

    const accessibleRoles = user.managedRoles.length > 0
      ? roles.filter((r) => user.managedRoles.includes(r.name))
      : roles

    // Check if user has access to this roster (at least one location overlap)
    const rosterLocationIds = new Set(
      roster.shifts.map((s) => s.locationId._id.toString())
    )
    const hasAccess = Array.from(rosterLocationIds).some((locId) =>
      accessibleLocations.find((l) => l._id.toString() === locId)
    )

    if (!hasAccess && user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Access denied to this roster" }, { status: 403 })
    }

    // Get filtered employees based on user's locations and managed roles
    let employees
    if (user.role === "super_admin" || user.role === "admin") {
      // Admins see all employees
      employees = await Employee.find()
    } else {
      // Get accessible location IDs
      const accessibleLocationIds = accessibleLocations.map(l => l._id)
      
      // Get accessible role IDs
      const accessibleRoleIds = accessibleRoles.map(r => r._id)
      
      // If user has managed roles, filter employees by role assignments
      if (user.managedRoles.length > 0) {
        // Find employees with role assignments matching user's managed roles and locations
        const roleAssignmentsForUser = await EmployeeRoleAssignment.find({
          roleId: { $in: accessibleRoleIds },
          locationId: { $in: accessibleLocationIds },
          isActive: true
        }).select("employeeId").lean()
        
        const employeeIds = Array.from(
          new Set(roleAssignmentsForUser.map(a => a.employeeId.toString()))
        )
        
        employees = await Employee.find({ _id: { $in: employeeIds } })
      } else {
        // No managed roles - show all employees at their locations
        employees = await Employee.find({ location: { $in: user.location } })
      }
    }
    
    const employeeMap = new Map(employees.map((e) => [e._id.toString(), e]))

    // Get role assignments for validation
    const roleAssignments = await EmployeeRoleAssignment.find()

    // Run validation
    const locationsMap = new Map(locations.map((l) => [l._id.toString(), l]))
    const rolesMap = new Map(roles.map((r) => [r._id.toString(), r]))
    
    const validation = validateRoster(
      roster.shifts as any,
      employeeMap,
      roleAssignments,
      locationsMap,
      rolesMap
    )

    return NextResponse.json({
      roster: {
        _id: roster._id,
        weekId: roster.weekId,
        weekStartDate: roster.weekStartDate,
        weekEndDate: roster.weekEndDate,
        status: roster.status,
        shifts: roster.shifts,
      },
      locations: accessibleLocations,
      roles: accessibleRoles,
      employees: employees.map((e) => ({
        _id: e._id,
        name: e.name,
        pin: e.pin,
        standardHoursPerWeek: e.standardHoursPerWeek,
        employmentType: e.employmentType,
      })),
      validation,
    })
  } catch (error) {
    console.error("GET /api/roster/schedule error:", error)
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const user = await verifyAuth(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { weekId } = await params
    const { shifts } = await req.json()

    if (!Array.isArray(shifts)) {
      return NextResponse.json(
        { error: "Shifts must be an array" },
        { status: 400 }
      )
    }

    // Get roster
    let roster = await Roster.findOne({ weekId })
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 })
    }

    // Check permission
    // user.location contains location names, not IDs
    const accessibleLocations = user.location.length > 0 
      ? await Category.find({ 
          name: { $in: user.location },
          type: "location"
        })
      : await Category.find({ type: "location" })

    const rosterLocationIds = new Set(
      roster.shifts.map((s) => s.locationId.toString())
    )
    const hasAccess = Array.from(rosterLocationIds).some((locId) =>
      accessibleLocations.find((l) => l._id.toString() === locId)
    )

    if (!hasAccess && user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Access denied to this roster" }, { status: 403 })
    }

    // Only allow editing if draft status
    if (roster.status !== "draft") {
      return NextResponse.json(
        { error: "Can only edit draft rosters" },
        { status: 400 }
      )
    }

    // Update shifts (keep draft status)
    roster.shifts = shifts
    roster.updatedAt = new Date()
    await roster.save()

    // Run validation and return updated roster
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

    return NextResponse.json({
      roster: {
        _id: roster._id,
        weekId: roster.weekId,
        status: roster.status,
        shifts: roster.shifts,
        updatedAt: roster.updatedAt,
      },
      validation,
    })
  } catch (error) {
    console.error("PUT /api/roster/schedule error:", error)
    return NextResponse.json(
      { error: "Failed to update roster" },
      { status: 500 }
    )
  }
}
