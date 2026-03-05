/**
 * Employee Change Password API
 * 
 * Allows employees to change their password
 */

import { NextRequest, NextResponse } from "next/server"
import { connectDB, Employee } from "@/lib/db"
import { getEmployeeFromWebCookie } from "@/lib/employee-auth"
import { z } from "zod"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export async function POST(request: NextRequest) {
  try {
    const employeeAuth = await getEmployeeFromWebCookie()

    if (!employeeAuth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = parsed.data

    await connectDB()

    const employee = await Employee.findById(employeeAuth.sub)
      .select("+password")

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    // Verify current password
    if (employee.password) {
      const isCurrentPasswordValid = await employee.comparePassword(currentPassword)
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        )
      }
    }

    // Update password
    employee.password = newPassword
    employee.requirePasswordChange = false
    employee.passwordSetByAdmin = false
    employee.passwordChangedAt = new Date()
    
    await employee.save()

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (err) {
    console.error("[api/employee/change-password]", err)
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    )
  }
}