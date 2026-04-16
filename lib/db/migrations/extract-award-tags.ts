import mongoose from "mongoose"
import { connectDB } from "../index"
import Award from "../schemas/award"
import { Employer } from "../schemas/employer"
import AwardTag from "../schemas/award-tag"

type LegacyEmbeddedTag = { name?: string } | string

function normalizeTagSet(names: string[]): string[] {
  return Array.from(new Set(names.map((n) => n.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function normalizeTagName(input: unknown): string | null {
  if (typeof input === "string") {
    const t = input.trim()
    return t.length ? t : null
  }
  if (input && typeof input === "object" && "name" in (input as any)) {
    const name = (input as any).name
    if (typeof name === "string") {
      const t = name.trim()
      return t.length ? t : null
    }
  }
  return null
}

async function resolveTenantIdForAward(awardId: mongoose.Types.ObjectId) {
  const employer = await (Employer as any).findOne({ defaultAwardId: awardId }).select({ _id: 1 }).lean()
  if (employer?._id) return employer._id as mongoose.Types.ObjectId

  const employers = await (Employer as any).find({}).select({ _id: 1 }).limit(2).lean()
  if (employers.length === 1) return employers[0]._id as mongoose.Types.ObjectId
  return null
}

async function run() {
  await connectDB()

  const awards = await (Award as any)
    .find({})
    .select({ _id: 1, name: 1, availableTags: 1, awardTagIds: 1 })
    .lean()

  let processed = 0
  let updated = 0
  let skipped = 0
  let tagCreated = 0
  let tagReused = 0
  let checksumFailed = 0

  for (const award of awards) {
    processed++

    const legacyTags: LegacyEmbeddedTag[] = Array.isArray(award.availableTags) ? award.availableTags : []
    const tagNames = normalizeTagSet(
      legacyTags.map(normalizeTagName).filter((t): t is string => Boolean(t))
    )

    if (tagNames.length === 0) continue

    const tenantId = await resolveTenantIdForAward(award._id)
    if (!tenantId) {
      skipped++
      // eslint-disable-next-line no-console
      console.warn(
        `[extract-award-tags] Skipping award "${award.name ?? award._id}" – cannot resolve tenantId (no defaultAwardId match and multiple employers).`
      )
      continue
    }

    const awardTagIds: mongoose.Types.ObjectId[] = []
    for (const name of tagNames) {
      const existing = await (AwardTag as any).findOne({ tenantId, name }).select({ _id: 1 }).lean()
      if (existing?._id) {
        tagReused++
        awardTagIds.push(existing._id)
        continue
      }

      tagCreated++
      const doc = await (AwardTag as any).create({
        tenantId,
        organizationId: String(tenantId),
        name,
        isActive: true,
      })
      awardTagIds.push(doc._id)
    }

    const existingIds: string[] = Array.isArray(award.awardTagIds)
      ? award.awardTagIds.map((id: any) => String(id))
      : []
    const mergedIds = Array.from(new Set([...existingIds, ...awardTagIds.map((id) => String(id))])).map(
      (id) => new mongoose.Types.ObjectId(id)
    )

    const res = await (Award as any).updateOne(
      { _id: award._id },
      {
        $set: { awardTagIds: mergedIds },
      }
    )

    if (res.modifiedCount) updated++

    // Verify: all legacy names are present in referenced tags after merge.
    const mergedDocs = await (AwardTag as any)
      .find({ _id: { $in: mergedIds } })
      .select({ name: 1 })
      .lean()
    const mergedNames = normalizeTagSet(mergedDocs.map((d: any) => String(d.name ?? "")))
    const missing = tagNames.filter((n) => !mergedNames.includes(n))
    if (missing.length) {
      checksumFailed++
      // eslint-disable-next-line no-console
      console.error(
        `[extract-award-tags] checksum failed for award "${award.name ?? award._id}" missing=[${missing.join(", ")}]`
      )
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[extract-award-tags] processed=${processed} updated=${updated} skipped=${skipped} tagCreated=${tagCreated} tagReused=${tagReused} checksumFailed=${checksumFailed} (idempotent; safe to re-run)`
  )

  if (checksumFailed > 0) process.exit(2)
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[extract-award-tags] failed", err)
    process.exit(1)
  })

