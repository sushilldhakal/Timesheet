import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getTokenFromRequest, verifyAuthToken } from "@/lib/auth/auth"
import { getEmployeeTokenFromRequest, getEmployeeWebTokenFromRequest, verifyEmployeeToken } from "@/lib/auth/employee-auth"
import { logStaffSessionFailure } from "@/lib/auth/auth-logger"

const PUBLIC_PATHS = ["/", "/forgot-password", "/reset-password", "/setup-password", "/pin"]
const AUTH_PATHS = ["/"]
const EMPLOYEE_CLOCK_PATH = "/clock"
const STAFF_DASHBOARD_PATHS = ["/staff"]
const DEVICE_REQUIRED_PATHS: string[] = [] // Device authorization now handled by DeviceGuard component

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => p === pathname || pathname.startsWith(p + "/"))
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function isEmployeeClockPath(pathname: string) {
  return pathname === EMPLOYEE_CLOCK_PATH || pathname.startsWith(EMPLOYEE_CLOCK_PATH + "/")
}

function isStaffDashboardPath(pathname: string) {
  return STAFF_DASHBOARD_PATHS.some((p) => pathname.startsWith(p + "/") || pathname === p)
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes (handled by route handlers)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Clear employee session when accessing PIN page (login page)
  // This prevents stale sessions from causing redirect loops
  if (pathname === "/pin") {
    const response = NextResponse.next()
    // Clear employee session cookie
    response.cookies.delete("employee_session")
    return response
  }

  // Skip device token validation - now handled by DeviceGuard component
  // Continue with normal auth flow
  // Handle staff dashboard routes - require employee web session
  if (isStaffDashboardPath(pathname)) {
    const empWebToken = getEmployeeWebTokenFromRequest(request)
    let empAuth = null
    if (empWebToken) {
      try {
        empAuth = await verifyEmployeeToken(empWebToken)
      } catch {
        empAuth = null
      }
    }

    if (!empAuth) {
      const loginUrl = new URL("/", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    const response = NextResponse.next()
    response.headers.set("x-employee-id", empAuth.sub)
    return response
  }

  // Continue with normal auth flow
  const token = getTokenFromRequest(request)
  let auth = null
  if (token) {
    try {
      auth = await verifyAuthToken(token)
    } catch {
      auth = null
    }
  }
  const isAuthenticated = !!auth

  // Layer 2: Employee clock route – requires employee PIN session
  if (isEmployeeClockPath(pathname)) {
    const empToken = getEmployeeTokenFromRequest(request)
    let empAuth = null
    if (empToken) {
      try {
        empAuth = await verifyEmployeeToken(empToken)
      } catch {
        empAuth = null
        logStaffSessionFailure("", undefined, "Token verification failed")
      }
    }
    if (!empAuth) {
      if (!empToken) {
        logStaffSessionFailure("", undefined, "Missing staff session")
      } else {
        logStaffSessionFailure("", undefined, "Invalid or expired staff session")
      }
      return NextResponse.redirect(new URL("/pin", request.url))
    }
    const response = NextResponse.next()
    response.headers.set("x-employee-id", empAuth.sub)
    return response
  }

  const response = NextResponse.next()
  response.headers.set("x-user-role", auth?.role ?? "")
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox|models|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
}
