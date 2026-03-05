/**
 * Employee Logout API
 * 
 * Clears employee web session cookie
 */

import { NextResponse } from "next/server"
import { clearEmployeeWebCookie } from "@/lib/employee-auth"

export async function POST() {
  try {
    await clearEmployeeWebCookie()

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (err) {
    console.error("[api/employee/logout]", err)
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    )
  }
}
