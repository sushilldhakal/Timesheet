import { NextRequest, NextResponse } from "next/server"
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
  const validSortFields = ["name", "pin", "email", "phone", "hire", "createdAt"]
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
          { site: { $regex: search, $options: "i" } },
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
    const roleAssignments = await EmployeeRoleAssignment.find({
      employeeId: { $in: employeeIds },
      isActive: true,
    })
      .populate("roleId", "name color type")
      .populate("locationId", "name type")
      .lean()

    // Group assignments by employee ID
    const assignmentsByEmployee = new Map()
    for (const assignment of roleAssignments) {
      const empId = assignment.employeeId.toString()
      if (!assignmentsByEmployee.has(empId)) {
        assignmentsByEmployee.set(empId, [])
      }
      assignmentsByEmployee.get(empId).push({
        id: assignment._id.toString(),
        roleId: (assignment.roleId as any)._id.toString(),
        roleName: (assignment.roleId as any).name,
        roleColor: (assignment.roleId as any).color,
        locationId: (assignment.locationId as any)._id.toString(),
        locationName: (assignment.locationId as any).name,
        validFrom: assignment.validFrom,
        validTo: assignment.validTo,
        isActive: assignment.isActive,
      })
    }
    
    const normalized = employees.map((e) => {
      const assignments = assignmentsByEmployee.get(e._id.toString()) || []
      // Derive unique locations from role assignments
      const uniqueLocations = Array.from(
        new Set(assignments.map((a: any) => a.locationName))
      )
      
      return {
        id: e._id.toString(),
        name: e.name ?? "",
        pin: e.pin ?? "",
        role: [], // Deprecated - use roleAssignments field
        roleAssignments: assignments,
        employer: arr(e.employer),
        location: uniqueLocations, // Derived from roleAssignments
        hire: e.hire ?? "",
        site: e.site ?? "",
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
    })

    // Send onboarding email if email is provided
    if (employee.email) {
      try {
        // Fetch role assignments if any
        const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
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

    return NextResponse.json({
      employee: {
        id: employee._id,
        name: employee.name,
        pin: employee.pin,
        role: [], // Deprecated - use roleAssignments field
        roleAssignments: [], // New employees have no role assignments yet
        employer: employee.employer,
        location: employee.location ?? [],
        email: employee.email,
        phone: employee.phone,
        dob: employee.dob,
        comment: employee.comment,
        img: employee.img,
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
