import { getAuthFromCookie } from "./auth"

/**
 * Use in API route handlers to require auth. Returns the auth payload or null.
 * Call this at the start of protected API routes.
 */
export async function requireAuth() {
  return getAuthFromCookie()
}

/**
 * Require a specific role. Returns auth or throws/returns null.
 */
export async function requireRole(
  allowedRoles: ("admin" | "user")[]
): Promise<Awaited<ReturnType<typeof getAuthFromCookie>>> {
  const auth = await getAuthFromCookie()
  if (!auth) return null
  if (!allowedRoles.includes(auth.role)) return null
  return auth
}
