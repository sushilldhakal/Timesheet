import { connectDB } from "@/lib/db"
import { isLikelyObjectIdString } from "@/shared/ids"

/**
 * Resolve a locationId that may be either a Mongo ObjectId string or a location name string.
 * Returns the ObjectId string, or null if not found.
 *
 * This is needed because user.location[] stores legacy location names (strings),
 * while DB queries expect ObjectId references.
 */
export async function resolveLocationId(value: string): Promise<string | null> {
  if (!value) return null

  // Already a valid ObjectId — use as-is
  if (isLikelyObjectIdString(value)) return value

  // Treat as a name — look it up
  await connectDB()
  const { Location } = await import("@/lib/db")
  const loc = await (Location as any).findOne({ name: value }).select("_id").lean()
  return loc ? (loc as any)._id.toString() : null
}
