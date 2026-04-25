import type { IEmployeeRepository } from "@/contracts/repositories/IEmployeeRepository"
import type { TenantContext, EntityId } from "@/shared/types"
import type { EmployeeCreatePersistInput, EmployeeEmployerDTO, EmployeeDTO } from "@/contracts/dtos/employee"
import { apiErrors } from "@/lib/api/api-error"
import { connectDB, Employer, Location, Team } from "@/lib/db"
import { EmployeeDbQueries } from "@/lib/db/queries/employees"
import { EmployeeTeamAssignment } from "@/lib/db/schemas/employee-team-assignment"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"
import { toObjectId } from "./mongo-ids"

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : v != null && v !== "" ? [String(v).trim()] : []

/** Map seed/legacy values to the same strings as staff `<select>` options */
function genderForUi(raw: unknown): string {
  if (raw == null) return ""
  const s = String(raw).trim()
  if (!s) return ""
  const k = s.toLowerCase()
  if (k === "male" || k === "m") return "Male"
  if (k === "female" || k === "f") return "Female"
  if (k === "other") return "Other"
  if (k === "prefer not to say" || k === "prefer_not_to_say") return "Prefer not to say"
  return s
}

export class MongoEmployeeRepository implements IEmployeeRepository {
  async pinExistsForTenant(ctx: TenantContext, pin: string) {
    await connectDB()
    if (ctx.tenantId === SUPER_ADMIN_SENTINEL) return false
    const existing = await EmployeeDbQueries.findEmployeeByPin(pin.trim(), ctx.tenantId)
    return !!existing
  }

  async resolveOnboardingCountryForLocationName(ctx: TenantContext, firstLocationName: string | undefined) {
    await connectDB()
    if (!firstLocationName?.trim()) return "AU"
    const tenantFilter = ctx.tenantId !== SUPER_ADMIN_SENTINEL ? { tenantId: toObjectId(ctx.tenantId) } : {}
    const firstLocation = await Location.findOne({ name: firstLocationName.trim(), ...tenantFilter }).lean()
    if (firstLocation && (firstLocation as any).country) return String((firstLocation as any).country)
    return "AU"
  }

  async listEmployees(ctx: TenantContext, query: any) {
    await connectDB()

    const search = query?.search?.trim?.() ?? ""
    const locationFilter = query?.location?.trim?.() ?? ""
    const locationIdFilter = query?.locationId?.trim?.() ?? ""
    const teamFilter = query?.team?.trim?.() ?? ""
    const employerFilter = query?.employer?.trim?.() ?? ""
    const limit = query?.limit ?? 50
    const offset = query?.offset ?? 0
    const sortByParam = query?.sortBy ?? "name"
    const orderParam = query?.order ?? "asc"

    const locationFilters = locationFilter ? locationFilter.split(",").map((s: string) => s.trim()).filter(Boolean) : []
    const locationIdFilters = locationIdFilter ? locationIdFilter.split(",").map((s: string) => s.trim()).filter(Boolean) : []
    const teamFilters = teamFilter ? teamFilter.split(",").map((s: string) => s.trim()).filter(Boolean) : []
    const employerFilters = employerFilter ? employerFilter.split(",").map((s: string) => s.trim()).filter(Boolean) : []

    const validSortFields = ["name", "pin", "email", "phone", "createdAt", "employer", "location", "team"]
    const sortBy = validSortFields.includes(sortByParam) ? sortByParam : "name"
    const order = orderParam === "desc" ? -1 : 1
    const needsAggregation = sortBy === "team" || sortBy === "location"

    const andConditions: Record<string, unknown>[] = []

    // tenant injection (required for all non-super-admin operations)
    if (ctx.tenantId !== SUPER_ADMIN_SENTINEL) {
      andConditions.push({ tenantId: toObjectId(ctx.tenantId) })
    }

    // Optional access-scoping passed in from auth (kept out of service code)
    const userLocations: string[] | null = query?.userLocations ?? null
    const managedRoles: string[] | null = query?.managedRoles ?? null
    if (userLocations && userLocations.length > 0) {
      andConditions.push({ location: { $in: userLocations } })
    }
    if (Array.isArray(managedRoles) && managedRoles.length > 0) {
      // Map role names -> ids -> employeeIds, then inject as _id filter
      const roleCategories = await Team.find({ name: { $in: managedRoles } }).select("_id").lean()
      const roleIds = roleCategories.map((r: any) => r._id)
      if (roleIds.length === 0) return { employees: [], total: 0, limit, offset }
      const assignments = await EmployeeTeamAssignment.find({ teamId: { $in: roleIds }, isActive: true })
        .select("employeeId")
        .lean()
      const employeeIds = Array.from(new Set(assignments.map((a: any) => a.employeeId.toString()))).map((id) => toObjectId(id))
      if (employeeIds.length === 0) return { employees: [], total: 0, limit, offset }
      andConditions.push({ _id: { $in: employeeIds } })
    }

    // Prefer locationId filtering via assignments (stable + tenant-safe). location(name) is deprecated.
    if (locationIdFilters.length > 0) {
      const locOids = locationIdFilters
        .filter((id: string) => id && id.length > 0)
        .map((id: string) => toObjectId(id))

      if (locOids.length > 0) {
        const idsAtLocations = await EmployeeTeamAssignment.find({
          locationId: { $in: locOids },
          isActive: true,
        }).distinct("employeeId")

        const strIds = (idsAtLocations as any[]).map((id) => id.toString())
        if (strIds.length > 0) {
          andConditions.push({ _id: { $in: strIds.map((id) => toObjectId(id)) } })
        } else {
          return { employees: [], total: 0, limit, offset }
        }
      }
    } else if (locationFilters.length > 0) {
      andConditions.push({ location: { $in: locationFilters } })
    }
    if (employerFilters.length > 0) andConditions.push({ employer: { $in: employerFilters } })

    if (teamFilters.length > 0) {
      const teamCategories = await Team.find({ name: { $in: teamFilters } }).lean()
      if (teamCategories.length > 0) {
        const teamIds = teamCategories.map((r: any) => r._id)
        const teamAssignments = await EmployeeTeamAssignment.find({ teamId: { $in: teamIds }, isActive: true }).distinct(
          "employeeId"
        )
        const teamFilteredIds = teamAssignments.map((id: any) => id.toString())
        if (teamFilteredIds.length > 0) {
          andConditions.push({ _id: { $in: teamFilteredIds.map((id: string) => toObjectId(id)) } })
        } else {
          return { employees: [], total: 0, limit, offset }
        }
      }
    }

    const filter: Record<string, unknown> = {}
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { pin: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { role: { $regex: search, $options: "i" } },
          { employer: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
        ],
      })
    }
    if (andConditions.length > 0) filter.$and = andConditions

    let employees: any[] = []
    let total = 0

    if (needsAggregation) {
      const roleAssignmentCollection = "employee_team_assignments"
      const roleCollection = "roles"
      const locationCollection = "locations"

      const pipeline: object[] = [
        { $match: filter },
        {
          $lookup: {
            from: roleAssignmentCollection,
            let: { empId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $and: [{ $eq: ["$employeeId", "$$empId"] }, { $eq: ["$isActive", true] }] },
                },
              },
              { $sort: { assignedAt: 1 } },
              { $limit: 1 },
            ],
            as: "_primaryAssignment",
          },
        },
        { $unwind: { path: "$_primaryAssignment", preserveNullAndEmptyArrays: true } },
      ]

      if (sortBy === "team") {
        pipeline.push({
          $lookup: {
            from: roleCollection,
            localField: "_primaryAssignment.teamId",
            foreignField: "_id",
            as: "_roleCategory",
          },
        })
        pipeline.push({ $unwind: { path: "$_roleCategory", preserveNullAndEmptyArrays: true } })
        pipeline.push({
          $addFields: {
            _sortKey: { $toLower: { $ifNull: ["$_roleCategory.name", "zzz"] } },
          },
        })
      }

      if (sortBy === "location") {
        pipeline.push({
          $lookup: {
            from: locationCollection,
            localField: "_primaryAssignment.locationId",
            foreignField: "_id",
            as: "_locationCategory",
          },
        })
        pipeline.push({ $unwind: { path: "$_locationCategory", preserveNullAndEmptyArrays: true } })
        pipeline.push({
          $addFields: {
            _sortKey: { $toLower: { $ifNull: ["$_locationCategory.name", "zzz"] } },
          },
        })
      }

      pipeline.push({ $sort: { _sortKey: order, name: 1 } })
      pipeline.push({
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: offset }, { $limit: limit }],
        },
      })

      const [result] = await EmployeeDbQueries.aggregateEmployees(pipeline)
      total = result?.metadata?.[0]?.total ?? 0
      employees = result?.data ?? []
    } else {
      ;[employees, total] = await Promise.all([
        EmployeeDbQueries.findEmployees(filter, { sort: { [sortBy]: order } as any, offset, limit }),
        EmployeeDbQueries.countEmployees(filter),
      ])
    }

    const employeeIds = employees.map((e) => e._id)
    const roleAssignments = await EmployeeTeamAssignment.find({
      employeeId: { $in: employeeIds },
      isActive: true,
    })
      .populate("teamId", "name color")
      .populate("locationId", "name")
      .lean()

    const locationIds = Array.from(
      new Set(
        roleAssignments
          .filter((ra: any) => ra.locationId && ra.locationId._id)
          .map((ra: any) => ra.locationId._id.toString())
      )
    )
    const locations = await Location.find({ _id: { $in: locationIds.map((id) => toObjectId(id)) } }).lean()
    const locationMap = new Map(
      locations.map((loc: any) => [
        loc._id.toString(),
        {
          id: loc._id.toString(),
          name: loc.name,
          address: loc.address || "",
          lat: loc.lat,
          lng: loc.lng,
          geofence: { radius: loc.radius || 100, mode: loc.geofenceMode || "soft" },
          hours: { opening: loc.openingHour, closing: loc.closingHour, workingDays: loc.workingDays || [] },
        },
      ])
    )

    const assignmentsByEmployee = new Map<string, any[]>()
    for (const assignment of roleAssignments as any[]) {
      const empId = assignment.employeeId.toString()
      if (!assignmentsByEmployee.has(empId)) assignmentsByEmployee.set(empId, [])
      if (!assignment.locationId || !assignment.teamId) continue
      const assignmentId = assignment._id.toString()
      const existing = assignmentsByEmployee.get(empId)!
      if (existing.some((x) => x.id === assignmentId)) continue
      const location = locationMap.get((assignment.locationId as any)._id.toString())
      existing.push({
        id: assignmentId,
        team: {
          id: (assignment.teamId as any)._id.toString(),
          name: (assignment.teamId as any).name,
          color: (assignment.teamId as any).color,
        },
        location:
          location || {
            id: (assignment.locationId as any)._id.toString(),
            name: (assignment.locationId as any).name,
            address: "",
            lat: undefined,
            lng: undefined,
            geofence: { radius: 100, mode: "soft" },
            hours: { opening: undefined, closing: undefined, workingDays: [] },
          },
        validFrom: assignment.validFrom.toISOString(),
        validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
        isActive: assignment.isActive,
      })
    }

    const allEmployerNames = Array.from(new Set(employees.flatMap((e) => arr(e.employer))))
    const employers = await Employer.find({ name: { $in: allEmployerNames } }).select("_id name color").lean()
    const employerMap = new Map<string, EmployeeEmployerDTO>(
      employers.map((emp: any) => [String(emp.name), { id: emp._id.toString(), name: String(emp.name), color: emp.color ?? undefined }])
    )

    const normalized = employees.map((e) => {
      const assignments = assignmentsByEmployee.get(e._id.toString()) || []
      const uniqueLocations = Array.from(new Map(assignments.map((a: any) => [a.location.id, a.location])).values())
      const employerDetails = arr(e.employer)
        .map((name) => employerMap.get(name))
        .filter((x): x is EmployeeEmployerDTO => x != null)

      return {
        id: e._id.toString(),
        name: e.name ?? "",
        pin: e.pin ?? "",
        teams: assignments,
        employers: employerDetails,
        locations: uniqueLocations,
        email: e.email ?? "",
        phone: e.phone ?? "",
        homeAddress: e.homeAddress ?? "",
        dob: e.dob ?? "",
        gender: genderForUi(e.gender),
        comment: e.comment ?? "",
        img: e.img ?? "",
        employmentType: e.employmentType ?? null,
        standardHoursPerWeek: e.standardHoursPerWeek ?? null,
        awardId: e.awardId ? e.awardId.toString() : null,
        awardLevel: e.awardLevel ?? null,
        onboardingCompleted: e.onboardingCompleted === true,
        onboardingWorkflowStatus: e.onboardingWorkflowStatus ?? "not_started",
        onboardingCountry: e.onboardingCountry ?? "AU",
        createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: e.updatedAt ? e.updatedAt.toISOString() : new Date().toISOString(),
      } satisfies EmployeeDTO
    })

    const uniqueEmployees = Array.from(new Map(normalized.map((emp) => [emp.id, emp])).values())
    return { employees: uniqueEmployees, total, limit, offset }
  }

  async createEmployee(ctx: TenantContext, data: EmployeeCreatePersistInput) {
    await connectDB()

    if (ctx.tenantId === SUPER_ADMIN_SENTINEL) {
      throw apiErrors.badRequest("Super admin must specify a tenantId when creating employees")
    }

    const employeeData: Record<string, unknown> = {
      tenantId: toObjectId(ctx.tenantId),
      name: data.name.trim(),
      pin: data.pin.trim(),
      employer: data.employer ?? [],
      location: data.location ?? [],
      email: data.email ?? "",
      phone: data.phone ?? "",
      homeAddress: data.homeAddress ?? "",
      dob: data.dob ?? "",
      gender: genderForUi(data.gender),
      comment: data.comment ?? "",
      img: data.img ?? "",
      employmentType: data.employmentType ?? null,
      standardHoursPerWeek: data.standardHoursPerWeek ?? null,
      awardId: data.awardId ? toObjectId(data.awardId) : null,
      awardLevel: data.awardLevel ?? null,
      certifications: (data.certifications ?? []).map((cert) => ({
        type: cert.type,
        label: cert.label,
        required: cert.required,
        provided: cert.provided ?? false,
      })),
      onboardingWorkflowStatus: data.onboardingWorkflowStatus ?? "not_started",
      onboardingCountry: data.onboardingCountry ?? "AU",
    }

    if (data.onboardingInvitedBy != null && data.onboardingInvitedBy !== "") {
      employeeData.onboardingInvitedBy = data.onboardingInvitedBy
    }

    if (data.password) {
      employeeData.password = data.password
      employeeData.passwordSetByAdmin = data.passwordSetByAdmin ?? true
      employeeData.requirePasswordChange = data.requirePasswordChange ?? true
    }
    if (data.passwordSetupToken) {
      employeeData.passwordSetupToken = data.passwordSetupToken
      employeeData.passwordSetupExpiry =
        data.passwordSetupExpiry instanceof Date
          ? data.passwordSetupExpiry
          : data.passwordSetupExpiry
            ? new Date(data.passwordSetupExpiry)
            : null
    }

    const employee = await EmployeeDbQueries.createEmployee(employeeData)

    return {
      employee: {
        id: employee._id.toString(),
        name: employee.name,
        pin: employee.pin,
        teams: [],
        employers: [],
        locations: [],
        email: employee.email || "",
        phone: employee.phone || "",
        homeAddress: employee.homeAddress || "",
        dob: employee.dob || "",
        gender: genderForUi(employee.gender),
        comment: employee.comment || "",
        img: employee.img || "",
        employmentType: employee.employmentType || null,
        standardHoursPerWeek: employee.standardHoursPerWeek ?? null,
        awardId: employee.awardId ? employee.awardId.toString() : null,
        awardLevel: employee.awardLevel || null,
        onboardingCompleted: false,
        onboardingWorkflowStatus: "not_started",
        onboardingCountry: (employee as any).onboardingCountry || "AU",
        createdAt: employee.createdAt?.toISOString?.() ?? new Date().toISOString(),
        updatedAt: employee.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      },
    }
  }

  async getEmployeeDetail(ctx: TenantContext, id: EntityId) {
    await connectDB()
    const empFilter: Record<string, unknown> = { _id: id }
    if (ctx.tenantId !== SUPER_ADMIN_SENTINEL) {
      empFilter.tenantId = toObjectId(ctx.tenantId)
    }

    const employee = await EmployeeDbQueries.findEmployeeLean(empFilter)
    if (!employee) throw apiErrors.notFound("Employee not found")

    const roleAssignments = await EmployeeTeamAssignment.find({ employeeId: id, isActive: true })
      .populate("teamId", "name color type")
      .populate("locationId", "name type")
      .lean()

    const formattedAssignments = (roleAssignments as any[]).map((assignment) => ({
      id: assignment._id.toString(),
      teamId: (assignment.teamId as any)._id.toString(),
      teamName: (assignment.teamId as any).name,
      teamColor: (assignment.teamId as any).color,
      locationId: (assignment.locationId as any)._id.toString(),
      locationName: (assignment.locationId as any).name,
      validFrom: assignment.validFrom,
      validTo: assignment.validTo,
      isActive: assignment.isActive,
    }))

    return { employee: await this.toEmployeeRow(employee as any, formattedAssignments) }
  }

  async updateEmployee(ctx: TenantContext, id: EntityId, body: any) {
    await connectDB()
    const empFilter: Record<string, unknown> = { _id: id }
    if (ctx.tenantId !== SUPER_ADMIN_SENTINEL) {
      empFilter.tenantId = toObjectId(ctx.tenantId)
    }

    const existing = await EmployeeDbQueries.findEmployee(empFilter)
    if (!existing) throw apiErrors.notFound("Employee not found")

    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.pin !== undefined) {
      const dup = await EmployeeDbQueries.findDuplicatePin(body.pin.trim(), id, ctx.tenantId !== SUPER_ADMIN_SENTINEL ? ctx.tenantId : undefined)
      if (dup) throw apiErrors.conflict("PIN already in use")
      updates.pin = body.pin.trim()
    }
    if (body.employer !== undefined) updates.employer = arr(body.employer)
    if (body.location !== undefined) updates.location = arr(body.location)
    if (body.email !== undefined) updates.email = (body.email ?? "").toString().trim()
    if (body.phone !== undefined) updates.phone = (body.phone ?? "").toString().trim()
    if (body.homeAddress !== undefined) updates.homeAddress = (body.homeAddress ?? "").toString().trim()
    if (body.dob !== undefined) updates.dob = (body.dob ?? "").toString().trim()
    if (body.gender !== undefined) updates.gender = genderForUi(body.gender)
    if (body.comment !== undefined) updates.comment = (body.comment ?? "").toString().trim()
    if (body.profileImage !== undefined) updates.img = (body.profileImage ?? "").toString().trim()
    else if (body.img !== undefined) updates.img = (body.img ?? "").toString().trim()
    if (body.standardHoursPerWeek !== undefined) updates.standardHoursPerWeek = body.standardHoursPerWeek
    if (body.employmentType !== undefined) updates.employmentType = body.employmentType || null
    if (body.awardId !== undefined) updates.awardId = body.awardId ? toObjectId(body.awardId) : null
    if (body.awardLevel !== undefined) updates.awardLevel = body.awardLevel || null
    if (body.certifications !== undefined) {
      updates.certifications = body.certifications.map((cert: any) => ({
        type: cert.type,
        label: cert.label,
        required: cert.required,
        provided: false,
      }))
    }

    if (Object.keys(updates).length > 0) updates.updatedAt = new Date()
    const updated =
      Object.keys(updates).length > 0 ? await EmployeeDbQueries.updateEmployeeById(id, updates) : await EmployeeDbQueries.findEmployeeLean({ _id: id })

    const roleAssignments = await EmployeeTeamAssignment.find({ employeeId: id, isActive: true })
      .populate("teamId", "name color type")
      .populate("locationId", "name type")
      .lean()

    const formattedAssignments = (roleAssignments as any[]).map((assignment) => ({
      id: assignment._id.toString(),
      teamId: (assignment.teamId as any)._id.toString(),
      teamName: (assignment.teamId as any).name,
      teamColor: (assignment.teamId as any).color,
      locationId: (assignment.locationId as any)._id.toString(),
      locationName: (assignment.locationId as any).name,
      validFrom: assignment.validFrom,
      validTo: assignment.validTo,
      isActive: assignment.isActive,
    }))

    return { employee: await this.toEmployeeRow(updated as any, formattedAssignments) }
  }

  async deleteEmployee(ctx: TenantContext, id: EntityId) {
    await connectDB()
    const empFilter: Record<string, unknown> = { _id: id }
    if (ctx.tenantId !== SUPER_ADMIN_SENTINEL) {
      empFilter.tenantId = toObjectId(ctx.tenantId)
    }
    const deleted = await EmployeeDbQueries.deleteEmployee(empFilter)
    if (!deleted) throw apiErrors.notFound("Employee not found")
    return { success: true as const }
  }

  private async toEmployeeRow(e: any, roleAssignments: any[] = []) {
    const Award = (await import("@/lib/db/schemas/award")).default

    const locationIds = Array.from(new Set(roleAssignments.map((ra: any) => ra.locationId.toString())))
    const locations = await Location.find({ _id: { $in: locationIds.map((id) => toObjectId(id)) } }).lean()

    const locationData = locations.map((loc: any) => ({
      id: loc._id.toString(),
      name: loc.name,
      color: loc.color,
      address: loc.address || "",
      lat: loc.lat,
      lng: loc.lng,
      geofence: { radius: loc.radius || 100, mode: loc.geofenceMode || "soft" },
      hours: { opening: loc.openingHour, closing: loc.closingHour, workingDays: loc.workingDays || [] },
    }))

    const employerNames = arr(e.employer)
    const employers = await Employer.find({ name: { $in: employerNames } }).select("_id name color").lean()
    const employerData = employers.map((emp: any) => ({ id: emp._id.toString(), name: emp.name, color: emp.color }))

    let awardData = null
    if (e.awardId) {
      const award = await Award.findById(e.awardId).select("_id name description").lean()
      if (award && !Array.isArray(award)) {
        awardData = {
          id: String((award as any)._id),
          name: String((award as any).name || ""),
          level: e.awardLevel || "",
          description: String((award as any).description || ""),
        }
      }
    }

    const formattedTeams = roleAssignments.map((ra: any) => {
      const location = locationData.find((l: any) => l.id === ra.locationId)
      return {
        id: ra.id,
        team: { id: ra.teamId, name: ra.teamName, color: ra.teamColor },
        location:
          location || {
            id: ra.locationId,
            name: ra.locationName,
            address: "",
            lat: undefined,
            lng: undefined,
            geofence: { radius: 100, mode: "soft" },
            hours: { opening: undefined, closing: undefined, workingDays: [] },
          },
        validFrom: ra.validFrom,
        validTo: ra.validTo,
        isActive: ra.isActive,
      }
    })

    return {
      id: String(e._id),
      name: e.name ?? "",
      pin: e.pin ?? "",
      email: e.email ?? "",
      phone: e.phone ?? "",
      homeAddress: e.homeAddress ?? "",
      img: e.img ?? "",
      dob: e.dob ?? "",
      gender: genderForUi(e.gender),
      employmentType: e.employmentType,
      standardHoursPerWeek: e.standardHoursPerWeek ?? undefined,
      comment: e.comment ?? "",
      award: awardData,
      awardId: e.awardId ? String(e.awardId) : null,
      awardLevel: e.awardLevel ?? null,
      teams: formattedTeams,
      employers: employerData,
      locations: locationData,
      passwordSetByAdmin: e.passwordSetByAdmin ?? false,
      requirePasswordChange: e.requirePasswordChange ?? false,
      onboardingCompleted: e.onboardingCompleted === true,
      onboardingCompletedAt: e.onboardingCompletedAt ?? null,
      onboardingStatus: e.onboardingStatus,
      onboardingWorkflowStatus: e.onboardingWorkflowStatus ?? "not_started",
      onboardingCountry: e.onboardingCountry ?? "AU",
      legalFirstName: e.legalFirstName,
      legalMiddleNames: e.legalMiddleNames,
      legalLastName: e.legalLastName,
      preferredName: e.preferredName,
      timeZone: e.timeZone,
      locale: e.locale,
      nationality: e.nationality,
      isActive: e.isActive,
      isProbationary: e.isProbationary,
      probationEndDate: e.probationEndDate,
      terminatedAt: e.terminatedAt,
      terminationReason: e.terminationReason,
      skills: e.skills,
      certifications: e.certifications,
      emergencyContact: e.emergencyContact,
      address: e.address,
      passwordSetupExpiry: e.passwordSetupExpiry,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    } satisfies EmployeeDTO
  }
}

