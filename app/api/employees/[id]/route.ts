import mongoose from "mongoose"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth/auth-api"
import { connectDB, Employee, Employer, Location, Role } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema, 
  employeeDetailResponseSchema,
  employeeDeleteResponseSchema
} from "@/lib/validations/employee-detail"
import { employeeUpdateSchema } from "@/lib/validations/employee"
import { errorResponseSchema } from "@/lib/validations/auth"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import Award from "@/lib/db/schemas/award"

type RouteContext = { params: Promise<{ id: string }> }

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : v != null && v !== "" ? [String(v).trim()] : []

async function toEmployeeRow(e: { _id: unknown; name?: string; pin?: string; role?: string | string[]; employer?: string | string[]; location?: string[]; email?: string; phone?: string; homeAddress?: string; dob?: string; gender?: string; comment?: string; img?: string; awardId?: unknown; awardLevel?: string | null; employmentType?: string | null; standardHoursPerWeek?: number | null; createdAt?: Date; updatedAt?: Date; passwordSetByAdmin?: boolean; requirePasswordChange?: boolean }, roleAssignments: any[] = []) {
  // Get unique location IDs from active role assignments
  const locationIds = Array.from(new Set(roleAssignments.map(ra => ra.locationId.toString())))
  
  // Fetch full location details with geofence and hours
  const locations = await Location.find({
    _id: { $in: locationIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean()
  
  const locationData = locations.map((loc) => ({
    id: loc._id.toString(),
    name: loc.name,
    color: loc.color,
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
  }))
  
  // Fetch employer details
  const employerNames = arr(e.employer)
  const employers = await Employer.find({
    name: { $in: employerNames },
  }).select("_id name color").lean()
  
  const employerData = employers.map((emp) => ({
    id: emp._id.toString(),
    name: emp.name,
    color: emp.color
  }))
  
  // Fetch award details
  let awardData = null
  if (e.awardId) {
    const award = await Award.findById(e.awardId).select("_id name description").lean()
    if (award && !Array.isArray(award)) {
      awardData = {
        id: String(award._id),
        name: String(award.name || ""),
        level: e.awardLevel || "",
        description: String(award.description || "")
      }
    }
  }
  
  // Format role assignments with nested objects
  const formattedRoles = roleAssignments.map(ra => {
    const location = locationData.find(l => l.id === ra.locationId)
    return {
      id: ra.id,
      role: {
        id: ra.roleId,
        name: ra.roleName,
        color: ra.roleColor
      },
      location: location || {
        id: ra.locationId,
        name: ra.locationName,
        color: undefined,
        address: "",
        lat: undefined,
        lng: undefined,
        geofence: { radius: 100, mode: "soft" },
        hours: { opening: undefined, closing: undefined, workingDays: [] }
      },
      validFrom: ra.validFrom,
      validTo: ra.validTo,
      isActive: ra.isActive
    }
  })
  
  return {
    id: e._id,
    name: e.name ?? "",
    pin: e.pin ?? "",
    email: e.email ?? "",
    phone: e.phone ?? "",
    homeAddress: e.homeAddress ?? "",
    img: e.img ?? "",
    dob: e.dob ?? "",
    gender: e.gender ?? "",
    employmentType: e.employmentType,
    standardHoursPerWeek: e.standardHoursPerWeek ?? undefined,
    comment: e.comment ?? "",
    award: awardData,
    roles: formattedRoles,
    employers: employerData,
    locations: locationData,
    passwordSetByAdmin: e.passwordSetByAdmin ?? false,
    requirePasswordChange: e.requirePasswordChange ?? false,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

/** GET /api/employees/[id] - Get single employee */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}',
  summary: 'Get single employee',
  description: 'Get detailed employee information including roles, locations, and assignments',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema
  },
  responses: {
    200: employeeDetailResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    if (!params) {
      return {
        status: 400,
        data: { error: "Employee ID is required" }
      };
    }

    const { id } = params;

    try {
      await connectDB()
      const empFilter: Record<string, unknown> = { _id: id }
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) {
        empFilter.$and = [locFilter]
      }
      const employee = await Employee.findOne(empFilter).lean()
      if (!employee) {
        return {
          status: 404,
          data: { error: "Employee not found" }
        };
      }
      
      // Fetch role assignments for this employee
      console.log(`[GET Employee] Fetching role assignments for employee ${id}`)
      const roleAssignments = await EmployeeRoleAssignment.find({
        employeeId: id,
        isActive: true,
      })
        .populate("roleId", "name color type")
        .populate("locationId", "name type")
        .lean()
      
      console.log(`[GET Employee] Found ${roleAssignments.length} role assignments`)
      
      const formattedAssignments = roleAssignments.map(assignment => {
        const formatted = {
          id: assignment._id.toString(),
          roleId: (assignment.roleId as any)._id.toString(),
          roleName: (assignment.roleId as any).name,
          roleColor: (assignment.roleId as any).color,
          locationId: (assignment.locationId as any)._id.toString(),
          locationName: (assignment.locationId as any).name,
          validFrom: assignment.validFrom,
          validTo: assignment.validTo,
          isActive: assignment.isActive,
        }
        console.log(`[GET Employee] Formatted assignment:`, formatted)
        return formatted
      })
      
      console.log(`[GET Employee] Returning employee with ${formattedAssignments.length} role assignments`)
      return {
        status: 200,
        data: { employee: await toEmployeeRow(employee, formattedAssignments) }
      };
    } catch (err) {
      console.error("[api/employees/[id] GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch employee" }
      };
    }
  }
});

/** PATCH /api/employees/[id] - Update employee */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}',
  summary: 'Update employee',
  description: 'Update employee information and role assignments',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: employeeUpdateSchema
  },
  responses: {
    200: employeeDetailResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    if (!params || !body) {
      return {
        status: 400,
        data: { error: "Employee ID and request body are required" }
      };
    }

    const { id } = params;

    try {
      await connectDB()
      
      const empFilter: Record<string, unknown> = { _id: id }
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
      const existing = await Employee.findOne(empFilter)
      if (!existing) {
        return {
          status: 404,
          data: { error: "Employee not found" }
        };
      }

      const data = body
      const updates: Record<string, unknown> = {}
      
      console.log('[Employee Update] Received data:', {
        gender: data.gender,
        homeAddress: data.homeAddress,
      })
      
      if (data.name !== undefined) updates.name = data.name.trim()
      if (data.pin !== undefined) {
        const dup = await Employee.findOne({ pin: data.pin.trim(), _id: { $ne: id } })
        if (dup) {
          return {
            status: 409,
            data: { error: "PIN already in use" }
          };
        }
        updates.pin = data.pin.trim()
      }
      // Note: role field is deprecated - use EmployeeRoleAssignment API instead
      if (data.employer !== undefined) updates.employer = arr(data.employer)
      if (data.location !== undefined) updates.location = arr(data.location)
      if (data.email !== undefined) updates.email = (data.email ?? "").toString().trim()
      if (data.phone !== undefined) updates.phone = (data.phone ?? "").toString().trim()
      if (data.homeAddress !== undefined) updates.homeAddress = (data.homeAddress ?? "").toString().trim()
      if (data.dob !== undefined) updates.dob = (data.dob ?? "").toString().trim()
      if (data.gender !== undefined) updates.gender = (data.gender ?? "").toString().trim()
      if (data.comment !== undefined) updates.comment = (data.comment ?? "").toString().trim()
      if (data.img !== undefined) updates.img = (data.img ?? "").toString().trim()
      if (data.standardHoursPerWeek !== undefined) updates.standardHoursPerWeek = data.standardHoursPerWeek
      if (data.employmentType !== undefined) updates.employmentType = data.employmentType || null
      if (data.awardId !== undefined) {
        updates.awardId = data.awardId ? new mongoose.Types.ObjectId(data.awardId) : null
      }
      if (data.awardLevel !== undefined) updates.awardLevel = data.awardLevel || null
      
      // Handle password setup
      if (data.password) {
        // Admin set password - employee must change on first login
        // Hash the password manually since we're using findByIdAndUpdate
        const bcrypt = await import("bcrypt")
        const hashedPassword = bcrypt.hashSync(data.password, 10)
        updates.password = hashedPassword
        updates.passwordSetByAdmin = true
        updates.requirePasswordChange = true
        updates.passwordChangedAt = new Date()
        
        console.log('[Employee Update] Setting password:', {
          originalLength: data.password.length,
          hashedLength: hashedPassword.length,
          passwordSetByAdmin: true,
          requirePasswordChange: true
        })
      } else if (data.sendSetupEmail && data.email) {
        // Generate setup token for email link
        const { generateTokenWithExpiry } = await import("@/lib/utils/auth/auth-tokens")
        const tokenData = generateTokenWithExpiry(24) // 24 hours
        updates.passwordSetupToken = tokenData.hashedToken
        updates.passwordSetupExpiry = tokenData.expiry
        // Clear any existing password since we're sending setup email
        updates.password = null
        updates.passwordSetByAdmin = false
        updates.requirePasswordChange = false
        updates.passwordChangedAt = null
      }
      
      console.log('[Employee Update] Updates object:', {
        gender: updates.gender,
        homeAddress: updates.homeAddress,
      })

      // Update role assignments if role or location changed
      if (data.role !== undefined || data.location !== undefined) {
        console.log(`[Employee Update] Syncing role assignments for employee ${id}`)
        
        // Get the role and location arrays (use existing if not provided in update)
        const roleNames = data.role !== undefined ? arr(data.role) : []
        const locationNames = data.location !== undefined ? arr(data.location) : []
        
        console.log(`[Employee Update] Roles:`, roleNames)
        console.log(`[Employee Update] Locations:`, locationNames)
        
        if (roleNames.length > 0 && locationNames.length > 0) {
          // Fetch role and location categories
          const roleCategories = await Role.find({
            name: { $in: roleNames },
          }).lean()
          
          const locationCategories = await Location.find({
            name: { $in: locationNames },
          }).lean()
          
          console.log(`[Employee Update] Found ${roleCategories.length} roles, ${locationCategories.length} locations`)
          
          // Get existing active assignments
          const existingAssignments = await EmployeeRoleAssignment.find({
            employeeId: id,
            isActive: true,
          }).lean()
          
          // Build set of desired role-location combinations
          const desiredCombos = new Set<string>()
          for (const role of roleCategories) {
            for (const location of locationCategories) {
              desiredCombos.add(`${role._id}-${location._id}`)
            }
          }
          
          // Build set of existing combinations
          const existingCombos = new Map<string, any>()
          for (const assignment of existingAssignments) {
            const key = `${assignment.roleId}-${assignment.locationId}`
            existingCombos.set(key, assignment)
          }
          
          // Deactivate assignments that are no longer needed
          const now = new Date()
          for (const [key, assignment] of existingCombos) {
            if (!desiredCombos.has(key)) {
              console.log(`[Employee Update] Deactivating assignment ${assignment._id}`)
              await EmployeeRoleAssignment.updateOne(
                { _id: assignment._id },
                { $set: { validTo: now, isActive: false } }
              )
            }
          }
          
          // Create new assignments that don't exist
          for (const role of roleCategories) {
            for (const location of locationCategories) {
              const key = `${role._id}-${location._id}`
              if (!existingCombos.has(key)) {
                try {
                  console.log(`[Employee Update] Creating new assignment: ${role.name} at ${location.name}`)
                  await EmployeeRoleAssignment.create({
                    employeeId: id,
                    roleId: role._id,
                    locationId: location._id,
                    validFrom: now,
                    validTo: null,
                    isActive: true,
                    assignedBy: new mongoose.Types.ObjectId(ctx.auth.sub),
                    assignedAt: now,
                    notes: "Auto-assigned during employee update",
                  })
                  console.log(`[Employee Update] ✓ Created assignment: ${role.name} at ${location.name}`)
                } catch (assignmentError) {
                  console.error(`[Employee Update] ✗ Failed to create assignment:`, assignmentError)
                }
              }
            }
          }
        } else if (roleNames.length === 0 || locationNames.length === 0) {
          // If roles or locations are cleared, deactivate all assignments
          const now = new Date()
          console.log(`[Employee Update] Deactivating all assignments (roles or locations cleared)`)
          await EmployeeRoleAssignment.updateMany(
            { employeeId: id, isActive: true },
            { $set: { validTo: now, isActive: false } }
          )
        }
      }

      if (Object.keys(updates).length === 0) {
        const updated = await Employee.findById(id).lean()
        
        // Fetch role assignments
        const roleAssignments = await EmployeeRoleAssignment.find({
          employeeId: id,
          isActive: true,
        })
          .populate("roleId", "name color type")
          .populate("locationId", "name type")
          .lean()
        
        const formattedAssignments = roleAssignments.map(assignment => ({
          id: assignment._id.toString(),
          roleId: (assignment.roleId as any)._id.toString(),
          roleName: (assignment.roleId as any).name,
          roleColor: (assignment.roleId as any).color,
          locationId: (assignment.locationId as any)._id.toString(),
          locationName: (assignment.locationId as any).name,
          validFrom: assignment.validFrom,
          validTo: assignment.validTo,
          isActive: assignment.isActive,
        }))
        
        return {
          status: 200,
          data: { employee: await toEmployeeRow(updated!, formattedAssignments) }
        };
      }

      updates.updatedAt = new Date()
      console.log('[Employee Update] Updates object:', JSON.stringify(updates, null, 2))
      
      // Use findByIdAndUpdate to ensure the update is applied
      const updated = await Employee.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).lean()
      
      console.log('[Employee Update] After update - gender:', updated?.gender, 'homeAddress:', updated?.homeAddress)
      
      // Check if password was actually saved (for debugging)
      if (data.password) {
        const employeeWithPassword = await Employee.findById(id).select('+password +passwordSetByAdmin +requirePasswordChange').lean()
        console.log('[Employee Update] Password verification:', {
          hasPassword: !!employeeWithPassword?.password,
          passwordSetByAdmin: employeeWithPassword?.passwordSetByAdmin,
          requirePasswordChange: employeeWithPassword?.requirePasswordChange,
          passwordLength: employeeWithPassword?.password?.length
        })
      }
      
      // Send password setup email if requested
      if (data.sendSetupEmail && data.email && updates.passwordSetupToken) {
        try {
          const { sendEmail } = await import("@/lib/mail/sendEmail")
          const { generateOnboardingSetupLinkEmail } = await import("@/lib/mail/templates/employee-onboarding-setup-link")
          
          // Get the raw token for the email (not the hashed one)
          const { generateTokenWithExpiry } = await import("@/lib/utils/auth/auth-tokens")
          const tokenData = generateTokenWithExpiry(24) // Generate again to get raw token
          const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/setup-password?token=${tokenData.token}`
          
          const emailContent = generateOnboardingSetupLinkEmail({
            name: updated!.name,
            pin: updated!.pin,
            email: data.email!,
            phone: (updated as any)?.phone || '',
            setupUrl,
          })
          
          await sendEmail({
            to: data.email,
            subject: emailContent.subject,
            html: emailContent.html,
          })
          
          console.log(`[Employee Update] Password setup email sent to ${data.email}`)
        } catch (emailError) {
          console.error('[Employee Update] Failed to send setup email:', emailError)
          // Don't fail the update if email fails
        }
      }
      
      // Fetch role assignments
      const roleAssignments = await EmployeeRoleAssignment.find({
        employeeId: id,
        isActive: true,
      })
        .populate("roleId", "name color type")
        .populate("locationId", "name type")
        .lean()
      
      const formattedAssignments = roleAssignments.map(assignment => ({
        id: assignment._id.toString(),
        roleId: (assignment.roleId as any)._id.toString(),
        roleName: (assignment.roleId as any).name,
        roleColor: (assignment.roleId as any).color,
        locationId: (assignment.locationId as any)._id.toString(),
        locationName: (assignment.locationId as any).name,
        validFrom: assignment.validFrom,
        validTo: assignment.validTo,
        isActive: assignment.isActive,
      }))
      
      return {
        status: 200,
        data: { employee: await toEmployeeRow(updated!, formattedAssignments) }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/employees/[id] PATCH]", err)
      return {
        status: 500,
        data: { 
          error: "Failed to update employee", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        }
      };
    }
  }
});

/** DELETE /api/employees/[id] - Delete employee */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/employees/{id}',
  summary: 'Delete employee',
  description: 'Delete an employee by ID',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema
  },
  responses: {
    200: employeeDeleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    if (!params) {
      return {
        status: 400,
        data: { error: "Employee ID is required" }
      };
    }

    const { id } = params;

    try {
      await connectDB()
      const empFilter: Record<string, unknown> = { _id: id }
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
      const deleted = await Employee.findOneAndDelete(empFilter)
      if (!deleted) {
        return {
          status: 404,
          data: { error: "Employee not found" }
        };
      }
      return {
        status: 200,
        data: { success: true }
      };
    } catch (err) {
      console.error("[api/employees/[id] DELETE]", err)
      return {
        status: 500,
        data: { error: "Failed to delete employee" }
      };
    }
  }
});
