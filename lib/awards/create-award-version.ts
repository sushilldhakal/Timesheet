import Award from '@/lib/db/schemas/award'
import { AwardVersionHistory } from '@/lib/db/schemas/award-version-history'
import type { IAward, IAwardRule, IAwardLevelRate, IAwardTag } from '@/lib/db/schemas/award'

export function incrementVersion(currentVersion: string, bump: 'major' | 'minor' | 'patch' = 'minor'): string {
  const parts = currentVersion.split('.').map(Number)
  const major = parts[0] ?? 1
  const minor = parts[1] ?? 0
  const patch = parts[2] ?? 0

  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
  }
}

export async function createNewAwardVersion(
  existingAward: IAward,
  updates: {
    rules?: IAwardRule[]
    levelRates?: IAwardLevelRate[]
    availableTags?: IAwardTag[]
    name?: string
    description?: string
  },
  metadata: {
    changelog: string
    effectiveFrom: Date
    userId?: string
    versionBump?: 'major' | 'minor' | 'patch'
  }
): Promise<IAward> {
  const newVersion = incrementVersion(
    existingAward.version,
    metadata.versionBump ?? 'minor'
  )

  await AwardVersionHistory.create({
    tenantId: (existingAward as any).tenantId ?? undefined,
    baseAwardId: existingAward._id,
    name: existingAward.name,
    description: existingAward.description,
    rules: existingAward.rules,
    levelRates: existingAward.levelRates,
    availableTags: existingAward.availableTags,
    version: existingAward.version,
    effectiveFrom: existingAward.effectiveFrom,
    effectiveTo: metadata.effectiveFrom,
    changelog: existingAward.changelog,
    createdBy: metadata.userId ?? existingAward.createdBy,
  })

  const updatePayload: Record<string, any> = {
    version: newVersion,
    effectiveFrom: metadata.effectiveFrom,
    effectiveTo: null,
    changelog: metadata.changelog,
  }

  if (metadata.userId) {
    updatePayload.updatedBy = metadata.userId
  }

  if (updates.rules !== undefined) updatePayload.rules = updates.rules
  if (updates.levelRates !== undefined) updatePayload.levelRates = updates.levelRates
  if (updates.availableTags !== undefined) updatePayload.availableTags = updates.availableTags
  if (updates.name !== undefined) updatePayload.name = updates.name
  if (updates.description !== undefined) updatePayload.description = updates.description

  const updatedAward = await Award.findByIdAndUpdate(
    existingAward._id,
    updatePayload,
    { new: true, runValidators: true }
  )

  if (!updatedAward) {
    throw new Error('Failed to update award - award not found')
  }

  return updatedAward
}
