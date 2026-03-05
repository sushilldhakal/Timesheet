import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { getAuthFromCookie } from "@/lib/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"

export async function GET() {
  try {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const { default: mongoose } = await import("mongoose")
    
    const MailSettings = mongoose.models.MailSettings || mongoose.model("MailSettings", new mongoose.Schema({
      type: { type: String, default: "mail" },
      fromEmail: String,
      fromName: String,
      apiKey: String,
      updatedAt: Date,
    }))

    const doc = await MailSettings.findOne({ type: "mail" })

    if (!doc) return NextResponse.json({ settings: null })

    return NextResponse.json({
      settings: {
        fromEmail: doc.fromEmail || "",
        fromName: doc.fromName || "",
        hasApiKey: !!doc.apiKey,
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/mail-settings]", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { apiKey, fromEmail, fromName } = body

    if (!fromEmail) {
      return NextResponse.json({ error: "From email is required" }, { status: 400 })
    }

    await connectDB()
    const { default: mongoose } = await import("mongoose")
    
    const MailSettings = mongoose.models.MailSettings || mongoose.model("MailSettings", new mongoose.Schema({
      type: { type: String, default: "mail" },
      fromEmail: String,
      fromName: String,
      apiKey: String,
      updatedAt: Date,
    }))

    const update: any = {
      type: "mail",
      fromEmail,
      fromName: fromName || "",
      updatedAt: new Date(),
    }

    // Only update apiKey if a new one was provided
    if (apiKey) update.apiKey = apiKey

    await MailSettings.updateOne(
      { type: "mail" },
      { $set: update },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[POST /api/admin/mail-settings]", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}