import type { TenantContext } from "@/shared/types"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"
import { toObjectId } from "./mongo-ids"

/** Mongo filter fragment: tenant-scoped, or unrestricted for super-admin sentinel. */
export function tenantIdMatch(ctx: TenantContext): Record<string, unknown> {
  if (ctx.tenantId === SUPER_ADMIN_SENTINEL) return {}
  return { tenantId: toObjectId(ctx.tenantId) }
}
