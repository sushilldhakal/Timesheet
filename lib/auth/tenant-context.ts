import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const AUTH_COOKIE = "auth_token"
const PREAUTH_COOKIE = "preauth_token"

const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days
const PREAUTH_MAX_AGE_SECONDS = 60 * 10 // 10 minutes
const IS_PRODUCTION = process.env.NODE_ENV === "production"

export type FullAuthJwtClaims = {
  email: string
  name?: string
  role: string
  tenantId: string
  /** Legacy single-location string (kept for compatibility) */
  location?: string
  /** New multi-location claim */
  locations: string[]
  managedRoles: string[]
}

export type PreAuthJwtClaims = {
  email: string
  name?: string
  preauth: true
}

export type TenantContext =
  | ({
      type: "full"
      sub: string
    } & FullAuthJwtClaims)
  | ({
      type: "preauth"
      sub: string
    } & PreAuthJwtClaims)
  | null

let _cachedSecret: Uint8Array | null = null
function getSecret(): Uint8Array {
  if (_cachedSecret) return _cachedSecret
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret || secret.length < 32) {
    const len = secret?.length ?? 0
    throw new Error(
      `JWT_SECRET must be set in TimeSheet/.env (min 32 characters). Current length: ${len}.`
    )
  }
  _cachedSecret = new TextEncoder().encode(secret)
  return _cachedSecret
}

function getCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  }
}

export async function createFullAuthToken(args: {
  sub: string
  email: string
  name?: string
  tenantId: string
  role: string
  locations: string[]
  managedRoles: string[]
}): Promise<string> {
  const locations = Array.isArray(args.locations) ? args.locations.filter(Boolean) : []
  const managedRoles = Array.isArray(args.managedRoles) ? args.managedRoles.filter(Boolean) : []

  return new SignJWT({
    email: args.email,
    name: args.name ?? "",
    role: args.role,
    tenantId: args.tenantId,
    // legacy + new claim
    location: locations[0] ?? "",
    locations,
    managedRoles,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(args.sub)
    .setIssuedAt()
    .setExpirationTime(`${AUTH_MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

export async function createPreAuthToken(args: {
  sub: string
  email: string
  name?: string
}): Promise<string> {
  return new SignJWT({
    email: args.email,
    name: args.name ?? "",
    preauth: true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(args.sub)
    .setIssuedAt()
    .setExpirationTime(`${PREAUTH_MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

export async function setPreAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(PREAUTH_COOKIE, token, getCookieOptions(PREAUTH_MAX_AGE_SECONDS))
}

export async function clearPreAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(PREAUTH_COOKIE)
}

export async function getPreAuthFromCookie(): Promise<TenantContext> {
  const cookieStore = await cookies()
  const token = cookieStore.get(PREAUTH_COOKIE)?.value
  if (!token) return null
  return verifyTenantContextToken(token, "preauth")
}

export async function getTenantContext(): Promise<TenantContext> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token) return null
  return verifyTenantContextToken(token, "full")
}

async function verifyTenantContextToken(token: string, expected: "full" | "preauth"): Promise<TenantContext> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const sub = payload.sub
    if (!sub || typeof sub !== "string") return null

    if (expected === "preauth") {
      if ((payload as any).preauth !== true) return null
      return {
        type: "preauth",
        sub,
        email: String(payload.email ?? ""),
        name: typeof (payload as any).name === "string" && String((payload as any).name).trim()
          ? String((payload as any).name)
          : undefined,
        preauth: true,
      }
    }

    // full
    const tenantId = typeof (payload as any).tenantId === "string" ? String((payload as any).tenantId) : ""
    // Allow sentinel tenantId for super admin
    if (!tenantId) return null
    const locations = Array.isArray((payload as any).locations)
      ? ((payload as any).locations as any[]).map(String).filter(Boolean)
      : []
    const managedRoles = Array.isArray((payload as any).managedRoles)
      ? ((payload as any).managedRoles as any[]).map(String).filter(Boolean)
      : []

    return {
      type: "full",
      sub,
      email: String(payload.email ?? ""),
      name: typeof (payload as any).name === "string" && String((payload as any).name).trim()
        ? String((payload as any).name)
        : undefined,
      role: String((payload as any).role ?? "user"),
      tenantId,
      location: typeof (payload as any).location === "string" ? String((payload as any).location) : undefined,
      locations,
      managedRoles,
    }
  } catch {
    return null
  }
}
