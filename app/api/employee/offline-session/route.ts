import { NextRequest, NextResponse } from "next/server"
import { createEmployeeToken, setEmployeeCookie } from "@/lib/auth/auth-helpers"
import { logger } from "@/lib/utils/logger"

/**
 * POST /api/employee/offline-session
 * Creates an employee session cookie for offline mode
 * This allows the middleware to authenticate offline users
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, pin, offline } = body

    if (!employeeId || !pin) {
      return NextResponse.json(
        { error: "Employee ID and PIN are required" },
        { status: 400 }
      )
    }

    // Create employee session token (same as online login)
    const token = await createEmployeeToken({
      sub: employeeId,
      pin: pin,
    })

    // Create response and set the session cookie
    const response = NextResponse.json({ 
      success: true,
      message: "Offline session created" 
    })

    // Set the cookie on the response to ensure it's sent to the client
    response.cookies.set("employee_session", token, {
      httpOnly: true,
      secure: false, // Allow cookies over HTTP for local network access
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 5, // 5 minutes (same as regular employee session)
    })

    logger.log(`[api/employee/offline-session] Created offline session for employee ${employeeId}`)

    return response

  } catch (error) {
    logger.error("[api/employee/offline-session] Error:", error)
    return NextResponse.json(
      { error: "Failed to create offline session" },
      { status: 500 }
    )
  }
}