import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { connectDB, User } from "@/lib/db"
import { createAuthToken, setAuthCookie } from "@/lib/auth"
import { adminLoginSchema } from "@/lib/validation/user"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = adminLoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 400 }
      )
    }

    const { username, password } = parsed.data
    const normalizedUsername = username.trim().toLowerCase()

    await connectDB()
    const user = await User.findOne({ username: normalizedUsername })
      .select("+password")
      .lean()

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    }

    const token = await createAuthToken({
      sub: String(user._id),
      username: user.username,
      role: user.role,
      location: Array.isArray(user.location) ? user.location[0] ?? "" : (user.location ?? ""),
    })

    await setAuthCookie(token)

    const loc = user.location
    const location = Array.isArray(loc) ? loc : loc ? [loc] : []

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name ?? "",
        username: user.username,
        role: user.role,
        location,
        rights: user.rights ?? [],
      },
    })
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
    console.error("[auth/login]", err)
    }
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    )
  }
}
