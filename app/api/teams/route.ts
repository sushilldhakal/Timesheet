import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, mongoose, Team, TeamGroup } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"

const shiftPatternSchema = z.object({
  dayOfWeek: z.array(z.number()).optional(),
  startHour: z.number().optional(),
  endHour: z.number().optional(),
  description: z.string().optional(),
})

const defaultScheduleTemplateSchema = z.object({
  standardHoursPerWeek: z.number().optional(),
  shiftPattern: shiftPatternSchema.optional(),
})

const groupSnapshotResponseSchema = z.object({ name: z.string().optional() }).optional()

const teamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  color: z.string().optional(),
  groupId: z.string().optional(),
  order: z.number().optional(),
  groupSnapshot: groupSnapshotResponseSchema,
  groupName: z.string().optional(),
  groupColor: z.string().optional(),
  staffCount: z.number().optional(),
  managerCount: z.number().optional(),
  defaultScheduleTemplate: defaultScheduleTemplateSchema.optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
})

const teamQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional().transform((val) => val ? val === "true" : undefined),
})

const teamCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  color: z.string().optional(),
  groupId: z.string().optional(),
  order: z.number().optional(),
  defaultScheduleTemplate: defaultScheduleTemplateSchema.optional(),
  isActive: z.boolean().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/teams",
  summary: "List teams",
  description: "Get all scheduling teams, optionally filtered",
  tags: ["Teams"],
  security: "adminAuth",
  request: { query: teamQuerySchema },
  responses: {
    200: z.object({ teams: z.array(teamResponseSchema) }),
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const search = query?.search?.trim()
    const isActive = query?.isActive

    await connectDB()
    const tid = new mongoose.Types.ObjectId(ctx.tenantId)
    const filter: Record<string, unknown> = { tenantId: tid }
    if (typeof isActive === "boolean") filter.isActive = isActive
    if (search) filter.name = { $regex: search, $options: "i" }

    const db = mongoose.connection.db
    const dbName = db?.databaseName ?? "(no db)"

    let teamsColCount = -1
    let rolesColCount = -1
    let teansColCount = -1
    try {
      if (db) {
        ;[teamsColCount, rolesColCount, teansColCount] = await Promise.all([
          db.collection("teams").countDocuments({}),
          db.collection("roles").countDocuments({}),
          db.collection("teans").countDocuments({}),
        ])
      }
    } catch (e) {
      console.warn("[api/teams GET] collection count failed", e)
    }

    let teams = await Team.find(filter).sort({ order: 1, name: 1 }).lean()

    console.log("[api/teams GET]", {
      dbName,
      filter,
      mongooseModelCount: teams.length,
      rawCollectionCounts: { teams: teamsColCount, roles: rolesColCount, teans: teansColCount },
    })

    // Backward/typo compatibility: some environments stored teams in `teans`.
    // If `teams` is empty but `teans` has docs, read from there.
    if (teams.length === 0 && teansColCount > 0) {
      try {
        const teans = await mongoose.connection
          .collection("teans")
          .find(filter as Record<string, unknown>)
          .sort({ order: 1, name: 1 })
          .toArray()
        teams = teans as typeof teams
        console.log("[api/teams GET] fallback teans → rows", teams.length)
      } catch (e) {
        console.warn("[api/teams GET] teans fallback failed", e)
      }
    }

    // Legacy: data may still live in `roles` after renaming the concept to Teams.
    if (teams.length === 0 && rolesColCount > 0) {
      try {
        const fromRoles = await mongoose.connection
          .collection("roles")
          .find(filter as Record<string, unknown>)
          .sort({ order: 1, name: 1 })
          .toArray()
        teams = fromRoles as typeof teams
        console.log("[api/teams GET] fallback roles → rows", teams.length)
      } catch (e) {
        console.warn("[api/teams GET] roles fallback failed", e)
      }
    }

    if (teams.length === 0 && teamsColCount > 0) {
      try {
        const raw = await mongoose.connection
          .collection("teams")
          .find(filter as Record<string, unknown>)
          .sort({ order: 1, name: 1 })
          .toArray()
        console.log("[api/teams GET] Team.find empty but teams collection has docs; native find → rows", raw.length)
        teams = raw as typeof teams
      } catch (e) {
        console.warn("[api/teams GET] native teams find failed", e)
      }
    }

    const teamIds = teams.map((r: any) => r._id).filter(Boolean)
    const staffByTeam = new Map<string, number>()
    const managersByTeam = new Map<string, number>()

    if (teamIds.length > 0) {
      const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
      const { User } = await import("@/lib/db/schemas/user")
      const now = new Date()

      const staffAgg = await EmployeeRoleAssignment.aggregate([
        {
          $match: {
            roleId: { $in: teamIds },
            validFrom: { $lte: now },
            $or: [{ validTo: null }, { validTo: { $gte: now } }],
          },
        },
        {
          $group: {
            _id: "$roleId",
            employees: { $addToSet: "$employeeId" },
          },
        },
      ])
      for (const row of staffAgg) {
        staffByTeam.set(String(row._id), row.employees?.length ?? 0)
      }

      const managerAgg = await User.aggregate([
        {
          $match: {
            role: { $in: ["manager", "supervisor"] },
            managedRoleIds: { $exists: true, $ne: [] },
          },
        },
        { $unwind: "$managedRoleIds" },
        { $match: { managedRoleIds: { $in: teamIds } } },
        {
          $group: {
            _id: "$managedRoleIds",
            managerCount: { $sum: 1 },
          },
        },
      ])
      for (const row of managerAgg) {
        managersByTeam.set(String(row._id), row.managerCount ?? 0)
      }
    }

    const groupDocById = new Map<string, { name: string; color?: string }>()
    const allGroupIds = [
      ...new Set(
        teams
          .map((r: { groupId?: unknown }) => (r.groupId ? String(r.groupId) : ""))
          .filter(Boolean),
      ),
    ]
    if (allGroupIds.length > 0) {
      const oids = allGroupIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id))
      const groupDocs = await TeamGroup.find({ _id: { $in: oids } })
        .select(["name", "color"])
        .lean()
      for (const g of groupDocs) {
        groupDocById.set(String(g._id), { name: g.name, color: g.color })
      }
    }

    return {
      status: 200,
      data: {
        teams: teams.map((r: any) => {
          const id = r._id.toString()
          const gid = r.groupId ? String(r.groupId) : ""
          const gInfo = gid ? groupDocById.get(gid) : undefined
          return {
            id,
            name: r.name,
            code: r.code,
            color: r.color,
            groupId: r.groupId?.toString(),
            order: r.order ?? 0,
            groupSnapshot: r.groupSnapshot?.name != null ? { name: r.groupSnapshot.name } : undefined,
            groupName: gInfo?.name ?? (r.groupSnapshot?.name as string | undefined),
            groupColor: gInfo?.color,
            staffCount: staffByTeam.get(id) ?? 0,
            managerCount: managersByTeam.get(id) ?? 0,
            defaultScheduleTemplate: r.defaultScheduleTemplate,
            isActive: r.isActive ?? true,
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
            updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
          }
        }),
      },
    }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/teams",
  summary: "Create team",
  description: "Create a new scheduling team",
  tags: ["Teams"],
  security: "adminAuth",
  request: { body: teamCreateSchema },
  responses: {
    200: z.object({ team: teamResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const payload = body!
    const tid = new mongoose.Types.ObjectId(ctx.tenantId)
    await connectDB()

    const existing = await Team.findOne({
      tenantId: tid,
      name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
    }).lean()
    if (existing) return { status: 409, data: { error: "A team with this name already exists" } }

    let groupSnapshot: { name?: string } | undefined
    if (payload.groupId && mongoose.Types.ObjectId.isValid(payload.groupId)) {
      const g = await TeamGroup.findById(payload.groupId).select("name").lean()
      if (g?.name) groupSnapshot = { name: g.name }
    }

    const created = await Team.create({
      tenantId: tid,
      name: payload.name.trim(),
      code: payload.code,
      color: payload.color,
      groupId:
        payload.groupId && mongoose.Types.ObjectId.isValid(payload.groupId)
          ? new mongoose.Types.ObjectId(payload.groupId)
          : undefined,
      order: payload.order ?? 0,
      groupSnapshot,
      defaultScheduleTemplate: payload.defaultScheduleTemplate,
      isActive: payload.isActive ?? true,
      createdBy: ctx.auth.sub,
    })

    let groupName: string | undefined
    let groupColor: string | undefined
    if (created.groupId) {
      const g = await TeamGroup.findById(created.groupId).select(["name", "color"]).lean()
      if (g) {
        groupName = g.name
        groupColor = g.color
      }
    }

    return {
      status: 200,
      data: {
        team: {
          id: created._id.toString(),
          name: created.name,
          code: created.code,
          color: created.color,
          groupId: created.groupId?.toString(),
          order: created.order ?? 0,
          groupSnapshot: created.groupSnapshot?.name != null ? { name: created.groupSnapshot.name } : undefined,
          groupName,
          groupColor,
          defaultScheduleTemplate: created.defaultScheduleTemplate,
          isActive: created.isActive ?? true,
          createdAt: created.createdAt ? created.createdAt.toISOString() : null,
          updatedAt: created.updatedAt ? created.updatedAt.toISOString() : null,
        },
      },
    }
  },
})
