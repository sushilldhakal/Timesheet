import { NextResponse } from "next/server"
import { connectDB, Category } from "@/lib/db"

/**
 * GET /api/public/locations - Public endpoint for device registration
 * Returns basic location information (id and name only) without authentication
 * Used by DeviceRegistrationDialog to show available locations
 */
export async function GET() {
  try {
    await connectDB()
    
    // Fetch only locations with minimal data for security
    const locations = await Category.find({ type: "location" })
      .select("_id name") // Only return id and name
      .sort({ name: 1 })
      .lean()

    const items = locations.map((location) => ({
      _id: location._id.toString(),
      id: location._id.toString(),
      name: location.name,
    }))

    return NextResponse.json({ 
      locations: items,
      count: items.length 
    })
  } catch (err) {
    console.error("[api/public/locations GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    )
  }
}