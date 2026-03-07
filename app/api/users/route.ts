import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, User } from "@/lib/db"
import { userCreateSchema } from "@/lib/validations/user"
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
      email: u.email ?? "",
      role: u.role,
      location: Array.isArray(u.location) ? u.location : u.location ? [String(u.location)] : [],
      rights: u.rights ?? [],
      managedRoles: u.managedRoles ?? [],
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
    console.log('[POST /api/users] Received body:', JSON.stringify(body, null, 2))
    
    const parsed = userCreateSchema.safeParse(body)
    if (!parsed.success) {
      console.log('[POST /api/users] Validation failed:', parsed.error)
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, username, email, password, role, location, rights, managedRoles, employeeId } = parsed.data
    console.log('[POST /api/users] Parsed data - managedRoles:', managedRoles)

    await connectDB()

    // Check for existing username
    const existingUser = await User.findOne({ username: username.toLowerCase() })
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    // Check for existing email if provided
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() })
      if (existingEmail) {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 })
      }
    }

    let userPassword = password

    // If promoting from staff, verify employee exists and copy their password
    if (employeeId) {
      const { Employee } = await import("@/lib/db")
      const employee = await Employee.findById(employeeId).select("+password")
      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }
      if (email && employee.email?.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ error: "Email must match employee email" }, { status: 400 })
      }
      if (!employee.password) {
        return NextResponse.json({ error: "Employee must have a password set to be promoted" }, { status: 400 })
      }
      
      // Copy the employee's hashed password directly
      userPassword = employee.password
    }

    // Validate that we have a password (either provided or copied from employee)
    if (!userPassword) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const now = Math.floor(Date.now() / 1000) // Unix timestamp in seconds

    const user = await User.create({
      name: name.trim(),
      username: username.toLowerCase(),
      email: email?.toLowerCase() || undefined,
      password: userPassword, // This will be hashed by the pre-save hook if it's not already hashed
      role: role ?? "user",
      location: location ?? [],
      rights: rights ?? [],
      managedRoles: managedRoles ?? [],
      createdAt: now,
      updatedAt: now,
    })

    console.log('[POST /api/users] Created user with managedRoles:', user.managedRoles)

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        location: user.location ?? [],
        rights: user.rights ?? [],
        managedRoles: user.managedRoles ?? [],
      },
    })
  } catch (err) {
    console.error("[api/users POST]", err)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
