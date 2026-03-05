/**
 * Employee Session API
 * 
 * Returns current employee session info
 */

import { NextResponse } from "next/server"
import { connectDB, Employee } from "@/lib/db"
import { getEmployeeFromCookie } from "@/lib/auth-helpers"

export async function GET() {
  try {
    const employeeAuth = await getEmployeeFromCookie()

    if (!employeeAuth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    await connectDB()

    const employee = await Employee.findById(employeeAuth.sub)
      .select("-password -passwordSetupToken -passwordResetToken")
      .lean()

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    const locations = Array.isArray(employee.location) ? employee.location : []
    const employers = Array.isArray(employee.employer) ? employee.employer : []

    return NextResponse.json({
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        pin: employee.pin,
        location: locations[0] || "",
        employer: employers[0] || "",
        phone: employee.phone,
        homeAddress: employee.homeAddress,
        employmentType: employee.employmentType,
        img: employee.img,
      },
    })
  } catch (err) {
    console.error("[api/employee/me]", err)
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    )
  }
}
