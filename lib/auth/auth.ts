import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const COOKIE_NAME = "auth_token"
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const IS_PRODUCTION = process.env.NODE_ENV === "production"

export type AuthPayload = {
  sub: string // userId
  username: string
  role: "admin" | "user" | "super_admin"
  location?: string
}

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
    username: payload.username,
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
    const validRole = ["admin", "user", "super_admin"].includes(role) ? role : "user"
    return {
      sub,
      username: payload.username as string,
      role: validRole as "admin" | "user" | "super_admin",
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

/** For middleware (Edge) – reads cookie from request */
export function getTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match?.[1]
}
