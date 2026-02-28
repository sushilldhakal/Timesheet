import { connectDB } from "@/lib/db"

type SendEmailOptions = {
  to: string
  subject: string
  html: string
  plain?: string
}

export async function sendEmail({ to, subject, html, plain }: SendEmailOptions) {
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

  if (!doc?.apiKey || !doc?.fromEmail) {
    throw new Error("Mail settings not configured")
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
        display_name: doc.fromName || "",
      },
      to: [{ address: to }],
      subject,
      html,
      plain: plain || "",
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || "Failed to send email")

  return data
}