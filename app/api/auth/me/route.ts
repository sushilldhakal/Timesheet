import { NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB, User } from "@/lib/db"

export async function GET() {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  try {
    await connectDB()
    const user = await User.findById(auth.sub)
      .select("-password")
      .lean()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Normalize location to array (legacy support)
    const location = Array.isArray(user.location)
      ? user.location
      : user.location
        ? [String(user.location)]
        : []

    // Ensure role is always returned (legacy users may lack role; infer admin from username)
    const role =
      user.role ?? auth.role ?? (user.username === "admin" ? "admin" : "user")

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name ?? "",
        username: user.username,
        role,
        location,
        rights: user.rights ?? [],
      },
    })
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
