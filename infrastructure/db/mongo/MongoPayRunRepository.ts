import type { IPayRunRepository } from "@/contracts/repositories/IPayRunRepository"
import type { PayRunDTO } from "@/contracts/dtos/payrun"
import type { EntityId, PaginatedResult, TenantContext } from "@/shared/types"
import { connectDB } from "@/lib/db"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"
import { toObjectId } from "./mongo-ids"
import { tenantIdMatch } from "./tenant-query"

function iso(d: unknown): string | undefined {
  if (d instanceof Date) return d.toISOString()
  if (typeof d === "string" && d) return d
  return undefined
}

function mapPayRun(doc: Record<string, unknown>): PayRunDTO {
  const start = iso(doc.startDate)
  const end = iso(doc.endDate)
  return {
    id: String(doc._id),
    status: typeof doc.status === "string" ? doc.status : undefined,
    startDate: start,
    endDate: end,
    payPeriodStart: start,
    payPeriodEnd: end,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  }
}

function parseListFilters(filters: unknown): { page: number; limit: number; status?: string } {
  const f = filters as Record<string, unknown> | null | undefined
  const page = typeof f?.page === "number" && f.page >= 1 ? f.page : 1
  const limit = typeof f?.limit === "number" && f.limit >= 1 ? Math.min(f.limit, 200) : 20
  const status = typeof f?.status === "string" ? f.status : undefined
  return { page, limit, status }
}

const defaultTotals = {
  gross: 0,
  tax: 0,
  super: 0,
  net: 0,
  totalHours: 0,
  employeeCount: 0,
}

export class MongoPayRunRepository implements IPayRunRepository {
  async findById(ctx: TenantContext, id: EntityId): Promise<PayRunDTO | null> {
    await connectDB()
    const doc = await PayRun.findOne({ _id: id, ...tenantIdMatch(ctx) }).lean()
    if (!doc) return null
    return mapPayRun(doc as Record<string, unknown>)
  }

  async findMany(ctx: TenantContext, filters: unknown): Promise<PaginatedResult<PayRunDTO>> {
    await connectDB()
    const { page, limit, status } = parseListFilters(filters)
    const q: Record<string, unknown> = { ...tenantIdMatch(ctx) }
    if (status) q.status = status
    const skip = (page - 1) * limit
    const [rows, total] = await Promise.all([
      PayRun.find(q).sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
      PayRun.countDocuments(q),
    ])
    return { data: rows.map((r) => mapPayRun(r as Record<string, unknown>)), total, page }
  }

  async create(ctx: TenantContext, data: unknown): Promise<PayRunDTO> {
    await connectDB()
    const d = data as Record<string, unknown>
    const tenantStr = ctx.tenantId === SUPER_ADMIN_SENTINEL ? String(d.tenantId ?? "") : ctx.tenantId
    if (!tenantStr) throw new Error("tenantId required")
    const createdBy = String(d.createdBy ?? "")
    if (!createdBy) throw new Error("createdBy required")
    const doc = await PayRun.create({
      tenantId: toObjectId(tenantStr),
      startDate: d.startDate instanceof Date ? d.startDate : new Date(String(d.startDate)),
      endDate: d.endDate instanceof Date ? d.endDate : new Date(String(d.endDate)),
      status: (d.status as "draft" | "calculated" | "approved" | "exported" | "failed" | undefined) ?? "draft",
      createdBy: toObjectId(createdBy),
      totals: (d.totals as typeof defaultTotals | undefined) ?? defaultTotals,
      notes: typeof d.notes === "string" ? d.notes : undefined,
    })
    const lean = await PayRun.findById(doc._id).lean()
    return mapPayRun(lean as Record<string, unknown>)
  }

  async update(ctx: TenantContext, id: EntityId, data: unknown): Promise<PayRunDTO | null> {
    await connectDB()
    const d = data as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    if (d.status !== undefined) patch.status = d.status
    if (d.startDate !== undefined) patch.startDate = d.startDate instanceof Date ? d.startDate : new Date(String(d.startDate))
    if (d.endDate !== undefined) patch.endDate = d.endDate instanceof Date ? d.endDate : new Date(String(d.endDate))
    if (d.notes !== undefined) patch.notes = d.notes
    if (d.totals !== undefined) patch.totals = d.totals
    const updated = await PayRun.findOneAndUpdate({ _id: id, ...tenantIdMatch(ctx) }, { $set: patch }, { new: true }).lean()
    if (!updated) return null
    return mapPayRun(updated as Record<string, unknown>)
  }

  async delete(ctx: TenantContext, id: EntityId): Promise<boolean> {
    await connectDB()
    const res = await PayRun.deleteOne({ _id: id, ...tenantIdMatch(ctx) })
    return res.deletedCount === 1
  }
}
