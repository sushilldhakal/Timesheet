import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB, User } from "@/lib/db"
import { userCreateSchema } from "@/lib/validation/user"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"

/** GET /api/users - List all users (admin only). Excludes super_admin (hidden). */
export async function GET() {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminOrSuperAdmin(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await connectDB()
    const users = await User.find({ role: { $ne: "super_admin" } })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean()

    const normalized = users.map((u) => ({
      id: u._id,
      name: u.name ?? "",
      username: u.username,
      role: u.role,
      location: Array.isArray(u.location) ? u.location : u.location ? [String(u.location)] : [],
      rights: u.rights ?? [],
      createdAt: u.createdAt,
    }))

    return NextResponse.json({ users: normalized })
  } catch (err) {
    console.error("[api/users GET]", err)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

/** POST /api/users - Create user (admin only) */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminOrSuperAdmin(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = userCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, username, password, role, location, rights } = parsed.data

    await connectDB()

    const existing = await User.findOne({ username: username.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    const user = await User.create({
      name: name.trim(),
      username: username.toLowerCase(),
      password,
      role: role ?? "user",
      location: location ?? [],
      rights: rights ?? [],
    })

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        location: user.location ?? [],
        rights: user.rights ?? [],
      },
    })
  } catch (err) {
    console.error("[api/users POST]", err)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
