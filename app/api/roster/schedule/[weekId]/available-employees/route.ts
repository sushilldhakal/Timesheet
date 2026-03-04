import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Employee } from "@/lib/db/schemas/employee"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { Roster } from "@/lib/db/schemas/roster"
import { verifyAuth } from "@/lib/auth-api"
import { calculateShiftDuration } from "@/lib/roster-validation"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    console.log("[available-employees] Starting request")
    const user = await verifyAuth(req)
    console.log("[available-employees] User auth result:", user ? "authenticated" : "not authenticated")
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { weekId } = await params
    console.log("[available-employees] WeekId:", weekId)

    // Get roster for this week
    const roster = await Roster.findOne({ weekId })
      .populate("shifts.employeeId")
      .populate("shifts.locationId")
      .populate("shifts.roleId")

    if (!roster) {
      // If no roster exists yet, return all employees with zero hours
      const allEmployees = await Employee.find()
      
      // Get all active role assignments
      const activeAssignments = await EmployeeRoleAssignment.find()
        .populate("employeeId")
        .populate("roleId")
        .populate("locationId")

      const availableEmployees = allEmployees.map((employee) => {
        const assignments = activeAssignments.filter(
          (a) => a.employeeId && a.roleId && a.locationId && 
                 a.employeeId._id.toString() === employee._id.toString()
        )

        return {
          _id: employee._id,
          name: employee.name,
          pin: employee.pin,
          standardHoursPerWeek: employee.standardHoursPerWeek,
          employmentType: employee.employmentType,
          img: employee.img,
          currentHours: 0,
          hoursRemaining: employee.standardHoursPerWeek || null,
          assignments: assignments.map((a) => ({
            roleId: a.roleId._id,
            roleName: a.roleId.name,
            locationId: a.locationId._id,
            locationName: a.locationId.name,
            validFrom: a.validFrom,
            validTo: a.validTo,
          })),
        }
      })

      // Filter by user's scope
      const filteredEmployees = availableEmployees.filter((emp) => {
        if (user.role === "super_admin" || user.role === "admin") {
          return true
        }
        return emp.assignments.some(
          (a) =>
            user.managedRoles.includes(a.roleName) &&
            user.location.includes(a.locationId.toString())
        )
      })

      return NextResponse.json({
        employees: filteredEmployees,
        summary: {
          total: filteredEmployees.length,
          unscheduled: filteredEmployees.length,
        },
      })
    }

    // Get all role assignments for the week
    const weekStartDate = roster.weekStartDate
    const weekEndDate = roster.weekEndDate

    const activeAssignments = await EmployeeRoleAssignment.find({
      validFrom: { $lte: weekEndDate },
      $or: [
        { validTo: null },
        { validTo: { $gte: weekStartDate } },
      ],
    })
      .populate("employeeId")
      .populate("roleId")
      .populate("locationId")

    // Get all employees with their current hours in the roster
    const allEmployees = await Employee.find()

    // Calculate hours per employee in current roster
    const employeeHoursMap = new Map<string, number>()
    roster.shifts.forEach((shift) => {
      if (shift.employeeId) {
        const empId = shift.employeeId._id.toString()
        const duration = calculateShiftDuration(shift.startTime, shift.endTime)
        employeeHoursMap.set(empId, (employeeHoursMap.get(empId) || 0) + duration)
      }
    })

    // Build available employees list with their assignments and hours
    const availableEmployees = allEmployees.map((employee) => {
      const assignments = activeAssignments.filter(
        (a) => a.employeeId && a.employeeId._id.toString() === employee._id.toString()
      )

      const currentHours = employeeHoursMap.get(employee._id.toString()) || 0
      const hoursRemaining = employee.standardHoursPerWeek
        ? employee.standardHoursPerWeek - currentHours
        : null

      return {
        _id: employee._id,
        name: employee.name,
        pin: employee.pin,
        standardHoursPerWeek: employee.standardHoursPerWeek,
        employmentType: employee.employmentType,
        img: employee.img,
        currentHours,
        hoursRemaining,
        assignments: assignments
          .filter((a) => a.roleId && a.locationId) // Filter out assignments with null references
          .map((a) => ({
            roleId: a.roleId._id,
            roleName: a.roleId.name,
            locationId: a.locationId._id,
            locationName: a.locationId.name,
            validFrom: a.validFrom,
            validTo: a.validTo,
          })),
      }
    })

    // Filter by user's scope (manager role + location)
    const filteredEmployees = availableEmployees.filter((emp) => {
      if (user.role === "super_admin" || user.role === "admin") {
        return true // Full access
      }

      // Manager: Can see employees assigned to their managed roles at their locations
      return emp.assignments.some(
        (a) =>
          user.managedRoles.includes(a.roleName) &&
          user.location.includes(a.locationId.toString())
      )
    })

    return NextResponse.json({
      employees: filteredEmployees,
      summary: {
        total: filteredEmployees.length,
        unscheduled: filteredEmployees.filter((e) => e.currentHours === 0).length,
      },
    })
  } catch (error) {
    console.error("GET /api/roster/available-employees error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      { error: "Failed to fetch available employees", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
