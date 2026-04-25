import type { ITimesheetRepository } from "@/contracts/repositories/ITimesheetRepository"
import type { TimesheetDTO } from "@/contracts/dtos/timesheet"
import type { EntityId, PaginatedResult, TenantContext } from "@/shared/types"
import { connectDB } from "@/lib/db"
import { Timesheet } from "@/lib/db/schemas/timesheet"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"
import { toObjectId } from "./mongo-ids"
import { tenantIdMatch } from "./tenant-query"

function iso(d: unknown): string {
  if (d instanceof Date) return d.toISOString()
  if (typeof d === "string") return d
  return ""
}

function refId(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "object" && v !== null && "_id" in v) return String((v as { _id: unknown })._id)
  return String(v)
}

function mapDocToDto(doc: Record<string, unknown>): TimesheetDTO {
  const d = doc as Record<string, unknown> & {
    _id: unknown
    employeeId?: unknown
    shiftIds?: unknown[]
    submittedBy?: unknown
    approvedBy?: unknown
    rejectedBy?: unknown
    lockedBy?: unknown
    payRunId?: unknown
  }
  return {
    id: String(d._id),
    employeeId: refId(d.employeeId) ?? "",
    payPeriodStart: iso(d.payPeriodStart),
    payPeriodEnd: iso(d.payPeriodEnd),
    shiftIds: Array.isArray(d.shiftIds) ? d.shiftIds.map((x) => String(x)) : [],
    totalShifts: Number(d.totalShifts ?? 0),
    totalHours: Number(d.totalHours ?? 0),
    totalCost: Number(d.totalCost ?? 0),
    totalBreakMinutes: Number(d.totalBreakMinutes ?? 0),
    status: (d.status as TimesheetDTO["status"]) ?? "draft",
    submittedBy: refId(d.submittedBy),
    submittedAt: d.submittedAt ? iso(d.submittedAt) : null,
    submissionNotes: typeof d.submissionNotes === "string" ? d.submissionNotes : undefined,
    approvedBy: refId(d.approvedBy),
    approvedAt: d.approvedAt ? iso(d.approvedAt) : null,
    rejectionReason: typeof d.rejectionReason === "string" ? d.rejectionReason : undefined,
    rejectedAt: d.rejectedAt ? iso(d.rejectedAt) : null,
    rejectedBy: refId(d.rejectedBy),
    lockedBy: refId(d.lockedBy),
    lockedAt: d.lockedAt ? iso(d.lockedAt) : null,
    payRunId: refId(d.payRunId),
    notes: typeof d.notes === "string" ? d.notes : undefined,
    createdAt: d.createdAt ? iso(d.createdAt) : undefined,
    updatedAt: d.updatedAt ? iso(d.updatedAt) : undefined,
  }
}

function parseListFilters(filters: unknown): { page: number; limit: number; employeeId?: string; status?: string } {
  const f = filters as Record<string, unknown> | null | undefined
  const page = typeof f?.page === "number" && f.page >= 1 ? f.page : 1
  const limit = typeof f?.limit === "number" && f.limit >= 1 ? Math.min(f.limit, 500) : 20
  const employeeId = typeof f?.employeeId === "string" ? f.employeeId : undefined
  const status = typeof f?.status === "string" ? f.status : undefined
  return { page, limit, employeeId, status }
}

export class MongoTimesheetRepository implements ITimesheetRepository {
  async findById(ctx: TenantContext, id: EntityId): Promise<TimesheetDTO | null> {
    await connectDB()
    const doc = await Timesheet.findOne({ _id: id, ...tenantIdMatch(ctx) }).lean()
    if (!doc) return null
    return mapDocToDto(doc as Record<string, unknown>)
  }

  async findMany(ctx: TenantContext, filters: unknown): Promise<PaginatedResult<TimesheetDTO>> {
    await connectDB()
    const { page, limit, employeeId, status } = parseListFilters(filters)
    const q: Record<string, unknown> = { ...tenantIdMatch(ctx) }
    if (employeeId) q.employeeId = toObjectId(employeeId)
    if (status) q.status = status
    const skip = (page - 1) * limit
    const [rows, total] = await Promise.all([
      Timesheet.find(q).sort({ payPeriodStart: -1 }).skip(skip).limit(limit).lean(),
      Timesheet.countDocuments(q),
    ])
    return { data: rows.map((r) => mapDocToDto(r as Record<string, unknown>)), total, page }
  }

  async create(ctx: TenantContext, data: unknown): Promise<TimesheetDTO> {
    await connectDB()
    const d = data as Record<string, unknown>
    const tenantId = ctx.tenantId === SUPER_ADMIN_SENTINEL ? String(d.tenantId ?? "") : ctx.tenantId
    if (!tenantId) throw new Error("tenantId required")
    const doc = await Timesheet.create({
      tenantId: toObjectId(tenantId),
      employeeId: toObjectId(String(d.employeeId)),
      payPeriodStart: d.payPeriodStart instanceof Date ? d.payPeriodStart : new Date(String(d.payPeriodStart)),
      payPeriodEnd: d.payPeriodEnd instanceof Date ? d.payPeriodEnd : new Date(String(d.payPeriodEnd)),
      shiftIds: Array.isArray(d.shiftIds) ? d.shiftIds.map((x) => toObjectId(String(x))) : [],
      totalShifts: Number(d.totalShifts ?? 0),
      totalHours: Number(d.totalHours ?? 0),
      totalCost: Number(d.totalCost ?? 0),
      totalBreakMinutes: Number(d.totalBreakMinutes ?? 0),
      status: (d.status as TimesheetDTO["status"]) ?? "draft",
      notes: typeof d.notes === "string" ? d.notes : undefined,
    })
    const lean = await Timesheet.findById(doc._id).lean()
    return mapDocToDto(lean as Record<string, unknown>)
  }

  async update(ctx: TenantContext, id: EntityId, data: unknown): Promise<TimesheetDTO | null> {
    await connectDB()
    const d = data as Record<string, unknown>
    const patch: Record<string, unknown> = { ...d }
    if (typeof d.employeeId === "string") patch.employeeId = toObjectId(d.employeeId)
    if (typeof d.payRunId === "string") patch.payRunId = toObjectId(d.payRunId)
    delete patch._id
    const updated = await Timesheet.findOneAndUpdate({ _id: id, ...tenantIdMatch(ctx) }, { $set: patch }, { new: true }).lean()
    if (!updated) return null
    return mapDocToDto(updated as Record<string, unknown>)
  }

  async delete(ctx: TenantContext, id: EntityId): Promise<boolean> {
    await connectDB()
    const res = await Timesheet.deleteOne({ _id: id, ...tenantIdMatch(ctx) })
    return res.deletedCount === 1
  }
}
