import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee, Category } from "@/lib/db"
import { employeeIdParamSchema } from "@/lib/validation/employee"
import { employeeUpdateSchema } from "@/lib/validation/employee"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import Award from "@/lib/db/schemas/award"

type RouteContext = { params: Promise<{ id: string }> }

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : v != null && v !== "" ? [String(v).trim()] : []

async function toEmployeeRow(e: { _id: unknown; name?: string; pin?: string; role?: string | string[]; employer?: string | string[]; location?: string[]; email?: string; phone?: string; homeAddress?: string; dob?: string; comment?: string; img?: string; awardId?: unknown; awardLevel?: string | null; employmentType?: string | null; standardHoursPerWeek?: number | null; createdAt?: Date; updatedAt?: Date }, roleAssignments: any[] = []) {
  // Get unique location IDs from active role assignments
  const locationIds = Array.from(new Set(roleAssignments.map(ra => ra.locationId.toString())))
  
  // Fetch full location details with geofence and hours
  const locations = await Category.find({
    _id: { $in: locationIds },
    type: "location"
  }).lean()
  
  const locationData = locations.map(loc => ({
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
  }))
  
  // Fetch employer details
  const employerNames = arr(e.employer)
  const employers = await Category.find({
    name: { $in: employerNames },
    type: "employer"
  }).select("_id name color").lean()
  
  const employerData = employers.map(emp => ({
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
    employmentType: e.employmentType,
    standardHoursPerWeek: e.standardHoursPerWeek ?? undefined,
    comment: e.comment ?? "",
    award: awardData,
    roles: formattedRoles,
    employers: employerData,
    locations: locationData,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

/** GET /api/employees/[id] - Get single employee */
export async function GET(_request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = (await context.params).id
  const parsed = employeeIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
  }

  try {
    await connectDB()
    const empFilter: Record<string, unknown> = { _id: id }
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) {
      empFilter.$and = [locFilter]
    }
    const employee = await Employee.findOne(empFilter).lean()
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
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
    return NextResponse.json({ employee: await toEmployeeRow(employee, formattedAssignments) })
  } catch (err) {
    console.error("[api/employees/[id] GET]", err)
    return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 })
  }
}

/** PATCH /api/employees/[id] - Update employee */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = (await context.params).id
  const parsed = employeeIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsedUpdate = employeeUpdateSchema.safeParse(body)
    if (!parsedUpdate.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsedUpdate.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    await connectDB()
    
    const empFilter: Record<string, unknown> = { _id: id }
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
    const existing = await Employee.findOne(empFilter)
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const data = parsedUpdate.data
    const updates: Record<string, unknown> = {}
    if (data.name !== undefined) updates.name = data.name.trim()
    if (data.pin !== undefined) {
      const dup = await Employee.findOne({ pin: data.pin.trim(), _id: { $ne: id } })
      if (dup) {
        return NextResponse.json({ error: "PIN already in use" }, { status: 409 })
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
    if (data.comment !== undefined) updates.comment = (data.comment ?? "").toString().trim()
    if (data.img !== undefined) updates.img = (data.img ?? "").toString().trim()
    if (data.standardHoursPerWeek !== undefined) updates.standardHoursPerWeek = data.standardHoursPerWeek
    if (data.employmentType !== undefined) updates.employmentType = data.employmentType || null
    if (data.awardId !== undefined) {
      updates.awardId = data.awardId ? new mongoose.Types.ObjectId(data.awardId) : null
    }
    if (data.awardLevel !== undefined) updates.awardLevel = data.awardLevel || null

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
        const roleCategories = await Category.find({
          name: { $in: roleNames },
          type: "role"
        }).lean()
        
        const locationCategories = await Category.find({
          name: { $in: locationNames },
          type: "location"
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
      
      return NextResponse.json({ employee: await toEmployeeRow(updated!, formattedAssignments) })
    }

    updates.updatedAt = new Date()
    console.log('[Employee Update] Updates object:', JSON.stringify(updates, null, 2))
    await Employee.updateOne(empFilter, { $set: updates })
    const updated = await Employee.findById(id).lean()
    console.log('[Employee Update] Updated employee homeAddress:', updated?.homeAddress)
    
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
    
    return NextResponse.json({ employee: await toEmployeeRow(updated!, formattedAssignments) })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/employees/[id] PATCH]", err)
    return NextResponse.json(
      { error: "Failed to update employee", details: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    )
  }
}

/** DELETE /api/employees/[id] - Delete employee */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = (await context.params).id
  const parsed = employeeIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
  }

  try {
    await connectDB()
    const empFilter: Record<string, unknown> = { _id: id }
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
    const deleted = await Employee.findOneAndDelete(empFilter)
    if (!deleted) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[api/employees/[id] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}
