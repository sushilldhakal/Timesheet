import { NextRequest } from "next/server"
import { apiKeyService } from "@/lib/services/api-keys/api-key-service"
import { IApiKey, ApiScope } from "@/lib/db/schemas/api-key"

export interface ApiKeyContext {
  type: "api_key"
  tenantId: string
  keyId: string
  scopes: ApiScope[]
  record: IApiKey
}

/**
 * Check for Bearer token in Authorization header.
 * If present, validate as API key and return context.
 * Returns null if no Bearer token or if the key is invalid.
 *
 * Usage in API routes:
 *   const apiCtx = await getApiKeyContext(req)
 *   if (apiCtx) { ... } // machine-to-machine auth
 */
export async function getApiKeyContext(req: NextRequest): Promise<ApiKeyContext | null> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const rawKey = authHeader.slice(7).trim()
  if (!rawKey) return null

  const record = await apiKeyService.validate(rawKey)
  if (!record) return null

  return {
    type: "api_key",
    tenantId: record.tenantId.toString(),
    keyId: (record as any)._id?.toString() ?? "",
    scopes: record.scopes,
    record,
  }
}

/**
 * Check if an API key context has a required scope.
 */
export function hasScope(ctx: ApiKeyContext, scope: ApiScope): boolean {
  return ctx.scopes.includes(scope)
}
