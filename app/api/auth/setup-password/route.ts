/**
 * Setup Password API
 * 
 * Handles initial password setup for new employees
 * Used when admin creates employee without setting password
 */

import { NextRequest, NextResponse } from "next/server"
import { connectDB, Employee } from "@/lib/db"
import { hashToken, isTokenValid } from "@/lib/utils/auth-tokens"
import { setupPasswordSchema } from "@/lib/validations/auth"

// GET - Verify setup token
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

    // Find employee with setup token
    const employee = await Employee.findOne({
      passwordSetupToken: hashedToken,
    })
      .select("+passwordSetupToken +passwordSetupExpiry")
      .lean()

    if (!employee) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      )
    }

    if (!isTokenValid(employee.passwordSetupExpiry)) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      email: employee.email,
      name: employee.name,
      pin: employee.pin,
    })
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/setup-password GET]", err)
    }
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    )
  }
}

// POST - Set initial password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = setupPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { token, newPassword } = parsed.data
    await connectDB()
    const hashedToken = hashToken(token)

    // Find employee with setup token
    const employee = await Employee.findOne({
      passwordSetupToken: hashedToken,
    }).select("+passwordSetupToken +passwordSetupExpiry")

    if (!employee) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      )
    }

    if (!isTokenValid(employee.passwordSetupExpiry)) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 400 }
      )
    }

    // Set password and clear setup token
    employee.password = newPassword // Will be hashed by pre-save hook
    employee.passwordSetupToken = null
    employee.passwordSetupExpiry = null
    employee.passwordChangedAt = new Date()
    employee.requirePasswordChange = false
    await employee.save()

    if (process.env.NODE_ENV === "development") {
      console.log(`[Setup Password] Password set for employee: ${employee.email}`)
    }

    // Auto-login after setup
    const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/employee-auth")
    
    const authToken = await createEmployeeWebToken({
      sub: String(employee._id),
      pin: employee.pin,
    })

    await setEmployeeWebCookie(authToken)

    return NextResponse.json({
      success: true,
      message: "Password set successfully",
      redirect: "/staff/dashboard",
    })
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/setup-password POST]", err)
    }
    return NextResponse.json(
      { error: "Failed to set password" },
      { status: 500 }
    )
  }
}
