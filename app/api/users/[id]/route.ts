import { NextRequest, NextResponse } from "next/server"
import type { Right } from "@/lib/config/rights"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB, User } from "@/lib/db"
import { userIdParamSchema } from "@/lib/validation/user"
import { userAdminUpdateSchema, userSelfUpdateSchema } from "@/lib/validation/user"

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/users/[id] - Get single user (admin or self) */
export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const parsed = userIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
  }

  // User can only get their own profile unless admin
  if (auth.role !== "admin" && auth.sub !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await connectDB()
    const user = await User.findById(id).select("-password").lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const location = Array.isArray(user.location) ? user.location : user.location ? [String(user.location)] : []

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name ?? "",
        username: user.username,
        role: user.role,
        location,
        rights: user.rights ?? [],
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error("[api/users/[id] GET]", err)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

/** PATCH /api/users/[id] - Update user */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = (await context.params).id
  const parsed = userIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
  }

  const isSelf = auth.sub === id
  const isAdmin = auth.role === "admin"

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()

    await connectDB()
    const existing = await User.findById(id).select("+password")
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (isAdmin) {
      // Admin: full update
      const parsedUpdate = userAdminUpdateSchema.safeParse(body)
      if (!parsedUpdate.success) {
        return NextResponse.json(
          { error: "Validation failed", issues: parsedUpdate.error.flatten().fieldErrors },
          { status: 400 }
        )
      }

      const { name, username, password, role, location, rights } = parsedUpdate.data

      if (username !== undefined) {
        const duplicate = await User.findOne({
          username: username.toLowerCase(),
          _id: { $ne: id },
        })
        if (duplicate) {
          return NextResponse.json({ error: "Username already exists" }, { status: 409 })
        }
        existing.username = username.toLowerCase()
      }
      if (name !== undefined) existing.name = name.trim()
      if (password) existing.password = password
      if (role !== undefined) existing.role = role
      if (location !== undefined) existing.location = location
      if (rights !== undefined) existing.rights = rights as Right[]

      await existing.save()

      const u = await User.findById(id).select("-password").lean()
      const loc = u?.location
      const locArr = Array.isArray(loc) ? loc : loc ? [String(loc)] : []

      return NextResponse.json({
        user: {
          id: u?._id,
          name: u?.name ?? "",
          username: u?.username,
          role: u?.role,
          location: locArr,
          rights: u?.rights ?? [],
        },
      })
    }

    // User: self-update (username and password only)
    const parsedSelf = userSelfUpdateSchema.safeParse(body)
    if (!parsedSelf.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsedSelf.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { username: newUsername, password } = parsedSelf.data

    const duplicate = await User.findOne({
      username: newUsername.toLowerCase(),
      _id: { $ne: id },
    })
    if (duplicate) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    existing.username = newUsername.toLowerCase()
    if (password) existing.password = password
    await existing.save()

    const u = await User.findById(id).select("-password").lean()
    const loc = u?.location
    const locArr = Array.isArray(loc) ? loc : loc ? [String(loc)] : []

    return NextResponse.json({
      user: {
        id: u?._id,
        name: u?.name ?? "",
        username: u?.username,
        role: u?.role,
        location: locArr,
        rights: u?.rights ?? [],
      },
    })
  } catch (err) {
    console.error("[api/users/[id] PATCH]", err)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

/** DELETE /api/users/[id] - Delete user (admin only) */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = (await context.params).id
  const parsed = userIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
  }

  // Prevent admin from deleting themselves
  if (auth.sub === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  try {
    await connectDB()
    const deleted = await User.findByIdAndDelete(id)
    if (!deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[api/users/[id] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
