import { connectDB, User } from "./index"

declare global {
  var __adminSetupChecked: boolean | undefined
  var __adminExists: boolean | undefined
}

/**
 * Check if an admin user exists. Uses in-memory cache – DB is queried ONCE per
 * server cold start, then the result is cached. Never checks again until restart.
 */
export async function needsAdminSetup(): Promise<boolean> {
  if (globalThis.__adminSetupChecked && globalThis.__adminExists !== undefined) {
    return !globalThis.__adminExists
  }

  await connectDB()
  const count = await User.countDocuments({ role: "admin" })
  const adminExists = count > 0

  globalThis.__adminSetupChecked = true
  globalThis.__adminExists = adminExists

  return !adminExists
}

/**
 * Update cache after creating admin. Call this from create-admin API so
 * subsequent requests don't hit DB – cache is set to "admin exists".
 */
export function setAdminExistsCache(value: boolean): void {
  globalThis.__adminSetupChecked = true
  globalThis.__adminExists = value
}
