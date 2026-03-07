import { NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { Category } from "@/lib/db"

/** GET /api/debug/categories - List all categories for debugging */
export async function GET() {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    
    const roles = await Category.find({ type: "role" }).select("_id name type").lean()
    const locations = await Category.find({ type: "location" }).select("_id name type").lean()
    const employers = await Category.find({ type: "employer" }).select("_id name type").lean()
    
    return NextResponse.json({
      roles: roles.map(r => ({ id: r._id.toString(), name: r.name })),
      locations: locations.map(l => ({ id: l._id.toString(), name: l.name })),
      employers: employers.map(e => ({ id: e._id.toString(), name: e.name })),
    })
  } catch (err) {
    console.error("[api/debug/categories]", err)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}
