import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { getAuthWithUserLocations, employeeLocationFilter, getFilteredEmployeeIdsByRole } from "@/lib/auth/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { employeeCreateSchema } from "@/lib/validations/employee"
import { sendEmail } from "@/lib/mail/sendEmail"
import { generateOnboardingEmail } from "@/lib/mail/templates/employee-onboarding"
import { generateOnboardingWithPasswordEmail } from "@/lib/mail/templates/employee-onboarding-with-password"
import { generateOnboardingSetupLinkEmail } from "@/lib/mail/templates/employee-onboarding-setup-link"
import { syncEmployeePhotoFromPunches } from "@/lib/utils/employee-photo-sync"
import { generateTokenWithExpiry } from "@/lib/utils/auth-tokens"
import { checkEmailExists } from "@/lib/utils/email-validator"

/** GET /api/employees?search=...&limit=50&offset=0&location=...&role=...&employer=... - List employees with search and pagination */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const locationFilter = searchParams.get("location")?.trim() ?? ""
  const roleFilter = searchParams.get("role")?.trim() ?? ""
  const employerFilter = searchParams.get("employer")?.trim() ?? ""
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")
  const sortByParam = searchParams.get("sortBy")?.trim() ?? "name"
  const orderParam = searchParams.get("order")?.trim().toLowerCase() ?? "asc"
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 1000) : 50
  const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0
  
  // Parse multiple filter values (comma-separated)
  const locationFilters = locationFilter ? locationFilter.split(',').map(s => s.trim()).filter(Boolean) : []
  const roleFilters = roleFilter ? roleFilter.split(',').map(s => s.trim()).filter(Boolean) : []
  const employerFilters = employerFilter ? employerFilter.split(',').map(s => s.trim()).filter(Boolean) : []
  
  // Validate sortBy to prevent injection
  const validSortFields = ["name", "pin", "email", "phone", "createdAt", "employer", "location"]
  const sortBy = validSortFields.includes(sortByParam) ? sortByParam : "name"
  const order = orderParam === "desc" ? -1 : 1

  try {
    await connectDB()

    const andConditions: Record<string, unknown>[] = []
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) andConditions.push(locFilter)

    // Add role-based filtering
    const roleFilteredEmployeeIds = await getFilteredEmployeeIdsByRole(ctx.userLocations, ctx.managedRoles)
    if (roleFilteredEmployeeIds !== null) {
      // User has managed roles - filter to only those employees
      andConditions.push({ _id: { $in: roleFilteredEmployeeIds } })
    }

    // Add location filters if provided
    if (locationFilters.length > 0) {
      andConditions.push({ location: { $in: locationFilters } })
    }

    // Add employer filters if provided
    if (employerFilters.length > 0) {
      andConditions.push({ employer: { $in: employerFilters } })
    }

    // Add role filters if provided - need to check role assignments
    let roleFilteredIds: string[] | null = null
    if (roleFilters.length > 0) {
      const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
      const { Category } = await import("@/lib/db")
      
      // Find role categories by name
      const roleCategories = await Category.find({
        name: { $in: roleFilters },
        type: "role"
      }).lean()
      
      if (roleCategories.length > 0) {
        const roleIds = roleCategories.map(r => r._id)
        
        // Find employees with these roles
        const roleAssignments = await EmployeeRoleAssignment.find({
          roleId: { $in: roleIds },
          isActive: true
        }).distinct('employeeId')
        
        roleFilteredIds = roleAssignments.map(id => id.toString())
        
        if (roleFilteredIds.length > 0) {
          andConditions.push({ _id: { $in: roleFilteredIds.map(id => new mongoose.Types.ObjectId(id)) } })
        } else {
          // No employees found with these roles - return empty result
          return NextResponse.json({
            employees: [],
            total: 0,
            limit,
            offset,
          })
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

    // Group assignments by employee ID and deduplicate
    const assignmentsByEmployee = new Map()
    for (const assignment of roleAssignments) {
      const empId = assignment.employeeId.toString()
      if (!assignmentsByEmployee.has(empId)) {
        assignmentsByEmployee.set(empId, [])
      }
      
      // Skip assignments with null locationId or roleId
      if (!assignment.locationId || !assignment.roleId) {
        continue
      }
      
      const assignmentId = assignment._id.toString()
      const existingAssignments = assignmentsByEmployee.get(empId)
      
      // Check if this assignment already exists (prevent duplicates)
      const isDuplicate = existingAssignments.some((existing: any) => existing.id === assignmentId)
      if (isDuplicate) {
        continue
      }
      
      const location = locationMap.get((assignment.locationId as any)._id.toString())
      
      assignmentsByEmployee.get(empId).push({
        id: assignmentId,
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
      
      // Background sync photo if missing (non-blocking)
      if (!e.img || e.img === "") {
        syncEmployeePhotoFromPunches(e.pin).catch(() => {
          // Silently handle photo sync errors
        });
      }
      
      return {
        id: e._id.toString(),
        name: e.name ?? "",
        pin: e.pin ?? "",
        roles: assignments, // Nested structure with role and location objects
        employers: employerDetails, // Detailed employer structure
        locations: uniqueLocations, // Detailed location structure
        email: e.email ?? "",
        phone: e.phone ?? "",
        homeAddress: e.homeAddress ?? "",
        dob: e.dob ?? "",
        gender: e.gender ?? "",
        comment: e.comment ?? "",
        img: e.img ?? "",
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }
    })

    // Deduplicate employees by ID (in case of any database issues)
    const uniqueEmployees = Array.from(
      new Map(normalized.map(emp => [emp.id, emp])).values()
    )

    return NextResponse.json({
      employees: uniqueEmployees,
      total,
      limit,
      offset,
    })
  } catch (err) {
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

    // Check email uniqueness if email provided
    if (data.email) {
      const emailCheck = await checkEmailExists(data.email)
      if (emailCheck.exists) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        )
      }
    }

    const existing = await Employee.findOne({ pin: data.pin.trim() })
    if (existing) {
      return NextResponse.json(
        { error: "PIN already in use" },
        { status: 409 }
      )
    }

    // Prepare employee data
    const employeeData: any = {
      name: data.name.trim(),
      pin: data.pin.trim(),
      employer: data.employer ?? [],
      location: data.location ?? [],
      email: data.email ?? "",
      phone: data.phone ?? "",
      homeAddress: data.homeAddress ?? "",
      dob: data.dob ?? "",
      gender: data.gender ?? "",
      comment: data.comment ?? "",
      img: data.img ?? "",
      employmentType: data.employmentType ?? null,
      standardHoursPerWeek: data.standardHoursPerWeek ?? null,
      awardId: data.awardId ? new mongoose.Types.ObjectId(data.awardId) : null,
      awardLevel: data.awardLevel ?? null,
    }
    
    console.log('[Employee Create] Employee data:', {
      gender: employeeData.gender,
      homeAddress: employeeData.homeAddress,
    })

    // Handle password setup
    let setupToken: string | undefined
    if (data.password) {
      // Admin set password - employee must change on first login
      employeeData.password = data.password
      employeeData.passwordSetByAdmin = true
      employeeData.requirePasswordChange = true
    } else if (data.sendSetupEmail && data.email) {
      // Generate setup token for email link
      const tokenData = generateTokenWithExpiry(24) // 24 hours
      setupToken = tokenData.token // Store raw token for email
      employeeData.passwordSetupToken = tokenData.hashedToken
      employeeData.passwordSetupExpiry = tokenData.expiry
    }

    const employee = await Employee.create(employeeData)

    // Create role assignments if roles and locations are provided
    const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
    const { Category } = await import("@/lib/db")
    
    const createdAssignments = []
    

    
    if (data.role && data.role.length > 0 && data.location && data.location.length > 0) {
      // Fetch role and location IDs from category names
      const roleCategories = await Category.find({
        name: { $in: data.role },
        type: "role"
      }).lean()
      

      
      const locationCategories = await Category.find({
        name: { $in: data.location },
        type: "location"
      }).lean()
      

      
      // Create role assignments for each role-location combination
      const now = new Date()
      for (const roleCategory of roleCategories) {
        for (const locationCategory of locationCategories) {
          try {

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

          } catch (assignmentError) {
            // Continue with other assignments even if one fails
          }
        }
      }
      

    } else {

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

        let emailContent
        
        if (data.password) {
          // Admin set password - send welcome email with password info
          emailContent = generateOnboardingWithPasswordEmail({
            name: employee.name,
            pin: employee.pin,
            email: employee.email,
            phone: employee.phone || "Not provided",
            roles: roles.length > 0 ? roles : undefined,
            locations: locations.length > 0 ? locations : undefined,
          })
        } else if (data.sendSetupEmail && setupToken) {
          // Send setup link email
          const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/setup-password?token=${setupToken}`
          emailContent = generateOnboardingSetupLinkEmail({
            name: employee.name,
            pin: employee.pin,
            email: employee.email,
            phone: employee.phone || "Not provided",
            roles: roles.length > 0 ? roles : undefined,
            locations: locations.length > 0 ? locations : undefined,
            setupUrl,
          })
        } else {
          // No password setup - send basic onboarding email
          emailContent = generateOnboardingEmail({
            name: employee.name,
            pin: employee.pin,
            email: employee.email,
            phone: employee.phone || "Not provided",
            roles: roles.length > 0 ? roles : undefined,
            locations: locations.length > 0 ? locations : undefined,
          })
        }

        await sendEmail({
          to: employee.email,
          subject: "Welcome to Timesheet - Your Account Details",
          html: emailContent.html,
          plain: emailContent.plain,
        })


      } catch (emailError) {
        // Log error but don't fail the employee creation
      }
    }

    // Fetch the created role assignments with populated data for response

    const populatedAssignments = await EmployeeRoleAssignment.find({
      employeeId: employee._id,
      isActive: true,
    })
      .populate("roleId", "name color")
      .populate("locationId", "name address lat lng radius geofenceMode openingHour closingHour workingDays")
      .lean()


    
    const formattedAssignments = populatedAssignments.map((a: any) => {

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
        homeAddress: employee.homeAddress,
        dob: employee.dob,
        gender: employee.gender,
        comment: employee.comment,
        img: employee.img,
        employmentType: employee.employmentType,
        standardHoursPerWeek: employee.standardHoursPerWeek,
        awardId: employee.awardId,
        awardLevel: employee.awardLevel,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    )
  }
}
