import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB, Category } from "@/lib/db"
import { categoryIdParamSchema } from "@/lib/validation/category"
import { categoryUpdateSchema } from "@/lib/validation/category"

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/categories/[id] - Get single category */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const parsed = categoryIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
  }

  try {
    await connectDB()
    const category = await Category.findById(id).lean()
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
    return NextResponse.json({
      category: {
        id: category._id,
        name: category.name,
        type: category.type,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    })
  } catch (err) {
    console.error("[api/categories/[id] GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    )
  }
}

/** PATCH /api/categories/[id] - Update category */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const parsed = categoryIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsedUpdate = categoryUpdateSchema.safeParse(body)
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
    const existing = await Category.findById(id)
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const { name } = parsedUpdate.data
    const duplicate = await Category.findOne({
      type: existing.type,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      _id: { $ne: id },
    })
    if (duplicate) {
      return NextResponse.json(
        { error: "A category with this name already exists for this type" },
        { status: 409 }
      )
    }

    existing.name = name.trim()
    await existing.save()

    return NextResponse.json({
      category: {
        id: existing._id,
        name: existing.name,
        type: existing.type,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      },
    })
  } catch (err) {
    console.error("[api/categories/[id] PATCH]", err)
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    )
  }
}

/** DELETE /api/categories/[id] - Delete category */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const parsed = categoryIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
  }

  try {
    await connectDB()
    const deleted = await Category.findByIdAndDelete(id)
    if (!deleted) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[api/categories/[id] DELETE]", err)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
}
