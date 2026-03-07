import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Category } from "@/lib/db"
import { categoryCreateSchema } from "@/lib/validations/category"
import { isValidCategoryType } from "@/lib/config/category-types"

/** GET /api/categories?type=role|employer|location - List categories by type */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  try {
    await connectDB()
    const filter = type && isValidCategoryType(type) ? { type } : {}
    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .lean()

    const items = categories.map((c) => ({
      _id: c._id.toString(),
      id: c._id.toString(),
      name: c.name,
      type: c.type,
      color: c.color,
      lat: c.lat,
      lng: c.lng,
      address: c.address,
      radius: c.radius,
      geofenceMode: c.geofenceMode,
      openingHour: c.openingHour,
      closingHour: c.closingHour,
      defaultScheduleTemplate: c.defaultScheduleTemplate,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    return NextResponse.json({ categories: items })
  } catch (err) {
    console.error("[api/categories GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

/** POST /api/categories - Create category */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = categoryCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { name, type, lat, lng, address, radius, geofenceMode, openingHour, closingHour, color, defaultScheduleTemplate } = parsed.data

    await connectDB()

    const existing = await Category.findOne({
      type,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    })
    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists for this type" },
        { status: 409 }
      )
    }

    const createData: Record<string, unknown> = { name: name.trim(), type }
    if (type === "location") {
      if (lat != null) createData.lat = lat
      if (lng != null) createData.lng = lng
      if (address != null) createData.address = address
      if (radius != null) createData.radius = radius
      if (geofenceMode != null) createData.geofenceMode = geofenceMode
      if (openingHour != null) createData.openingHour = openingHour
      if (closingHour != null) createData.closingHour = closingHour
    }
    if (type === "role" || type === "employer") {
      if (color != null) createData.color = color
    }
    if (type === "role") {
      if (defaultScheduleTemplate != null) createData.defaultScheduleTemplate = defaultScheduleTemplate
    }
    const category = await Category.create(createData)

    return NextResponse.json({
      category: {
        id: category._id,
        name: category.name,
        type: category.type,
        lat: category.lat,
        lng: category.lng,
        address: category.address,
        radius: category.radius,
        geofenceMode: category.geofenceMode,
        openingHour: category.openingHour,
        closingHour: category.closingHour,
        color: category.color,
        defaultScheduleTemplate: category.defaultScheduleTemplate,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    })
  } catch (err) {
    console.error("[api/categories POST]", err)
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}
