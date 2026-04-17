import { getTenantContext, TenantContext } from "@/lib/auth/tenant-context"
import { getApiKeyContext } from "@/lib/auth/api-key-middleware"
import { NextRequest } from "next/server"

/**
 * Resolve a TenantContext from either a JWT cookie (human users)
 * or a Bearer API key (machine-to-machine).
 *
 * Usage in API routes:
 *   const ctx = await resolveTenantContext(req)
 *   if (!ctx || ctx.type !== "full") return { status: 401, data: { error: "Unauthorized" } }
 */
export async function resolveTenantContext(req: NextRequest): Promise<TenantContext> {
  // 1. Try JWT cookie first (standard human user auth)
  const jwtCtx = await getTenantContext()
  if (jwtCtx) return jwtCtx

  // 2. Fall back to Bearer API key
  const apiCtx = await getApiKeyContext(req)
  if (!apiCtx) return null

  // Map ApiKeyContext → TenantContext shape
  return {
    type: "full",
    sub: apiCtx.keyId,
    email: "",
    role: "api_key",
    tenantId: apiCtx.tenantId,
    locations: [],
    managedRoles: [],
  }
}
