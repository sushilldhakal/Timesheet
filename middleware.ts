import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const COOKIE_NAME = "auth_token"

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) return new TextEncoder().encode("")
  return new TextEncoder().encode(secret)
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return false
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect all dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const authed = await isAuthenticated(request)
    if (!authed) {
      const loginUrl = new URL("/", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
