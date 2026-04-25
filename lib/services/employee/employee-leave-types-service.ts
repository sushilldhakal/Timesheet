import { connectDB } from "@/lib/db"
import { Award, Employee, Employer } from "@/lib/db"

export type LeaveTypeOption = { value: string; label: string }

const BUILTIN: LeaveTypeOption[] = [
  { value: "ANNUAL", label: "Annual leave" },
  { value: "SICK", label: "Sick leave" },
  { value: "UNPAID", label: "Unpaid leave" },
  { value: "PUBLIC_HOLIDAY", label: "Public holiday" },
]

function normKey(s: string): string {
  return s.trim().toUpperCase().replace(/-/g, "_").replace(/\s+/g, "_")
}

export class EmployeeLeaveTypesService {
  /**
   * Built-in leave codes plus any `leave` rule outcomes from the employee's award(s)
   * and the employer default award.
   */
  async listForEmployee(employeeId: string): Promise<{ leaveTypes: LeaveTypeOption[] }> {
    await connectDB()
    const emp = await Employee.findById(employeeId).select("tenantId payConditions awardId").lean()
    if (!emp) {
      return { leaveTypes: [...BUILTIN] }
    }

    const merged = new Map<string, LeaveTypeOption>()
    for (const b of BUILTIN) {
      merged.set(normKey(b.value), b)
    }

    const awardIds = new Set<string>()
    const directAward = (emp as { awardId?: unknown }).awardId
    if (directAward) awardIds.add(String(directAward))
    for (const pc of (emp as { payConditions?: Array<{ awardId?: unknown }> }).payConditions ?? []) {
      if (pc?.awardId) awardIds.add(String(pc.awardId))
    }
    const tid = (emp as { tenantId?: unknown }).tenantId
    if (tid) {
      const employer = await Employer.findById(tid).select("defaultAwardId").lean()
      const def = (employer as { defaultAwardId?: unknown } | null)?.defaultAwardId
      if (def) awardIds.add(String(def))
    }

    for (const rawId of awardIds) {
      if (typeof rawId !== "string" || !/^[a-fA-F0-9]{24}$/.test(rawId)) continue
      const award = await Award.findById(rawId).select("rules").lean()
      const rules = (award as { rules?: unknown[] } | null)?.rules
      if (!Array.isArray(rules)) continue
      for (const rule of rules) {
        const o = (rule as { outcome?: { type?: string; leaveType?: unknown; exportName?: unknown; description?: unknown } })
          ?.outcome
        if (!o || o.type !== "leave") continue
        const lt = typeof o.leaveType === "string" ? o.leaveType.trim() : ""
        if (!lt) continue
        const labelRaw =
          (typeof o.exportName === "string" && o.exportName.trim()) ||
          (typeof o.description === "string" && o.description.trim()) ||
          lt
        const key = normKey(lt)
        if (!merged.has(key)) {
          merged.set(key, { value: lt, label: labelRaw })
        }
      }
    }

    return { leaveTypes: Array.from(merged.values()) }
  }
}

export const employeeLeaveTypesService = new EmployeeLeaveTypesService()
