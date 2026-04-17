import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { TenantContext } from "@/lib/auth/tenant-context"
import { ApiKey, IApiKey, ApiScope } from "@/lib/db/schemas/api-key"
import { createHash, randomBytes } from "crypto"

export class ApiKeyService {
  /**
   * Generate a new API key. Returns the plaintext key ONCE (never stored).
   * Format: ts_live_{tenantSlug}_{random32}
   */
  async create(
    ctx: TenantContext,
    params: { name: string; scopes: ApiScope[]; expiresAt?: Date }
  ): Promise<{ key: string; record: IApiKey }> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    // Generate a cryptographically secure random key
    const randomPart = randomBytes(24).toString("hex") // 48 hex chars
    const tenantSlug = ctx.tenantId.slice(-8) // last 8 chars of tenantId
    const plainKey = `ts_live_${tenantSlug}_${randomPart}`

    // Hash the key for storage (SHA-256)
    const keyHash = createHash("sha256").update(plainKey).digest("hex")
    const keyPrefix = plainKey.slice(0, 16) // first 16 chars for display

    const record = await scope(ApiKey, ctx.tenantId).create({
      tenantId: ctx.tenantId,
      name: params.name,
      keyHash,
      keyPrefix,
      scopes: params.scopes,
      isActive: true,
      createdBy: ctx.sub,
      expiresAt: params.expiresAt,
      rateLimit: 60,
    })

    return { key: plainKey, record: record.toObject() }
  }

  /**
   * Validate an API key from a request header.
   * Returns the ApiKey record if valid, null if not.
   */
  async validate(rawKey: string): Promise<IApiKey | null> {
    await connectDB()

    const keyHash = createHash("sha256").update(rawKey).digest("hex")

    const record = await ApiKey.findOne({
      keyHash,
      isActive: true,
    }).lean()

    if (!record) return null

    // Check expiry
    if (record.expiresAt && record.expiresAt < new Date()) {
      return null
    }

    // Update lastUsedAt (fire and forget)
    ApiKey.findOneAndUpdate({ _id: (record as any)._id }, { $set: { lastUsedAt: new Date() } }).catch(
      () => {}
    )

    return record as IApiKey
  }

  /**
   * Revoke an API key.
   */
  async revoke(ctx: TenantContext, keyId: string): Promise<void> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    await scope(ApiKey, ctx.tenantId).findOneAndUpdate(
      { _id: keyId },
      { $set: { isActive: false } }
    )
  }

  /**
   * List all API keys for a tenant (without exposing hashes).
   */
  async list(ctx: TenantContext): Promise<Omit<IApiKey, "keyHash">[]> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    const keys = await scope(ApiKey, ctx.tenantId)
      .find({ isActive: true })
      .select("-keyHash")
      .lean()

    return keys as Omit<IApiKey, "keyHash">[]
  }
}

export const apiKeyService = new ApiKeyService()
