import { NextResponse } from "next/server"
import { connectDB, User } from "@/lib/db"

export async function GET() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Not available" }, { status: 404 })
    }

    await connectDB()
    
    // Get all users but don't expose passwords
    const users = await User.find({}).select("-password").lean()
    
    return NextResponse.json({ 
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        username: u.username,
        role: u.role,
        location: u.location
      }))
    })
  } catch (err) {
    console.error("[debug/users]", err)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
