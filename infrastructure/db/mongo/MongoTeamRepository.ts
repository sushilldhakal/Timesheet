import type { ITeamRepository } from "@/contracts/repositories/ITeamRepository"
import type { TeamDTO } from "@/contracts/dtos/team"
import type { EntityId, PaginatedResult, TenantContext } from "@/shared/types"
import { connectDB } from "@/lib/db"
import { Team } from "@/lib/db/schemas/team"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"
import { toObjectId } from "./mongo-ids"
import { tenantIdMatch } from "./tenant-query"

function mapTeam(doc: Record<string, unknown>): TeamDTO {
  return {
    id: String(doc._id),
    name: String(doc.name ?? ""),
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

export class MongoTeamRepository implements ITeamRepository {
  async findById(ctx: TenantContext, id: EntityId): Promise<TeamDTO | null> {
    await connectDB()
    const doc = await Team.findOne({ _id: id, ...tenantIdMatch(ctx) }).lean()
    if (!doc) return null
    return mapTeam(doc as Record<string, unknown>)
  }

  async findMany(ctx: TenantContext, filters: unknown): Promise<PaginatedResult<TeamDTO>> {
    await connectDB()
    const { page, limit, search } = parseListFilters(filters)
    const q: Record<string, unknown> = { ...tenantIdMatch(ctx), isActive: { $ne: false } }
    if (search) q.name = { $regex: search, $options: "i" }
    const skip = (page - 1) * limit
    const [rows, total] = await Promise.all([
      Team.find(q).sort({ order: 1, name: 1 }).skip(skip).limit(limit).lean(),
      Team.countDocuments(q),
    ])
    return { data: rows.map((r) => mapTeam(r as Record<string, unknown>)), total, page }
  }

  async create(ctx: TenantContext, data: unknown): Promise<TeamDTO> {
    await connectDB()
    const d = data as Record<string, unknown>
    const tenantStr = ctx.tenantId === SUPER_ADMIN_SENTINEL ? String(d.tenantId ?? "") : ctx.tenantId
    if (!tenantStr) throw new Error("tenantId required")
    const doc = await Team.create({
      tenantId: toObjectId(tenantStr),
      name: String(d.name ?? "").trim(),
      code: typeof d.code === "string" ? d.code : undefined,
      color: typeof d.color === "string" ? d.color : undefined,
      isActive: d.isActive !== false,
    })
    const lean = await Team.findById(doc._id).lean()
    return mapTeam(lean as Record<string, unknown>)
  }

  async update(ctx: TenantContext, id: EntityId, data: unknown): Promise<TeamDTO | null> {
    await connectDB()
    const d = data as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    if (d.name !== undefined) patch.name = String(d.name).trim()
    if (d.code !== undefined) patch.code = d.code
    if (d.color !== undefined) patch.color = d.color
    if (d.isActive !== undefined) patch.isActive = d.isActive
    const updated = await Team.findOneAndUpdate({ _id: id, ...tenantIdMatch(ctx) }, { $set: patch }, { new: true }).lean()
    if (!updated) return null
    return mapTeam(updated as Record<string, unknown>)
  }

  async delete(ctx: TenantContext, id: EntityId): Promise<boolean> {
    await connectDB()
    const res = await Team.updateOne({ _id: id, ...tenantIdMatch(ctx) }, { $set: { isActive: false } })
    return res.modifiedCount === 1
  }
}
