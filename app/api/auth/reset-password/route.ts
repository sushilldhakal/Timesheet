/**
 * Reset Password API
 * 
 * Handles password reset with token verification
 * Works for both admins and employees
 */

import { NextRequest, NextResponse } from "next/server"
import { connectDB, User, Employee } from "@/lib/db"
import { hashToken, isTokenValid } from "@/lib/utils/auth-tokens"
import { resetPasswordSchema } from "@/lib/validations/auth"

// GET - Verify reset token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      )
    }

    await connectDB()
    const hashedToken = hashToken(token)

    // Check users collection
    const user = await User.findOne({
      passwordResetToken: hashedToken,
    })
      .select("+passwordResetToken +passwordResetExpiry")
      .lean()

    if (user && isTokenValid(user.passwordResetExpiry)) {
      return NextResponse.json({
        valid: true,
        email: user.email || user.username,
        name: user.name,
        type: "admin",
      })
    }

    // Check employees collection
    const employee = await Employee.findOne({
      passwordResetToken: hashedToken,
    })
      .select("+passwordResetToken +passwordResetExpiry")
      .lean()

    if (employee && isTokenValid(employee.passwordResetExpiry)) {
      return NextResponse.json({
        valid: true,
        email: employee.email,
        name: employee.name,
        type: "employee",
      })
    }

    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 400 }
    )
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/reset-password GET]", err)
    }
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    )
  }
}

// POST - Reset password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { token, newPassword } = parsed.data
    await connectDB()
    const hashedToken = hashToken(token)

    // Check users collection
    const user = await User.findOne({
      passwordResetToken: hashedToken,
    }).select("+passwordResetToken +passwordResetExpiry")

    if (user && isTokenValid(user.passwordResetExpiry)) {
      // Update password and clear reset token
      user.password = newPassword // Will be hashed by pre-save hook
      user.passwordResetToken = null
      user.passwordResetExpiry = null
      await user.save()

      if (process.env.NODE_ENV === "development") {
        console.log(`[Reset Password] Password reset for user: ${user.email || user.username}`)
      }

      return NextResponse.json({
        success: true,
        message: "Password reset successfully",
        userType: "admin",
      })
    }

    // Check employees collection
    const employee = await Employee.findOne({
      passwordResetToken: hashedToken,
    }).select("+passwordResetToken +passwordResetExpiry")

    if (employee && isTokenValid(employee.passwordResetExpiry)) {
      // Update password and clear reset token
      employee.password = newPassword // Will be hashed by pre-save hook
      employee.passwordResetToken = null
      employee.passwordResetExpiry = null
      employee.passwordChangedAt = new Date()
      employee.requirePasswordChange = false // Clear force change flag
      await employee.save()

      if (process.env.NODE_ENV === "development") {
        console.log(`[Reset Password] Password reset for employee: ${employee.email}`)
      }

      return NextResponse.json({
        success: true,
        message: "Password reset successfully",
        userType: "employee",
      })
    }

    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 400 }
    )
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/reset-password POST]", err)
    }
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
