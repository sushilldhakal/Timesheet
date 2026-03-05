import { NextResponse } from "next/server"
import { connectDB, User } from "@/lib/db"

// Debug endpoint to check user roles - REMOVE IN PRODUCTION
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  }

  try {
    await connectDB()
    
    const users = await User.find({}, { 
      email: 1, 
      username: 1, 
      role: 1, 
      _id: 1 
    }).lean()

    return NextResponse.json({
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }))
    })
  } catch (err) {
    console.error("[debug/users-roles]", err)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}