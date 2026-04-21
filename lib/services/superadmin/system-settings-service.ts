import { SystemSettingsRepo } from "@/lib/db/queries/system-settings";
import { ISystemSettings } from "@/lib/db/schemas/system-settings";
import { encrypt, decrypt, maskSecret } from "@/lib/utils/storage/encryption";
import { createR2Client } from "@/lib/storage/r2";

export interface SystemSettingsUpdateInput {
  // R2 Config
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2BucketName?: string;
  r2PublicUrl?: string;

  // Maileroo Config
  mailerooApiKey?: string;
  mailerooFromEmail?: string;
  mailerooFromName?: string;

  // Default quotas
  defaultStorageQuotaBytes?: number;
  defaultEmailQuotaMonthly?: number;

  updatedBy?: string;
}

export class SystemSettingsService {
  /**
   * Get system settings with secrets masked
   */
  static async get(): Promise<ISystemSettings | null> {
    const settings = await SystemSettingsRepo.findOne();
    if (!settings) return null;

    // Mask secrets
    const masked = { ...settings } as any;
    if (masked.r2SecretAccessKey) {
      masked.r2SecretAccessKey = "••••••••";
    }
    if (masked.mailerooApiKey) {
      masked.mailerooApiKey = "••••••••";
    }

    return masked;
  }

  /**
   * Get system settings with decrypted secrets (server-side only)
   */
  static async getDecrypted(): Promise<ISystemSettings | null> {
    const settings = await SystemSettingsRepo.findOne();
    if (!settings) return null;

    const decrypted = { ...settings } as any;
    if (decrypted.r2SecretAccessKey) {
      decrypted.r2SecretAccessKey = decrypt(decrypted.r2SecretAccessKey);
    }
    if (decrypted.mailerooApiKey) {
      decrypted.mailerooApiKey = decrypt(decrypted.mailerooApiKey);
    }

    return decrypted;
  }

  /**
   * Save system settings (encrypts secrets before saving)
   */
  static async save(body: SystemSettingsUpdateInput): Promise<void> {
    const update: any = { ...body };

    // Encrypt secrets if provided and not the placeholder
    if (update.r2SecretAccessKey) {
      if (update.r2SecretAccessKey === "existing" || update.r2SecretAccessKey === "••••••••") {
        // Keep existing secret - don't update
        delete update.r2SecretAccessKey;
      } else {
        // New secret provided - encrypt it
        update.r2SecretAccessKey = encrypt(update.r2SecretAccessKey);
      }
    }

    if (update.mailerooApiKey) {
      if (update.mailerooApiKey === "existing" || update.mailerooApiKey === "••••••••") {
        // Keep existing secret - don't update
        delete update.mailerooApiKey;
      } else {
        // New secret provided - encrypt it
        console.log('[SystemSettings] Encrypting new Maileroo API key');
        update.mailerooApiKey = encrypt(update.mailerooApiKey);
      }
    }

    console.log('[SystemSettings] Saving settings with fields:', Object.keys(update));
    await SystemSettingsRepo.upsert(update);
  }

  /**
   * Test R2 connection
   */
  static async testR2Connection(): Promise<{ success: boolean; message: string }> {
    try {
      const settings = await this.getDecrypted();
      if (!settings?.r2AccountId || !settings?.r2AccessKeyId || !settings?.r2SecretAccessKey || !settings?.r2BucketName) {
        return { success: false, message: "R2 credentials not configured" };
      }

      const config = {
        accountId: settings.r2AccountId,
        accessKeyId: settings.r2AccessKeyId,
        secretAccessKey: settings.r2SecretAccessKey,
        bucketName: settings.r2BucketName,
      };

      const client = createR2Client(config);
      
      // Try to list objects (limit to 1 to minimize overhead)
      await client.send(
        new (await import("@aws-sdk/client-s3")).ListObjectsV2Command({
          Bucket: config.bucketName,
          MaxKeys: 1,
        })
      );

      return { success: true, message: "R2 connection successful" };
    } catch (error: any) {
      return { success: false, message: `R2 connection failed: ${error.message}` };
    }
  }

  /**
   * Test Maileroo connection by sending a test email
   */
  static async testMailConnection(testEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      const settings = await this.getDecrypted();
      if (!settings?.mailerooApiKey || !settings?.mailerooFromEmail) {
        return { success: false, message: "Maileroo credentials not configured" };
      }

      // Validate that the API key is properly decrypted (should not contain colons which indicate encrypted format)
      if (settings.mailerooApiKey.includes(':')) {
        return { success: false, message: "Maileroo API key appears to be encrypted. Please re-save your settings." };
      }

      const payload = {
        from: {
          address: settings.mailerooFromEmail,
          name: settings.mailerooFromName || "Timesheet App",
        },
        to: [{ address: testEmail }],
        subject: "Test Email from Timesheet App",
        html: "<p>This is a test email to verify your Maileroo configuration.</p>",
      };

      console.log('[Maileroo Test] Sending with from address:', settings.mailerooFromEmail);

      const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": settings.mailerooApiKey,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('[Maileroo Test] Failed:', responseText);
        
        // Parse the error to provide helpful message
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.message?.includes('domain') && errorData.message?.includes('not associated')) {
            return { 
              success: false, 
              message: `Domain verification required: The email domain in '${settings.mailerooFromEmail}' is not verified with your Maileroo API key. Please verify your domain in Maileroo dashboard or use a verified domain.` 
            };
          }
          return { success: false, message: `Maileroo error: ${errorData.message || responseText}` };
        } catch {
          return { success: false, message: `Maileroo test failed: ${responseText}` };
        }
      }

      console.log('[Maileroo Test] Success:', responseText);
      return { success: true, message: "Test email sent successfully" };
    } catch (error: any) {
      console.error('[Maileroo Test] Exception:', error);
      return { success: false, message: `Maileroo connection failed: ${error.message}` };
    }
  }
}
