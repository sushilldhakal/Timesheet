import type { ILocationRepository } from "@/contracts/repositories/ILocationRepository"
import type { LocationDTO } from "@/contracts/dtos/location"
import type { EntityId, PaginatedResult, TenantContext } from "@/shared/types"
import { connectDB } from "@/lib/db"
import { Location } from "@/lib/db/schemas/location"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"
import { toObjectId } from "./mongo-ids"
import { tenantIdMatch } from "./tenant-query"

function mapLocation(doc: Record<string, unknown>): LocationDTO {
  return {
    id: String(doc._id),
    name: String(doc.name ?? ""),
    address: typeof doc.address === "string" ? doc.address : undefined,
    lat: typeof doc.lat === "number" ? doc.lat : undefined,
    lng: typeof doc.lng === "number" ? doc.lng : undefined,
    radius: typeof doc.radius === "number" ? doc.radius : undefined,
    geofenceMode: typeof doc.geofenceMode === "string" ? doc.geofenceMode : undefined,
    openingHour: typeof doc.openingHour === "number" ? doc.openingHour : undefined,
    closingHour: typeof doc.closingHour === "number" ? doc.closingHour : undefined,
    workingDays: Array.isArray(doc.workingDays) ? (doc.workingDays as unknown[]) : undefined,
    country: typeof doc.country === "string" ? doc.country : undefined,
    color: typeof doc.color === "string" ? doc.color : undefined,
  }
}

function parseListFilters(filters: unknown): { page: number; limit: number; search?: string } {
  const f = filters as Record<string, unknown> | null | undefined
  const page = typeof f?.page === "number" && f.page >= 1 ? f.page : 1
  const limit = typeof f?.limit === "number" && f.limit >= 1 ? Math.min(f.limit, 500) : 50
  const search = typeof f?.search === "string" ? f.search.trim() : undefined
  return { page, limit, search }
}

export class MongoLocationRepository implements ILocationRepository {
  async findById(ctx: TenantContext, id: EntityId): Promise<LocationDTO | null> {
    await connectDB()
    const doc = await Location.findOne({ _id: id, ...tenantIdMatch(ctx) }).lean()
    if (!doc) return null
    return mapLocation(doc as Record<string, unknown>)
  }

  async findMany(ctx: TenantContext, filters: unknown): Promise<PaginatedResult<LocationDTO>> {
    await connectDB()
    const { page, limit, search } = parseListFilters(filters)
    const q: Record<string, unknown> = { ...tenantIdMatch(ctx), isActive: { $ne: false } }
    if (search) q.name = { $regex: search, $options: "i" }
    const skip = (page - 1) * limit
    const [rows, total] = await Promise.all([
      Location.find(q).sort({ order: 1, name: 1 }).skip(skip).limit(limit).lean(),
      Location.countDocuments(q),
    ])
    return { data: rows.map((r) => mapLocation(r as Record<string, unknown>)), total, page }
  }

  async create(ctx: TenantContext, data: unknown): Promise<LocationDTO> {
    await connectDB()
    const d = data as Record<string, unknown>
    const tenantStr = ctx.tenantId === SUPER_ADMIN_SENTINEL ? String(d.tenantId ?? "") : ctx.tenantId
    if (!tenantStr) throw new Error("tenantId required")
    const doc = await Location.create({
      tenantId: toObjectId(tenantStr),
      name: String(d.name ?? "").trim(),
      address: typeof d.address === "string" ? d.address : undefined,
      country: (d.country as "AU" | "NZ" | "IN" | "NP" | undefined) ?? "AU",
      lat: typeof d.lat === "number" ? d.lat : undefined,
      lng: typeof d.lng === "number" ? d.lng : undefined,
      radius: typeof d.radius === "number" ? d.radius : 100,
      geofenceMode: (d.geofenceMode as "hard" | "soft" | undefined) ?? undefined,
      isActive: d.isActive !== false,
    })
    const lean = await Location.findById(doc._id).lean()
    return mapLocation(lean as Record<string, unknown>)
  }

  async update(ctx: TenantContext, id: EntityId, data: unknown): Promise<LocationDTO | null> {
    await connectDB()
    const d = data as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    if (d.name !== undefined) patch.name = String(d.name).trim()
    if (d.address !== undefined) patch.address = d.address
    if (d.country !== undefined) patch.country = d.country
    if (d.lat !== undefined) patch.lat = d.lat
    if (d.lng !== undefined) patch.lng = d.lng
    if (d.radius !== undefined) patch.radius = d.radius
    if (d.geofenceMode !== undefined) patch.geofenceMode = d.geofenceMode
    if (d.isActive !== undefined) patch.isActive = d.isActive
    const updated = await Location.findOneAndUpdate({ _id: id, ...tenantIdMatch(ctx) }, { $set: patch }, { new: true }).lean()
    if (!updated) return null
    return mapLocation(updated as Record<string, unknown>)
  }

  async delete(ctx: TenantContext, id: EntityId): Promise<boolean> {
    await connectDB()
    const res = await Location.updateOne({ _id: id, ...tenantIdMatch(ctx) }, { $set: { isActive: false } })
    return res.modifiedCount === 1
  }
}
