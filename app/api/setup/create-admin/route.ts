import { NextRequest, NextResponse } from "next/server"
import { connectDB, User } from "@/lib/db"
import { setAdminExistsCache } from "@/lib/db/setup"
import { adminCreateSchema } from "@/lib/validation/user"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = adminCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { username, password } = parsed.data

    await connectDB()

    const existing = await User.findOne({ username: username.toLowerCase() })
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      )
    }

    await User.create({
      name: "Administrator",
      username: username.toLowerCase(),
      password,
      role: "admin",
      location: [],
      rights: [],
    })

    setAdminExistsCache(true)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[setup/create-admin]", err)
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 }
    )
  }
}
