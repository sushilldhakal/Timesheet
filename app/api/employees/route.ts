import mongoose from "mongoose"
import { getAuthWithUserLocations, employeeLocationFilter, getFilteredEmployeeIdsByRole } from "@/lib/auth/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { 
  employeeCreateSchema, 
  employeeQuerySchema, 
  employeesListResponseSchema, 
  employeeCreateResponseSchema 
} from "@/lib/validations/employee"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { sendEmail } from "@/lib/mail/sendEmail"
import { generateOnboardingEmail } from "@/lib/mail/templates/employee-onboarding"
import { generateOnboardingWithPasswordEmail } from "@/lib/mail/templates/employee-onboarding-with-password"
import { generateOnboardingSetupLinkEmail } from "@/lib/mail/templates/employee-onboarding-setup-link"
import { syncEmployeePhotoFromPunches } from "@/lib/utils/employees/employee-photo-sync"
import { generateTokenWithExpiry } from "@/lib/utils/auth/auth-tokens"
import { checkEmailExists } from "@/lib/utils/validation/email-validator"

/** GET /api/employees?search=...&limit=50&offset=0&location=...&role=...&employer=... - List employees with search and pagination */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees',
  summary: 'List employees',
  description: 'Get a paginated list of employees with optional search and filtering',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    query: employeeQuerySchema
  },
  responses: {
    200: employeesListResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const { query } = data
    const search = query?.search?.trim() ?? ""
    const locationFilter = query?.location?.trim() ?? ""
    const roleFilter = query?.role?.trim() ?? ""
    const employerFilter = query?.employer?.trim() ?? ""
    const limit = query?.limit ?? 50
    const offset = query?.offset ?? 0
    const sortByParam = query?.sortBy ?? "name"
    const orderParam = query?.order ?? "asc"
    
    // Parse multiple filter values (comma-separated)
    const locationFilters = locationFilter ? locationFilter.split(',').map(s => s.trim()).filter(Boolean) : []
    const roleFilters = roleFilter ? roleFilter.split(',').map(s => s.trim()).filter(Boolean) : []
    const employerFilters = employerFilter ? employerFilter.split(',').map(s => s.trim()).filter(Boolean) : []
    
    // Validate sortBy to prevent injection
    // role and location are handled via aggregation pipeline (lookup), not direct Employee fields
    const validSortFields = ["name", "pin", "email", "phone", "createdAt", "employer", "location", "role"]
    const sortBy = validSortFields.includes(sortByParam) ? sortByParam : "name"
    const order = orderParam === "desc" ? -1 : 1
    const needsAggregation = sortBy === "role" || sortBy === "location"

    try {
      await connectDB()

      const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
      const { Role, Location, Employer } = await import("@/lib/db")

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
      if (roleFilters.length > 0) {
        const roleCategories = await Role.find({
          name: { $in: roleFilters },
        }).lean()
        
        if (roleCategories.length > 0) {
          const roleIds = roleCategories.map((r) => r._id)
          
          const roleAssignments = await EmployeeRoleAssignment.find({
            roleId: { $in: roleIds },
            isActive: true
          }).distinct('employeeId')
          
          const roleFilteredIds = roleAssignments.map(id => id.toString())
          
          if (roleFilteredIds.length > 0) {
            andConditions.push({ _id: { $in: roleFilteredIds.map(id => new mongoose.Types.ObjectId(id)) } })
          } else {
            return {
              status: 200,
              data: { employees: [], total: 0, limit, offset }
            }
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

      let employees: any[]
      let total: number

      if (needsAggregation) {
        // ---------------------------------------------------------------
        // Aggregation path: sort by a joined field (role name or location
        // name) that lives in EmployeeRoleAssignment, not on Employee.
        // We $lookup the first active assignment, pull the joined name as
        // a sortable scalar, then $sort → $skip → $limit.
        // ---------------------------------------------------------------
        
        const roleAssignmentCollection = "employee_role_assignments"  // Explicit collection name
        const roleCollection = "roles"
        const locationCollection = "locations"

        const pipeline: object[] = [
          // 1. Apply the same filter we'd pass to .find()
          { $match: filter },

          // 2. Join to role assignments (only active ones)
          {
            $lookup: {
              from: roleAssignmentCollection,
              let: { empId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { 
                      $and: [
                        { $eq: ["$employeeId", "$$empId"] },
                        { $eq: ["$isActive", true] }
                      ]
                    }
                  }
                },
                { $sort: { assignedAt: 1 } },  // deterministic ordering
                { $limit: 1 },                  // only the "primary" assignment
              ],
              as: "_primaryAssignment"
            }
          },
          { $unwind: { path: "$_primaryAssignment", preserveNullAndEmptyArrays: true } }
        ]

        // Add role-specific stages
        if (sortBy === "role") {
          pipeline.push({
            $lookup: {
              from: roleCollection,
              localField: "_primaryAssignment.roleId",
              foreignField: "_id",
              as: "_roleCategory"
            }
          })
          pipeline.push({ $unwind: { path: "$_roleCategory", preserveNullAndEmptyArrays: true } })
          pipeline.push({ $addFields: { 
            _sortKey: { 
              $toLower: { 
                $ifNull: ["$_roleCategory.name", "zzz"] 
              } 
            } 
          } })
        }

        // Add location-specific stages
        if (sortBy === "location") {
          pipeline.push({
            $lookup: {
              from: locationCollection,
              localField: "_primaryAssignment.locationId",
              foreignField: "_id",
              as: "_locationCategory"
            }
          })
          pipeline.push({ $unwind: { path: "$_locationCategory", preserveNullAndEmptyArrays: true } })
          pipeline.push({ $addFields: { 
            _sortKey: { 
              $toLower: { 
                $ifNull: ["$_locationCategory.name", "zzz"] 
              } 
            } 
          } })
        }

        // Add final stages
        pipeline.push({ $sort: { _sortKey: order, name: 1 } })
        pipeline.push({
          $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: offset }, { $limit: limit }],
          }
        })

        try {
          const [result] = await Employee.aggregate(pipeline as any)
          total = result?.metadata?.[0]?.total ?? 0
          employees = result?.data ?? []
        } catch (aggError) {
          console.error('🚨 Aggregation error:', aggError)
          throw aggError
        }
      } else {
        // ---------------------------------------------------------------
        // Simple path: sort field exists directly on Employee
        // ---------------------------------------------------------------
        
        ;[employees, total] = await Promise.all([
          Employee.find(filter)
            .sort({ [sortBy]: order })
            .skip(offset)
            .limit(limit)
            .lean(),
          Employee.countDocuments(filter),
        ])
      }

      const arr = (v: unknown) => Array.isArray(v) ? v : v ? [String(v)] : []
      
      // Fetch role assignments for all employees
      const employeeIds = employees.map(e => e._id)
      
      const roleAssignments = await EmployeeRoleAssignment.find({
        employeeId: { $in: employeeIds },
        isActive: true,
      })
        .populate("roleId", "name color")
        .populate("locationId", "name")
        .lean()

      // Get all unique location IDs from role assignments (filter out null locations)
      const locationIds = Array.from(new Set(
        roleAssignments
          .filter(ra => ra.locationId && ra.locationId._id)
          .map(ra => ra.locationId._id.toString())
      ))
      
      // Fetch full location details
      const locations = await Location.find({
        _id: { $in: locationIds.map((id) => new mongoose.Types.ObjectId(id)) },
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
          validFrom: assignment.validFrom.toISOString(),
          validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
          isActive: assignment.isActive,
        })
      }
      
      // Fetch employer details for all employees
      const allEmployerNames = Array.from(
        new Set(employees.flatMap(e => arr(e.employer)))
      )
      const employers = await Employer.find({
        name: { $in: allEmployerNames },
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
          employmentType: e.employmentType ?? null,
          standardHoursPerWeek: e.standardHoursPerWeek ?? null,
          awardId: e.awardId ? e.awardId.toString() : null,
          awardLevel: e.awardLevel ?? null,
          createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: e.updatedAt ? e.updatedAt.toISOString() : new Date().toISOString(),
        }
      })

      // Deduplicate employees by ID (in case of any database issues)
      const uniqueEmployees = Array.from(
        new Map(normalized.map(emp => [emp.id, emp])).values()
      )

      return {
        status: 200,
        data: {
          employees: uniqueEmployees,
          total,
          limit,
          offset,
        }
      }
    } catch (err) {
      return {
        status: 500,
        data: { error: "Failed to fetch employees" }
      }
    }
  }
})

/** POST /api/employees - Create employee */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees',
  summary: 'Create employee',
  description: 'Create a new employee with optional role assignments and email setup',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    body: employeeCreateSchema
  },
  responses: {
    200: employeeCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const { body } = data
    if (!body) {
      return {
        status: 400,
        data: { error: "Request body is required" }
      }
    }

    try {
      await connectDB()
      const { Role, Location } = await import("@/lib/db")

      // Check email uniqueness if email provided
      if (body.email) {
        const emailCheck = await checkEmailExists(body.email)
        if (emailCheck.exists) {
          return {
            status: 409,
            data: { error: "Email already in use" }
          }
        }
      }

      const existing = await Employee.findOne({ pin: body.pin.trim() })
      if (existing) {
        return {
          status: 409,
          data: { error: "PIN already in use" }
        }
      }

      // Prepare employee data
      const employeeData: any = {
        name: body.name.trim(),
        pin: body.pin.trim(),
        employer: body.employer ?? [],
        location: body.location ?? [],
        email: body.email ?? "",
        phone: body.phone ?? "",
        homeAddress: body.homeAddress ?? "",
        dob: body.dob ?? "",
        gender: body.gender ?? "",
        comment: body.comment ?? "",
        img: body.img ?? "",
        employmentType: body.employmentType ?? null,
        standardHoursPerWeek: body.standardHoursPerWeek ?? null,
        awardId: body.awardId ? new mongoose.Types.ObjectId(body.awardId) : null,
        awardLevel: body.awardLevel ?? null,
      }

      // Handle password setup
      let setupToken: string | undefined
      if (body.password) {
        // Admin set password - employee must change on first login
        employeeData.password = body.password
        employeeData.passwordSetByAdmin = true
        employeeData.requirePasswordChange = true
      } else if (body.sendSetupEmail && body.email) {
        // Generate setup token for email link
        const tokenData = generateTokenWithExpiry(24) // 24 hours
        setupToken = tokenData.token // Store raw token for email
        employeeData.passwordSetupToken = tokenData.hashedToken
        employeeData.passwordSetupExpiry = tokenData.expiry
      }

      const employee = await Employee.create(employeeData)

      // Create role assignments if roles and locations are provided
      const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")

      const createdAssignments = []
      
      if (body.role && body.role.length > 0 && body.location && body.location.length > 0) {
        // Fetch role and location IDs from names
        const roleCategories = await Role.find({
          name: { $in: body.role },
        }).lean()
        
        const locationCategories = await Location.find({
          name: { $in: body.location },
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
          
          if (body.password) {
            // Admin set password - send welcome email with password info
            emailContent = generateOnboardingWithPasswordEmail({
              name: employee.name,
              pin: employee.pin,
              email: employee.email,
              phone: employee.phone || "Not provided",
              roles: roles.length > 0 ? roles : undefined,
              locations: locations.length > 0 ? locations : undefined,
            })
          } else if (body.sendSetupEmail && setupToken) {
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
          validFrom: a.validFrom.toISOString(),
          validTo: a.validTo ? a.validTo.toISOString() : null,
          isActive: a.isActive,
        }
      })

      return {
        status: 200,
        data: {
          employee: {
            id: employee._id.toString(),
            name: employee.name,
            pin: employee.pin,
            roles: formattedAssignments,
            employers: [], // Will be populated based on employer field
            locations: [], // Will be populated from role assignments
            email: employee.email || "",
            phone: employee.phone || "",
            homeAddress: employee.homeAddress || "",
            dob: employee.dob || "",
            gender: employee.gender || "",
            comment: employee.comment || "",
            img: employee.img || "",
            employmentType: employee.employmentType || null,
            standardHoursPerWeek: employee.standardHoursPerWeek ?? null,
            awardId: employee.awardId ? employee.awardId.toString() : null,
            awardLevel: employee.awardLevel || null,
            createdAt: employee.createdAt ? employee.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: employee.updatedAt ? employee.updatedAt.toISOString() : new Date().toISOString(),
          },
        }
      }
    } catch (err) {
      return {
        status: 500,
        data: { error: "Failed to create employee" }
      }
    }
  }
})
