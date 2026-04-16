import { AdminMailSettingsRepo } from "@/lib/db/queries/admin-mail-settings";
import { connectDB } from "@/lib/db";

export class MailSettingsService {
  async get() {
    await connectDB();
    const doc = await AdminMailSettingsRepo.get();
    if (!doc) return { settings: null };
    return {
      settings: {
        fromEmail: doc.fromEmail || "",
        fromName: doc.fromName || "",
        hasApiKey: !!doc.apiKey,
      },
    };
  }

  async save(body: any) {
    await connectDB();
    const { apiKey, fromEmail, fromName } = body;
    const update: any = {
      type: "mail",
      fromEmail,
      fromName: fromName || "",
      updatedAt: new Date(),
    };
    if (apiKey) update.apiKey = apiKey;
    await AdminMailSettingsRepo.upsert(update);
    return { success: true };
  }

  async sendTest(testEmail: string) {
    await connectDB();
    const doc = await AdminMailSettingsRepo.get();
    if (!doc?.apiKey) return { status: 400, data: { error: "Mail settings not configured" } };

    const res = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${doc.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { address: doc.fromEmail, display_name: doc.fromName || "Timesheet App" },
        to: [{ address: testEmail }],
        subject: "Maileroo Test Email",
        html: "<h2>✅ Mail settings working!</h2><p>Your Maileroo API is configured correctly.</p>",
        plain: "Mail settings working! Your Maileroo API is configured correctly.",
      }),
    });

    const data = await res.json();
    if (!res.ok) return { status: 500, data: { error: data?.message || JSON.stringify(data) } };
    return { status: 200, data: { success: true, message: "Test email sent successfully!" } };
  }
}

export const mailSettingsService = new MailSettingsService();

