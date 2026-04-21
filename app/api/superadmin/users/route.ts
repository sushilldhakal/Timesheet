import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { User } from "@/lib/db/schemas/user"

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromCookie()
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const role = searchParams.get("role")
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}
    if (role && role !== "all") {
      query.role = role
    }

    // Fetch users with populated tenant info
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1) // Fetch one extra to check if there are more
      .populate("tenantId", "name")
      .select("-password -passwordResetToken -passwordResetExpiry")
      .lean()

    const hasMore = users.length > limit
    const usersToReturn = hasMore ? users.slice(0, limit) : users

    return NextResponse.json({
      users: usersToReturn.map((u) => ({
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        tenantId: u.tenantId ? {
          _id: (u.tenantId as any)._id.toString(),
          name: (u.tenantId as any).name,
        } : null,
        createdAt: u.createdAt,
        isActive: true, // Add isActive field to User schema if needed
      })),
      hasMore,
      page,
      limit,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
