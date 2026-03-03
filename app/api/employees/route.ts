import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { employeeCreateSchema } from "@/lib/validation/employee"
import { sendEmail } from "@/lib/mail/sendEmail"
import { generateOnboardingEmail } from "@/lib/mail/templates/employee-onboarding"

/** GET /api/employees?search=...&limit=50&offset=0&location=... - List employees with search and pagination */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const locationFilter = searchParams.get("location")?.trim() ?? ""
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")
  const sortByParam = searchParams.get("sortBy")?.trim() ?? "name"
  const orderParam = searchParams.get("order")?.trim().toLowerCase() ?? "asc"
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 1000) : 50
  const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0
  
  // Validate sortBy to prevent injection
  const validSortFields = ["name", "pin", "email", "phone", "createdAt", "role", "employer", "location"]
  const sortBy = validSortFields.includes(sortByParam) ? sortByParam : "name"
  const order = orderParam === "desc" ? -1 : 1

  try {
    await connectDB()

    const andConditions: Record<string, unknown>[] = []
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) andConditions.push(locFilter)

    // Add location filter if provided
    if (locationFilter) {
      andConditions.push({ location: locationFilter })
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

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .sort({ [sortBy]: order })
        .skip(offset)
        .limit(limit)
        .lean(),
      Employee.countDocuments(filter),
    ])

    const arr = (v: unknown) => Array.isArray(v) ? v : v ? [String(v)] : []
    
    // Fetch role assignments for all employees
    const employeeIds = employees.map(e => e._id)
    const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
    const { Category } = await import("@/lib/db")
    
    const roleAssignments = await EmployeeRoleAssignment.find({
      employeeId: { $in: employeeIds },
      isActive: true,
    })
      .populate("roleId", "name color type")
      .populate("locationId", "name type")
      .lean()

    // Get all unique location IDs from role assignments (filter out null locations)
    const locationIds = Array.from(new Set(
      roleAssignments
        .filter(ra => ra.locationId && ra.locationId._id)
        .map(ra => ra.locationId._id.toString())
    ))
    
    // Fetch full location details
    const locations = await Category.find({
      _id: { $in: locationIds },
      type: "location"
    }).lean()
    
    const locationMap = new Map(
      locations.map(loc => [
        loc._id.toString(),
        {
          id: loc._id.toString(),
          name: loc.name,
          address: loc.address || "",
          lat: loc.lat,
          lng: loc.lng,
          geofence: {
            radius: loc.radius || 100,
            mode: loc.geofenceMode || "soft"
          },
          hours: {
            opening: loc.openingHour,
            closing: loc.closingHour,
            workingDays: loc.workingDays || []
          }
        }
      ])
    )

    // Group assignments by employee ID
    const assignmentsByEmployee = new Map()
    for (const assignment of roleAssignments) {
      const empId = assignment.employeeId.toString()
      if (!assignmentsByEmployee.has(empId)) {
        assignmentsByEmployee.set(empId, [])
      }
      
      // Skip assignments with null locationId or roleId
      if (!assignment.locationId || !assignment.roleId) {
        console.warn(`Skipping assignment ${assignment._id} with null locationId or roleId`)
        continue
      }
      
      const location = locationMap.get((assignment.locationId as any)._id.toString())
      
      assignmentsByEmployee.get(empId).push({
        id: assignment._id.toString(),
        role: {
          id: (assignment.roleId as any)._id.toString(),
          name: (assignment.roleId as any).name,
          color: (assignment.roleId as any).color,
        },
        location: location || {
          id: (assignment.locationId as any)._id.toString(),
          name: (assignment.locationId as any).name,
          address: "",
          lat: undefined,
          lng: undefined,
          geofence: { radius: 100, mode: "soft" },
          hours: { opening: undefined, closing: undefined, workingDays: [] }
        },
        validFrom: assignment.validFrom,
        validTo: assignment.validTo,
        isActive: assignment.isActive,
      })
    }
    
    // Fetch employer details for all employees
    const allEmployerNames = Array.from(
      new Set(employees.flatMap(e => arr(e.employer)))
    )
    const employers = await Category.find({
      name: { $in: allEmployerNames },
      type: "employer"
    }).select("_id name color").lean()
    
    const employerMap = new Map(
      employers.map(emp => [
        emp.name,
        {
          id: emp._id.toString(),
          name: emp.name,
          color: emp.color
        }
      ])
    )
    
    const normalized = employees.map((e) => {
      const assignments = assignmentsByEmployee.get(e._id.toString()) || []
      
      // Get unique locations from role assignments
      const uniqueLocations = Array.from(
        new Map(assignments.map((a: any) => [a.location.id, a.location])).values()
      )
      
      // Get employer details
      const employerDetails = arr(e.employer)
        .map(name => employerMap.get(name))
        .filter(Boolean)
      
      return {
        id: e._id.toString(),
        name: e.name ?? "",
        pin: e.pin ?? "",
        roles: assignments, // Nested structure with role and location objects
        employers: employerDetails, // Detailed employer structure
        locations: uniqueLocations, // Detailed location structure
        email: e.email ?? "",
        phone: e.phone ?? "",
        dob: e.dob ?? "",
        comment: e.comment ?? "",
        img: e.img ?? "",
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }
    })

    return NextResponse.json({
      employees: normalized,
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error("[api/employees GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    )
  }
}

/** POST /api/employees - Create employee */
export async function POST(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = employeeCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const data = parsed.data

    await connectDB()

    const existing = await Employee.findOne({ pin: data.pin.trim() })
    if (existing) {
      return NextResponse.json(
        { error: "PIN already in use" },
        { status: 409 }
      )
    }

    const employee = await Employee.create({
      name: data.name.trim(),
      pin: data.pin.trim(),
      // Note: role field is deprecated - use EmployeeRoleAssignment API instead
      employer: data.employer ?? [],
      location: data.location ?? [],
      email: data.email ?? "",
      phone: data.phone ?? "",
      dob: data.dob ?? "",
      comment: data.comment ?? "",
      img: data.img ?? "",
      employmentType: data.employmentType ?? null,
      standardHoursPerWeek: data.standardHoursPerWeek ?? null,
      awardId: data.awardId ? new mongoose.Types.ObjectId(data.awardId) : null,
      awardLevel: data.awardLevel ?? null,
    })

    // Create role assignments if roles and locations are provided
    const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
    const { Category } = await import("@/lib/db")
    
    const createdAssignments = []
    
    console.log(`[Employee Creation] Processing role assignments for ${employee.name}`)
    console.log(`[Employee Creation] Roles from request:`, data.role)
    console.log(`[Employee Creation] Locations from request:`, data.location)
    
    if (data.role && data.role.length > 0 && data.location && data.location.length > 0) {
      // Fetch role and location IDs from category names
      const roleCategories = await Category.find({
        name: { $in: data.role },
        type: "role"
      }).lean()
      
      console.log(`[Employee Creation] Found ${roleCategories.length} role categories:`, roleCategories.map(r => ({ id: r._id, name: r.name })))
      
      const locationCategories = await Category.find({
        name: { $in: data.location },
        type: "location"
      }).lean()
      
      console.log(`[Employee Creation] Found ${locationCategories.length} location categories:`, locationCategories.map(l => ({ id: l._id, name: l.name })))
      
      // Create role assignments for each role-location combination
      const now = new Date()
      for (const roleCategory of roleCategories) {
        for (const locationCategory of locationCategories) {
          try {
            console.log(`[Employee Creation] Creating assignment: employeeId=${employee._id}, roleId=${roleCategory._id}, locationId=${locationCategory._id}`)
            const assignment = await EmployeeRoleAssignment.create({
              employeeId: employee._id,
              roleId: roleCategory._id,
              locationId: locationCategory._id,
              validFrom: now,
              validTo: null,
              isActive: true,
              assignedBy: new mongoose.Types.ObjectId(ctx.auth.sub),
              assignedAt: now,
              notes: "Auto-assigned during employee creation",
            })
            createdAssignments.push(assignment)
            console.log(`[Employee Creation] ✓ Created assignment ID ${assignment._id}: ${roleCategory.name} at ${locationCategory.name}`)
          } catch (assignmentError) {
            console.error(`[Employee Creation] ✗ Failed to create role assignment:`, assignmentError)
            // Continue with other assignments even if one fails
          }
        }
      }
      
      console.log(`[Employee Creation] Total assignments created: ${createdAssignments.length}`)
    } else {
      console.log(`[Employee Creation] Skipping role assignments - roles or locations missing`)
      console.log(`[Employee Creation] Has roles: ${!!(data.role && data.role.length > 0)}`)
      console.log(`[Employee Creation] Has locations: ${!!(data.location && data.location.length > 0)}`)
    }

    // Send onboarding email if email is provided
    if (employee.email) {
      try {
        // Fetch role assignments
        const roleAssignments = await EmployeeRoleAssignment.find({
          employeeId: employee._id,
          isActive: true,
        })
          .populate("roleId", "name")
          .populate("locationId", "name")
          .lean()

        const roles = roleAssignments.map((a: any) => a.roleId?.name).filter(Boolean)
        const locations = Array.from(
          new Set(roleAssignments.map((a: any) => a.locationId?.name).filter(Boolean))
        )

        const emailContent = generateOnboardingEmail({
          name: employee.name,
          pin: employee.pin,
          email: employee.email,
          phone: employee.phone || "Not provided",
          roles: roles.length > 0 ? roles : undefined,
          locations: locations.length > 0 ? locations : undefined,
        })

        await sendEmail({
          to: employee.email,
          subject: "Welcome to Timesheet - Your Account Details",
          html: emailContent.html,
          plain: emailContent.plain,
        })

        console.log(`[Employee Onboarding] Email sent to ${employee.email}`)
      } catch (emailError) {
        // Log error but don't fail the employee creation
        console.error("[Employee Onboarding] Failed to send email:", emailError)
      }
    }

    // Fetch the created role assignments with populated data for response
    console.log(`[Employee Creation] Fetching role assignments for employee ${employee._id}`)
    const populatedAssignments = await EmployeeRoleAssignment.find({
      employeeId: employee._id,
      isActive: true,
    })
      .populate("roleId", "name color")
      .populate("locationId", "name address lat lng radius geofenceMode openingHour closingHour workingDays")
      .lean()

    console.log(`[Employee Creation] Found ${populatedAssignments.length} populated assignments for response`)
    
    const formattedAssignments = populatedAssignments.map((a: any) => {
      console.log(`[Employee Creation] Formatting assignment:`, {
        id: a._id,
        roleId: a.roleId?._id,
        roleName: a.roleId?.name,
        locationId: a.locationId?._id,
        locationName: a.locationId?.name
      })
      return {
        id: a._id.toString(),
        role: {
          id: a.roleId._id.toString(),
          name: a.roleId.name,
          color: a.roleId.color,
        },
        location: {
          id: a.locationId._id.toString(),
          name: a.locationId.name,
        address: a.locationId.address || "",
        lat: a.locationId.lat,
        lng: a.locationId.lng,
        geofence: {
          radius: a.locationId.radius || 100,
          mode: a.locationId.geofenceMode || "soft"
        },
        hours: {
          opening: a.locationId.openingHour,
          closing: a.locationId.closingHour,
          workingDays: a.locationId.workingDays || []
        }
      },
        validFrom: a.validFrom,
        validTo: a.validTo,
        isActive: a.isActive,
      }
    })

    console.log(`[Employee Creation] Formatted ${formattedAssignments.length} assignments for response`)

    return NextResponse.json({
      employee: {
        id: employee._id,
        name: employee.name,
        pin: employee.pin,
        role: [], // Deprecated - use roles field
        roles: formattedAssignments,
        employer: employee.employer,
        location: employee.location ?? [],
        email: employee.email,
        phone: employee.phone,
        dob: employee.dob,
        comment: employee.comment,
        img: employee.img,
        employmentType: employee.employmentType,
        standardHoursPerWeek: employee.standardHoursPerWeek,
        awardId: employee.awardId,
        awardLevel: employee.awardLevel,
      },
    })
  } catch (err) {
    console.error("[api/employees POST]", err)
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    )
  }
}
