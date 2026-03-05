import { NextResponse } from "next/server"
import { clearAuthCookie } from "@/lib/auth-helpers"

export async function POST() {
  await clearAuthCookie()
  return NextResponse.json({ success: true })
}
