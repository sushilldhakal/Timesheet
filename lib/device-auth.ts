import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const DEVICE_COOKIE = "device_token"
const IS_PRODUCTION = process.env.NODE_ENV === "production"

export type DeviceAuthPayload = {
  sub: string // deviceId
  location: string // device location name
  type: "device"
}

function getSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET required for device auth")
  }
  return new TextEncoder().encode(secret)
}

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
    // jwtVerify performs constant-time comparison for signature verification
    // This prevents timing attacks on token validation (Requirement 6.7)
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
    secure: IS_PRODUCTION,
    sameSite: "strict" as const,
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

/** For middleware (Edge) – reads device cookie from request */
export function getDeviceTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`${DEVICE_COOKIE}=([^;]+)`))
  return match?.[1]
}
