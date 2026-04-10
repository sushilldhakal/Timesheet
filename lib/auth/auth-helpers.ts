/**
 * Authentication Helper Functions
 * 
 * These functions wrap Better Auth's JWT functionality to maintain
 * the exact same API as the original auth.ts, employee-auth.ts, and device-auth.ts
 * 
 * This allows you to keep all existing code unchanged while using Better Auth internally.
 */

import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

// Type definitions for compatibility
export type AuthPayload = {
  sub: string
  email: string
  role: "admin" | "manager" | "supervisor" | "accounts" | "user" | "super_admin"
  location?: string
}

export type EmployeeAuthPayload = {
  sub: string
  pin: string
  type: "employee"
}

export type DeviceAuthPayload = {
  sub: string
  location: string
  type: "device"
}

// ============================================================================
// ADMIN/USER AUTHENTICATION (auth.ts replacement)
// ============================================================================

const COOKIE_NAME = "auth_token"
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const IS_PRODUCTION = process.env.NODE_ENV === "production"

function getSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret || secret.length < 32) {
    const len = secret?.length ?? 0
    throw new Error(
      `JWT_SECRET must be set in TimeSheet/.env (min 32 characters). Current length: ${len}. Add: JWT_SECRET=<your-secret> then restart the dev server. Generate one: openssl rand -hex 32`
    )
  }
  return new TextEncoder().encode(secret)
}

export async function createAuthToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    location: payload.location ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret())
}

export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const sub = payload.sub
    if (!sub || typeof sub !== "string") return null
    const role = payload.role as string
    const validRole = ["admin", "manager", "supervisor", "accounts", "user", "super_admin"].includes(role) ? role : "user"
    return {
      sub,
      email: payload.email as string,
      role: validRole as "admin" | "manager" | "supervisor" | "accounts" | "user" | "super_admin",
      location: (payload.location as string) ?? "",
    }
  } catch {
    return null
  }
}

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, getAuthCookieOptions())
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getAuthFromCookie(): Promise<AuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyAuthToken(token)
}

export function getTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match?.[1]
}

// ============================================================================
// EMPLOYEE AUTHENTICATION (employee-auth.ts replacement)
// ============================================================================
// Employee Authentication (Kiosk - Short Session)
// ============================================================================

const EMPLOYEE_COOKIE = "employee_session"
const EMPLOYEE_MAX_AGE = 60 * 5 // 5 minutes

export async function createEmployeeToken(payload: Omit<EmployeeAuthPayload, "type">): Promise<string> {
  return new SignJWT({
    pin: payload.pin,
    type: "employee",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${EMPLOYEE_MAX_AGE}s`)
    .sign(getSecret())
}

// ============================================================================
// Employee Web Authentication (Long Session)
// ============================================================================

const EMPLOYEE_WEB_COOKIE = "employee_web_session"
const EMPLOYEE_WEB_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function createEmployeeWebToken(payload: Omit<EmployeeAuthPayload, "type">): Promise<string> {
  return new SignJWT({
    pin: payload.pin,
    type: "employee",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${EMPLOYEE_WEB_MAX_AGE}s`)
    .sign(getSecret())
}

export function getEmployeeWebCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: EMPLOYEE_WEB_MAX_AGE,
  }
}

export async function setEmployeeWebCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(EMPLOYEE_WEB_COOKIE, token, getEmployeeWebCookieOptions())
}

export async function clearEmployeeWebCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(EMPLOYEE_WEB_COOKIE)
}

export async function getEmployeeFromWebCookie(): Promise<EmployeeAuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(EMPLOYEE_WEB_COOKIE)?.value
  if (!token) return null
  return verifyEmployeeToken(token)
}

export function getEmployeeWebTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`${EMPLOYEE_WEB_COOKIE}=([^;]+)`))
  return match?.[1]
}

export async function verifyEmployeeToken(token: string): Promise<EmployeeAuthPayload | null> {
  try {
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
    secure: false, // Allow cookies over HTTP for local network access
    sameSite: "lax" as const,
    path: "/",
    maxAge: EMPLOYEE_MAX_AGE,
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
  
  // Check web session first (longer duration)
  const webToken = cookieStore.get(EMPLOYEE_WEB_COOKIE)?.value
  if (webToken) {
    const auth = await verifyEmployeeToken(webToken)
    if (auth) return auth
  }
  
  // Fall back to kiosk session (short duration)
  const token = cookieStore.get(EMPLOYEE_COOKIE)?.value
  if (!token) return null
  return verifyEmployeeToken(token)
}

export function getEmployeeTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`${EMPLOYEE_COOKIE}=([^;]+)`))
  return match?.[1]
}

export async function invalidateEmployeeSession(): Promise<void> {
  await clearEmployeeCookie()
}

// ============================================================================
// DEVICE AUTHENTICATION (device-auth.ts replacement)
// ============================================================================

const DEVICE_COOKIE = "device_token"

export async function createDeviceToken(
  payload: Omit<DeviceAuthPayload, "type">
): Promise<string> {
  return new SignJWT({
    location: payload.location,
    type: "device",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    // No expiration time - device tokens are long-lived
    .sign(getSecret())
}

export async function verifyDeviceToken(
  token: string
): Promise<DeviceAuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.type !== "device") return null
    const sub = payload.sub
    if (!sub || typeof sub !== "string") return null
    return {
      sub,
      location: (payload.location as string) ?? "",
      type: "device",
    }
  } catch {
    return null
  }
}

export function getDeviceCookieOptions() {
  return {
    httpOnly: true,
    secure: false, // Allow cookies over HTTP for local network access
    sameSite: "lax" as const,
    path: "/",
    // No maxAge - cookie persists until manually cleared
  }
}

export async function setDeviceCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(DEVICE_COOKIE, token, getDeviceCookieOptions())
}

export async function clearDeviceCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(DEVICE_COOKIE)
}

export async function getDeviceFromCookie(): Promise<DeviceAuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(DEVICE_COOKIE)?.value
  if (!token) return null
  return verifyDeviceToken(token)
}

export function getDeviceTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`${DEVICE_COOKIE}=([^;]+)`))
  return match?.[1]
}
