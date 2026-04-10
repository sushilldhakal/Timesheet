import mongoose from "mongoose"
import type { AuthWithLocations } from "./auth-api"
import { Location, Role } from "@/lib/db"

export type ScopeCheckResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

/** Non-admin users must belong to the location (by name match). */
export async function assertUserLocationAccess(
  ctx: AuthWithLocations,
  locationId: string
): Promise<ScopeCheckResult> {
  if (ctx.auth.role === "admin" || ctx.auth.role === "super_admin") {
    return { ok: true }
  }
  if (ctx.userLocations === null) {
    return { ok: true }
  }

  const loc = await Location.findById(new mongoose.Types.ObjectId(locationId)).lean()
  if (!loc) {
    return { ok: false, status: 404, error: "Location not found" }
  }

  const allowedNames = new Set((ctx.userLocations ?? []).map((n) => String(n).trim()))
  if (!allowedNames.has(String(loc.name).trim())) {
    return { ok: false, status: 403, error: "Not allowed for this location" }
  }

  return { ok: true }
}

/**
 * Ensures a non-admin user may only act on their assigned location(s) and managed roles.
 * Admin / super_admin: always allowed.
 */
export async function assertManagerSchedulingScope(
  ctx: AuthWithLocations,
  locationId: string,
  managedRoleIds: string[]
): Promise<ScopeCheckResult> {
  if (ctx.auth.role === "admin" || ctx.auth.role === "super_admin") {
    return { ok: true }
  }

  if (ctx.userLocations === null) {
    return { ok: true }
  }

  const loc = await Location.findById(new mongoose.Types.ObjectId(locationId)).lean()
  if (!loc) {
    return { ok: false, status: 404, error: "Location not found" }
  }

  const allowedNames = new Set((ctx.userLocations ?? []).map((n) => String(n).trim()))
  if (!allowedNames.has(String(loc.name).trim())) {
    return { ok: false, status: 403, error: "Not allowed for this location" }
  }

  if (!ctx.managedRoles || ctx.managedRoles.length === 0) {
    return { ok: true }
  }

  if (managedRoleIds.length === 0) {
    return { ok: false, status: 400, error: "managedRoles is required for your account" }
  }

  const roles = await Role.find({
    _id: { $in: managedRoleIds.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select("name")
    .lean()

  const allowedRoleNames = new Set(ctx.managedRoles.map((r) => String(r).trim()))
  for (const r of roles) {
    if (!allowedRoleNames.has(String(r.name).trim())) {
      return { ok: false, status: 403, error: "Not allowed for one or more roles" }
    }
  }

  return { ok: true }
}
