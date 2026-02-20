import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { employeeIdParamSchema } from "@/lib/validation/employee"
import { employeeUpdateSchema } from "@/lib/validation/employee"

type RouteContext = { params: Promise<{ id: string }> }

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : v != null && v !== "" ? [String(v).trim()] : []
function toEmployeeRow(e: { _id: unknown; name?: string; pin?: string; role?: string | string[]; employer?: string | string[]; location?: string[]; hire?: string; site?: string; email?: string; phone?: string; dob?: string; comment?: string; img?: string; createdAt?: Date; updatedAt?: Date }) {
  return {
    id: e._id,
    name: e.name ?? "",
    pin: e.pin ?? "",
    role: arr(e.role),
    employer: arr(e.employer),
    location: arr(e.location),
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
    return NextResponse.json({ employee: toEmployeeRow(employee) })
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
    if (data.role !== undefined) updates.role = arr(data.role)
    if (data.employer !== undefined) updates.employer = arr(data.employer)
    if (data.location !== undefined) updates.location = arr(data.location)
    if (data.email !== undefined) updates.email = (data.email ?? "").toString().trim()
    if (data.phone !== undefined) updates.phone = (data.phone ?? "").toString().trim()
    if (data.dob !== undefined) updates.dob = (data.dob ?? "").toString().trim()
    if (data.comment !== undefined) updates.comment = (data.comment ?? "").toString().trim()
    if (data.img !== undefined) updates.img = (data.img ?? "").toString().trim()

    if (Object.keys(updates).length === 0) {
      const updated = await Employee.findById(id).lean()
      return NextResponse.json({ employee: toEmployeeRow(updated!) })
    }

    updates.updatedAt = new Date()
    await Employee.updateOne(empFilter, { $set: updates })
    const updated = await Employee.findById(id).lean()
    return NextResponse.json({ employee: toEmployeeRow(updated!) })
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
