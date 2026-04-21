/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Model } from "mongoose"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"

type Filter = Record<string, any> | undefined | null
type Update = Record<string, any>

export type TenantScopeOptions = {
  /**
   * When true, read operations allow global documents where tenantId is null
   * in addition to tenant-specific docs.
   *
   * Intended for "global defaults + tenant overrides" collections (e.g. Awards).
   */
  allowGlobalNullTenantForReads?: boolean
}

function tenantMatch(tenantId: string, options?: TenantScopeOptions) {
  // Super admin in sentinel mode: match nothing (return empty results)
  if (tenantId === SUPER_ADMIN_SENTINEL) {
    return { _id: { $exists: false } } // This will never match any document
  }
  
  if (options?.allowGlobalNullTenantForReads) {
    return { $or: [{ tenantId }, { tenantId: null }] }
  }
  return { tenantId }
}

function andTenant(filter: Filter, tenantId: string, options?: TenantScopeOptions) {
  const t = tenantMatch(tenantId, options)
  if (!filter || Object.keys(filter).length === 0) return t
  // Use $and so a caller cannot "override" tenantId in their filter.
  return { $and: [t, filter] }
}

function injectTenantIdIntoDoc(doc: any, tenantId: string) {
  if (doc && typeof doc === "object") {
    doc.tenantId = tenantId
  }
  return doc
}

/**
 * Wrap a Mongoose model so ALL operations are scoped to a tenant.
 *
 * This is a safety layer: it prevents accidental cross-tenant reads/writes
 * even if an API handler forgets to add tenantId to its query.
 */
export function scope<T = any>(
  model: Model<T>,
  tenantId: string,
  options?: TenantScopeOptions
): any {
  const readScope = (filter: Filter) => andTenant(filter, tenantId, options)
  const writeScope = (filter: Filter) => andTenant(filter, tenantId, {
    ...options,
    allowGlobalNullTenantForReads: false,
  })

  // Intentionally `any`: Mongoose method overloads are complex and vary by model type.
  // This wrapper enforces tenant scoping at runtime; type safety is maintained at call sites.
  return {
    // Reads
    find: (filter?: any, ...rest: any[]) => (model as any).find(readScope(filter), ...rest),
    findOne: (filter?: any, ...rest: any[]) => (model as any).findOne(readScope(filter), ...rest),
    findById: (id: any, ...rest: any[]) =>
      // ensure we don't leak cross-tenant by raw id lookup
      (model as any).findOne(readScope({ _id: id }), ...rest),
    countDocuments: (filter?: any, ...rest: any[]) =>
      (model as any).countDocuments(readScope(filter), ...rest),
    exists: (filter?: any, ...rest: any[]) => (model as any).exists(readScope(filter), ...rest),
    distinct: (field: any, filter?: any, ...rest: any[]) =>
      (model as any).distinct(field, readScope(filter), ...rest),

    // Creates (force tenantId)
    create: (doc: any, ...rest: any[]) => {
      if (Array.isArray(doc)) {
        return (model as any).create(doc.map((d) => injectTenantIdIntoDoc(d, tenantId)), ...rest)
      }
      return (model as any).create(injectTenantIdIntoDoc(doc, tenantId), ...rest)
    },

    // Updates (never allow global/null target)
    updateOne: (filter: any, update: Update, ...rest: any[]) =>
      (model as any).updateOne(writeScope(filter), update, ...rest),
    updateMany: (filter: any, update: Update, ...rest: any[]) =>
      (model as any).updateMany(writeScope(filter), update, ...rest),
    findOneAndUpdate: (filter: any, update: Update, ...rest: any[]) =>
      (model as any).findOneAndUpdate(writeScope(filter), update, ...rest),
    findByIdAndUpdate: (id: any, update: Update, ...rest: any[]) =>
      (model as any).findOneAndUpdate(writeScope({ _id: id }), update, ...rest),

    // Deletes (never allow global/null target)
    deleteOne: (filter: any, ...rest: any[]) => (model as any).deleteOne(writeScope(filter), ...rest),
    deleteMany: (filter: any, ...rest: any[]) =>
      (model as any).deleteMany(writeScope(filter), ...rest),
    findOneAndDelete: (filter: any, ...rest: any[]) =>
      (model as any).findOneAndDelete(writeScope(filter), ...rest),
    findByIdAndDelete: (id: any, ...rest: any[]) =>
      (model as any).findOneAndDelete(writeScope({ _id: id }), ...rest),

    // Aggregation
    aggregate: (pipeline: any[] = [], ...rest: any[]) => {
      const matchStage = { $match: tenantMatch(tenantId, options) }
      const nextPipeline = [matchStage, ...(Array.isArray(pipeline) ? pipeline : [])]
      return (model as any).aggregate(nextPipeline, ...rest)
    },
  } as any
}

