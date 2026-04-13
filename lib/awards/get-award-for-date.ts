import Award from '@/lib/db/schemas/award'
import { AwardVersionHistory } from '@/lib/db/schemas/award-version-history'
import type { IAward } from '@/lib/db/schemas/award'
import type { IAwardVersionHistoryDocument } from '@/lib/db/schemas/award-version-history'

/**
 * Retrieves the correct award version that was effective on a given date.
 * Checks the current Award document first, then falls back to version history.
 */
export async function getAwardForDate(
  awardId: string,
  shiftDate: Date
): Promise<IAward | IAwardVersionHistoryDocument | null> {
  const award = await Award.findById(awardId)
  if (!award) return null

  const isCurrentVersionValid =
    award.effectiveFrom <= shiftDate &&
    (award.effectiveTo == null || award.effectiveTo > shiftDate)

  if (isCurrentVersionValid) {
    return award
  }

  const historicalVersion = await AwardVersionHistory.findOne({
    baseAwardId: awardId,
    effectiveFrom: { $lte: shiftDate },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gt: shiftDate } }
    ]
  }).sort({ effectiveFrom: -1 })

  return historicalVersion
}

/**
 * Returns all versions of an award (current + historical), ordered newest first.
 */
export async function getAwardHistory(awardId: string) {
  const award = await Award.findById(awardId).lean()
  if (!award) return []

  const history = await AwardVersionHistory.find({ baseAwardId: awardId })
    .sort({ effectiveFrom: -1 })
    .lean()

  const currentEntry = {
    _id: award._id,
    baseAwardId: award._id,
    name: award.name,
    description: award.description,
    rules: award.rules,
    levelRates: award.levelRates,
    availableTags: award.availableTags,
    version: award.version,
    effectiveFrom: award.effectiveFrom,
    effectiveTo: award.effectiveTo ?? null,
    changelog: award.changelog,
    createdBy: award.createdBy,
    createdAt: award.createdAt,
    isCurrent: true as const,
  }

  const historyEntries = history.map((h: any) => ({
    ...h,
    isCurrent: false as const,
  }))

  return [currentEntry, ...historyEntries]
}

/**
 * Returns a specific version by version string.
 * Checks current Award first, then falls back to version history.
 */
export async function getAwardVersion(awardId: string, version: string) {
  const award = await Award.findById(awardId).lean()
  if (!award) return null

  if (award.version === version) {
    return { ...award, isCurrent: true }
  }

  const historicalVersion = await AwardVersionHistory.findOne({
    baseAwardId: awardId,
    version,
  }).lean()

  if (!historicalVersion) return null

  return { ...historicalVersion, isCurrent: false }
}
