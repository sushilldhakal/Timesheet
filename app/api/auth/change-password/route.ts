/**
 * Change Password API
 * 
 * Allows logged-in users to change their password
 * Works for both admins and employees
 */

import { NextRequest, NextResponse } from "next/server"
import { connectDB, User, Employee } from "@/lib/db"
import { getAuthFromCookie } from "@/lib/auth-helpers"
import { getEmployeeFromWebCookie } from "@/lib/employee-auth"
import { sendEmail } from "@/lib/mail/sendEmail"
import { generatePasswordChangedEmail } from "@/lib/mail/templates/password-changed-confirmation"
import { z } from "zod"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = parsed.data

    // Check if user is authenticated
    const adminAuth = await getAuthFromCookie()
    const employeeAuth = await getEmployeeFromWebCookie()

    if (!adminAuth && !employeeAuth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    await connectDB()

    // Handle admin password change
    if (adminAuth) {
      const user = await User.findById(adminAuth.sub).select("+password")

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      // Verify current password
      const bcrypt = await import("bcrypt")
      const isValid = await bcrypt.compare(currentPassword, user.password)

      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        )
      }

      // Update password
      user.password = newPassword // Will be hashed by pre-save hook
      await user.save()

      // Send confirmation email
      if (user.email) {
        try {
          const emailContent = generatePasswordChangedEmail({
            name: user.name || "Admin",
            email: user.email,
            changedAt: new Date().toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
            }),
          })

          await sendEmail({
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
            plain: emailContent.plain,
          })
        } catch (emailError) {
          console.error("[Change Password] Failed to send confirmation email:", emailError)
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[Change Password] Password changed for user: ${user.email || user.username}`)
      }

      return NextResponse.json({
        success: true,
        message: "Password changed successfully",
      })
    }

    // Handle employee password change
    if (employeeAuth) {
      const employee = await Employee.findById(employeeAuth.sub).select("+password")

      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        )
      }

      // Verify current password
      const bcrypt = await import("bcrypt")
      const isValid = employee.password 
        ? await bcrypt.compare(currentPassword, employee.password)
        : false

      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        )
      }

      // Update password
      employee.password = newPassword // Will be hashed by pre-save hook
      employee.passwordChangedAt = new Date()
      employee.requirePasswordChange = false // Clear force change flag
      await employee.save()

      // Send confirmation email
      if (employee.email) {
        try {
          const emailContent = generatePasswordChangedEmail({
            name: employee.name,
            email: employee.email,
            changedAt: new Date().toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
            }),
          })

          await sendEmail({
            to: employee.email,
            subject: emailContent.subject,
            html: emailContent.html,
            plain: emailContent.plain,
          })
        } catch (emailError) {
          console.error("[Change Password] Failed to send confirmation email:", emailError)
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[Change Password] Password changed for employee: ${employee.email}`)
      }

      return NextResponse.json({
        success: true,
        message: "Password changed successfully",
      })
    }

    return NextResponse.json(
      { error: "Authentication error" },
      { status: 401 }
    )
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/change-password]", err)
    }
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    )
  }
}
