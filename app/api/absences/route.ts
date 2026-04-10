import { createApiRoute } from "@/lib/api/create-api-route"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { LeaveRecord } from "@/lib/db/schemas/leave-record"
import {
  absencesBulkQuerySchema,
  absencesBulkListResponseSchema,
} from "@/lib/validations/absences"
import { errorResponseSchema } from "@/lib/validations/auth"
import mongoose from "mongoose"

type PopulatedEmployeeRef = {
  _id: mongoose.Types.ObjectId
  name?: unknown
  pin?: unknown
}

function isPopulatedEmployeeRef(v: unknown): v is PopulatedEmployeeRef {
  if (!v || typeof v !== "object") return false
  if (v instanceof mongoose.Types.ObjectId) return false
  return (
    "_id" in v &&
    (v as { _id?: unknown })._id instanceof mongoose.Types.ObjectId
  )
}

/**
 * GET /api/absences?startDate=&endDate=&employeeId=...&status=&leaveType=&limit=&offset=
 * List leave records across employees (single DB query).
 */
export const GET = createApiRoute({
  method: "GET",
  path: "/api/absences",
  summary: "List absences (bulk)",
  description: "Query leave records across employees with optional filters and pagination",
  tags: ["Absences"],
  security: "adminAuth",
  request: {
    query: absencesBulkQuerySchema,
  },
  responses: {
    200: absencesBulkListResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    if (!query) {
      return { status: 400, data: { error: "Query parameters are required" } }
    }

    const {
      startDate,
      endDate,
      employeeId: employeeIds = [],
      status,
      leaveType,
      limit,
      offset,
    } = query

    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)

    const filter: Record<string, unknown> = {
      ...(employeeIds.length > 0 && {
        employeeId: {
          $in: employeeIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      }),
      $or: [
        { startDate: { $gte: rangeStart, $lte: rangeEnd } },
        { endDate: { $gte: rangeStart, $lte: rangeEnd } },
        { startDate: { $lte: rangeStart }, endDate: { $gte: rangeEnd } },
      ],
      ...(status && { status }),
      ...(leaveType && { leaveType }),
    }

    try {
      await connectDB()

      const total = await LeaveRecord.countDocuments(filter)

      const docs = await LeaveRecord.find(filter)
        .sort({ startDate: -1 })
        .skip(offset)
        .limit(limit)
        .populate({ path: "employeeId", select: "name pin" })
        .lean()

      const absences = docs.map((doc) => {
        const emp = doc.employeeId as
          | { _id?: mongoose.Types.ObjectId; name?: string; pin?: string }
          | mongoose.Types.ObjectId
          | string
          | null
          | undefined

        let employeeOid: string
        let employeeName = ""
        let employeePin = ""

        if (isPopulatedEmployeeRef(emp)) {
          employeeOid = emp._id.toString()
          employeeName = typeof emp.name === "string" ? emp.name : ""
          employeePin = typeof emp.pin === "string" ? emp.pin : ""
        } else if (emp instanceof mongoose.Types.ObjectId) {
          employeeOid = emp.toString()
        } else if (typeof emp === "string") {
          employeeOid = emp
        } else {
          employeeOid = String(doc.employeeId ?? "")
        }

        const toIso = (d: Date | string | null | undefined) => {
          if (d == null) return undefined
          const dt = d instanceof Date ? d : new Date(d)
          return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString()
        }

        return {
          id: doc._id.toString(),
          employeeId: employeeOid,
          employeeName,
          employeePin,
          startDate: toIso(doc.startDate as Date) ?? "",
          endDate: toIso(doc.endDate as Date) ?? "",
          leaveType: String(doc.leaveType ?? ""),
          status: String(doc.status ?? ""),
          notes: typeof doc.notes === "string" ? doc.notes : "",
          approvedBy: doc.approvedBy ? String(doc.approvedBy) : undefined,
          approvedAt: toIso(doc.approvedAt as Date | null),
          deniedBy: doc.deniedBy ? String(doc.deniedBy) : undefined,
          deniedAt: toIso(doc.deniedAt as Date | null),
          denialReason:
            typeof doc.denialReason === "string" && doc.denialReason
              ? doc.denialReason
              : undefined,
          blockAutoFill: Boolean(doc.blockAutoFill),
          createdAt: toIso(doc.createdAt as Date) ?? "",
          updatedAt: toIso(doc.updatedAt as Date) ?? "",
        }
      })

      return {
        status: 200,
        data: { absences, total },
      }
    } catch (err) {
      console.error("[api/absences GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch leave records" },
      }
    }
  },
})
