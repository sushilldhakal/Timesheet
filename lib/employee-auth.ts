import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const EMPLOYEE_COOKIE = "employee_session"
const MAX_AGE = 60 * 5 // 5 minutes (300 seconds)
const IS_PRODUCTION = process.env.NODE_ENV === "production"

export type EmployeeAuthPayload = {
  sub: string // employeeId
  pin: string
  type: "employee"
}

function getSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET required for employee auth")
  }
  return new TextEncoder().encode(secret)
}

export async function createEmployeeToken(payload: Omit<EmployeeAuthPayload, "type">): Promise<string> {
  return new SignJWT({
    pin: payload.pin,
    type: "employee",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret())
}

export async function verifyEmployeeToken(token: string): Promise<EmployeeAuthPayload | null> {
  try {
    // jwtVerify performs constant-time comparison for signature verification
    // This prevents timing attacks on token validation
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.type !== "employee") return null
    const sub = payload.sub
    if (!sub || typeof sub !== "string") return null
    return {
      sub,
      pin: (payload.pin as string) ?? "",
      type: "employee",
    }
  } catch {
    return null
  }
}

export function getEmployeeCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  }
}

export async function setEmployeeCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(EMPLOYEE_COOKIE, token, getEmployeeCookieOptions())
}

export async function clearEmployeeCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(EMPLOYEE_COOKIE)
}

export async function getEmployeeFromCookie(): Promise<EmployeeAuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(EMPLOYEE_COOKIE)?.value
  if (!token) return null
  return verifyEmployeeToken(token)
}

/** For middleware – reads employee cookie from request */
export function getEmployeeTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`${EMPLOYEE_COOKIE}=([^;]+)`))
  return match?.[1]
}

/** Invalidate employee session by clearing the session cookie */
export async function invalidateEmployeeSession(): Promise<void> {
  await clearEmployeeCookie()
}
