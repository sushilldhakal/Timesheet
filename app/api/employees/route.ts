import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { employeeCreateSchema } from "@/lib/validation/employee"
import { logger } from "@/lib/utils/logger"

/** GET /api/employees?search=...&limit=10&offset=0&sortBy=name&order=asc - List employees with search, pagination, and sorting */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")
  const sortByParam = searchParams.get("sortBy")?.trim() ?? "name"
  const orderParam = searchParams.get("order")?.trim().toLowerCase() ?? "asc"
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 1000) : 10
  const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0
  
  // Validate sortBy to prevent injection
  const validSortFields = ["name", "pin", "role", "employer", "location", "email", "phone"]
  const sortBy = validSortFields.includes(sortByParam) ? sortByParam : "name"
  const order = orderParam === "desc" ? -1 : 1

  try {
    await connectDB()

    const andConditions: Record<string, unknown>[] = []
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) andConditions.push(locFilter)

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
    const normalized = employees.map((e) => ({
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
    }))

    return NextResponse.json({
      employees: normalized,
      total,
      limit,
      offset,
    })
  } catch (err) {
    logger.error("[api/employees GET]", err)
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
      role: data.role ?? [],
      employer: data.employer ?? [],
      location: data.location ?? [],
      email: data.email ?? "",
      phone: data.phone ?? "",
      dob: data.dob ?? "",
      comment: data.comment ?? "",
      img: data.img ?? "",
    })

    return NextResponse.json({
      employee: {
        id: employee._id,
        name: employee.name,
        pin: employee.pin,
        role: employee.role,
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
    logger.error("[api/employees POST]", err)
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    )
  }
}
