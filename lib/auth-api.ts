import { getAuthFromCookie, type AuthPayload } from "./auth"
import { connectDB, User } from "./db"

export type AuthWithLocations = {
  auth: AuthPayload
  /** null = admin, sees all. string[] = user's locations, filter employees to these. */
  userLocations: string[] | null
}

/**
 * Returns auth + user's location array for filtering employees.
 * Admin: userLocations = null (no filter, see all employees).
 * User: userLocations = User.location array; filter employees to those assigned to these locations.
 */
export async function getAuthWithUserLocations(): Promise<AuthWithLocations | null> {
  const auth = await getAuthFromCookie()
  if (!auth) return null

  if (auth.role === "admin" || auth.role === "super_admin") {
    return { auth, userLocations: null }
  }

  try {
    await connectDB()
    const user = await User.findById(auth.sub).select("location").lean()
    const locs = user?.location
    const userLocations: string[] = Array.isArray(locs)
      ? locs.map((x) => String(x).trim()).filter(Boolean)
      : locs != null && String(locs).trim() !== ""
        ? [String(locs).trim()]
        : []
    return { auth, userLocations }
  } catch {
    return { auth, userLocations: [] }
  }
}

/**
 * Build employee location filter for non-admin users.
 * Returns a MongoDB query condition to add to $and, or {} if no filter.
 */
export function employeeLocationFilter(userLocations: string[] | null): Record<string, unknown> {
  if (!userLocations || userLocations.length === 0) return {}
  return {
    $or: [
      { location: { $in: userLocations } },
      { site: { $in: userLocations } },
    ],
  }
}
