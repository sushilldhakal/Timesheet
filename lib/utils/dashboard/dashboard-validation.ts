import { LocationRoleEnablement } from '@/lib/db'

/**
 * Validates if a location-role pairing is currently enabled
 */
export async function validateLocationRolePairing(
  locationId: string,
  roleId: string,
  effectiveDate: Date = new Date()
): Promise<boolean> {
  const enablement = await LocationRoleEnablement.findOne({
    locationId,
    roleId,
    effectiveFrom: { $lte: effectiveDate },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: effectiveDate } }
    ]
  }).lean()
  
  return !!enablement
}

/**
 * Gets all enabled role IDs for a location
 */
export async function getEnabledRolesForLocation(
  locationId: string,
  effectiveDate: Date = new Date()
): Promise<string[]> {
  const enablements = await LocationRoleEnablement.find({
    locationId,
    effectiveFrom: { $lte: effectiveDate },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: effectiveDate } }
    ]
  }).select('roleId').lean()
  
  return enablements.map(e => String(e.roleId))
}

/**
 * Gets all enabled location IDs for a role
 */
export async function getEnabledLocationsForRole(
  roleId: string,
  effectiveDate: Date = new Date()
): Promise<string[]> {
  const enablements = await LocationRoleEnablement.find({
    roleId,
    effectiveFrom: { $lte: effectiveDate },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: effectiveDate } }
    ]
  }).select('locationId').lean()
  
  return enablements.map(e => String(e.locationId))
}

/**
 * Validates multiple location-role pairs in batch
 */
export async function validateLocationRolePairs(
  pairs: Array<{ locationId: string; roleId: string }>,
  effectiveDate: Date = new Date()
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()
  
  if (pairs.length === 0) return result
  
  // Build query for all pairs
  const orConditions = pairs.map(pair => ({
    locationId: pair.locationId,
    roleId: pair.roleId,
  }))
  
  const enablements = await LocationRoleEnablement.find({
    $and: [
      { $or: orConditions },
      { effectiveFrom: { $lte: effectiveDate } },
      {
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gte: effectiveDate } }
        ]
      }
    ]
  }).lean()
  
  // Build result map
  const enabledPairs = new Set(
    enablements.map(e => `${e.locationId}:${e.roleId}`)
  )
  
  for (const pair of pairs) {
    const key = `${pair.locationId}:${pair.roleId}`
    result.set(key, enabledPairs.has(key))
  }
  
  return result
}
