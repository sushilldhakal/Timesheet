import { connectDB } from "@/lib/db"
import { SystemSettingsService } from "@/lib/services/superadmin/system-settings-service"
import { QuotaService } from "@/lib/services/superadmin/quota-service"
import { EmailQuotaExceededError } from "@/lib/errors/email-quota-exceeded"

type SendEmailOptions = {
  to: string
  subject: string
  html: string
  plain?: string
  orgId: string  // Required for quota checking
}

export async function sendEmail({ to, subject, html, plain, orgId }: SendEmailOptions) {
  await connectDB()
  
  // Get system settings
  const settings = await SystemSettingsService.getDecrypted()
  
  if (!settings?.mailerooApiKey || !settings?.mailerooFromEmail) {
    throw new Error("Mail not configured. Contact your administrator.")
  }
  
  // Check email quota
  const allowed = await QuotaService.checkEmailAllowed(orgId)
  
  if (!allowed) {
    const usage = await QuotaService.getEmailUsage(orgId)
    throw new EmailQuotaExceededError(orgId, usage.quotaMonthly)
  }
  
  // Send email via Maileroo
  const res = await fetch("https://smtp.maileroo.com/api/v2/emails", {
    method: "POST",
    headers: {
      "X-API-Key": settings.mailerooApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: {
        email: settings.mailerooFromEmail,
        name: settings.mailerooFromName || "Timesheet System",
      },
      to: [{ email: to }],
      subject,
      html,
      text: plain || "",
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || "Failed to send email")
  
  // Increment email quota on success
  await QuotaService.incrementEmail(orgId)

  return data
}

type SendSystemEmailOptions = {
  to: string
  subject: string
  html: string
  plain?: string
}

/** Send a system-level email without org quota tracking (used for signup notifications). */
export async function sendSystemEmail({ to, subject, html, plain }: SendSystemEmailOptions) {
  await connectDB()

  const settings = await SystemSettingsService.getDecrypted()

  if (!settings?.mailerooApiKey || !settings?.mailerooFromEmail) {
    throw new Error("Mail not configured. Contact your administrator.")
  }

  const res = await fetch("https://smtp.maileroo.com/api/v2/emails", {
    method: "POST",
    headers: {
      "X-API-Key": settings.mailerooApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: {
        email: settings.mailerooFromEmail,
        name: settings.mailerooFromName || "Timesheet System",
      },
      to: [{ email: to }],
      subject,
      html,
      text: plain || "",
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || "Failed to send email")

  return data
}