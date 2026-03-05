import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { getAuthFromCookie } from "@/lib/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { testEmail } = await req.json()

    if (!testEmail) {
      return NextResponse.json({ error: "Test email is required" }, { status: 400 })
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

    if (!doc?.apiKey) {
      return NextResponse.json({ error: "Mail settings not configured" }, { status: 400 })
    }

    const res = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${doc.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          address: doc.fromEmail,
          display_name: doc.fromName || "Timesheet App",
        },
        to: [{ address: testEmail }],
        subject: "Maileroo Test Email",
        html: "<h2>✅ Mail settings working!</h2><p>Your Maileroo API is configured correctly.</p>",
        plain: "Mail settings working! Your Maileroo API is configured correctly.",
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data?.message || JSON.stringify(data) }, { status: 500 })

    return NextResponse.json({ success: true, message: "Test email sent successfully!" })
  } catch (error: any) {
    console.error("[POST /api/admin/mail-settings/test]", error)
    return NextResponse.json({ error: error.message || "Test failed" }, { status: 500 })
  }
}