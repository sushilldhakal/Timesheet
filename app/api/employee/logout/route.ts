import { NextResponse } from "next/server"
import { clearEmployeeCookie } from "@/lib/auth-helpers"

/** POST /api/employee/logout - Clear employee session */
export async function POST() {
  await clearEmployeeCookie()
  return NextResponse.json({ success: true })
}
