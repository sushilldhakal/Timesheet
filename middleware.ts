import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getTokenFromRequest, verifyAuthToken } from "@/lib/auth"
import { getEmployeeTokenFromRequest, getEmployeeWebTokenFromRequest, verifyEmployeeToken } from "@/lib/employee-auth"
import { getDeviceTokenFromRequest, verifyDeviceToken } from "@/lib/device-auth"
import { logDeviceTokenFailure, logStaffSessionFailure } from "@/lib/auth-logger"

const PUBLIC_PATHS = ["/", "/forgot-password", "/reset-password", "/setup-password", "/pin"]
const AUTH_PATHS = ["/"]
const EMPLOYEE_CLOCK_PATH = "/clock"
const STAFF_DASHBOARD_PATHS = ["/staff"]
const DEVICE_REQUIRED_PATHS = ["/pin", "/clock"] // Only these paths require device registration

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

function requiresDeviceToken(pathname: string) {
  return DEVICE_REQUIRED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes (handled by route handlers)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Allow registration page to load without device token
  const isRegistrationPage = pathname === "/pin" && request.nextUrl.searchParams.has("register")
  const isDisabledPage = pathname === "/pin" && request.nextUrl.searchParams.has("disabled")
  const isRevokedPage = pathname === "/pin" && request.nextUrl.searchParams.has("revoked")
  
  if (isRegistrationPage || isDisabledPage || isRevokedPage) {
    return NextResponse.next()
  }

  // Skip device token validation for paths that don't require it (login, dashboard, etc.)
  if (!requiresDeviceToken(pathname)) {
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

    // Continue with normal auth flow for non-device pages
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

    if (isAuthPath(pathname) && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    if (!isPublic(pathname) && !isAuthenticated) {
      const loginUrl = new URL("/", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    const response = NextResponse.next()
    response.headers.set("x-user-role", auth?.role ?? "")
    return response
  }

  // Layer 1: Device Token Validation (only for device-required paths)
  const deviceToken = getDeviceTokenFromRequest(request)
  let deviceAuth = null

  if (deviceToken) {
    try {
      deviceAuth = await verifyDeviceToken(deviceToken)

      if (deviceAuth) {
        // Device status validation is deferred to API routes
        // The token is valid, but we'll check device status in the API layer
        // This avoids database access in Edge Runtime middleware
        
        // Note: Device status checks (revoked, disabled) are handled by:
        // 1. API routes that need device context
        // 2. Client-side checks that call validation endpoints
      }
    } catch {
      deviceAuth = null
      logDeviceTokenFailure(undefined, "Token verification failed")
    }
  }

  // If no valid device token, redirect to registration
  if (!deviceAuth) {
    if (!deviceToken) {
      logDeviceTokenFailure(undefined, "Missing device token")
    } else {
      logDeviceTokenFailure(undefined, "Invalid device token")
    }
    return NextResponse.redirect(new URL("/pin?register=true", request.url))
  }

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
        logStaffSessionFailure(deviceAuth.sub, undefined, "Token verification failed")
      }
    }
    if (!empAuth) {
      if (!empToken) {
        logStaffSessionFailure(deviceAuth.sub, undefined, "Missing staff session")
      } else {
        logStaffSessionFailure(deviceAuth.sub, undefined, "Invalid or expired staff session")
      }
      return NextResponse.redirect(new URL("/pin", request.url))
    }
    const response = NextResponse.next()
    response.headers.set("x-employee-id", empAuth.sub)
    response.headers.set("x-device-id", deviceAuth.sub)
    return response
  }

  if (isAuthPath(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!isPublic(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set("x-user-role", auth?.role ?? "")
  if (deviceAuth) {
    response.headers.set("x-device-id", deviceAuth.sub)
  }
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox|models|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
}
