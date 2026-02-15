import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getTokenFromRequest, verifyAuthToken } from "@/lib/auth"
import { getEmployeeTokenFromRequest, verifyEmployeeToken } from "@/lib/employee-auth"

const PUBLIC_PATHS = ["/", "/login"]
const AUTH_PATHS = ["/login"]
const EMPLOYEE_CLOCK_PATH = "/clock"

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => p === pathname || pathname.startsWith(p + "/"))
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function isEmployeeClockPath(pathname: string) {
  return pathname === EMPLOYEE_CLOCK_PATH || pathname.startsWith(EMPLOYEE_CLOCK_PATH + "/")
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
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

  // Employee clock route – requires employee PIN session
  if (isEmployeeClockPath(pathname)) {
    const empToken = getEmployeeTokenFromRequest(request)
    let empAuth = null
    if (empToken) {
      try {
        empAuth = await verifyEmployeeToken(empToken)
      } catch {
        empAuth = null
      }
    }
    if (!empAuth) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    const response = NextResponse.next()
    response.headers.set("x-employee-id", empAuth.sub)
    return response
  }

  if (isAuthPath(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!isPublic(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set("x-user-role", auth?.role ?? "")
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
