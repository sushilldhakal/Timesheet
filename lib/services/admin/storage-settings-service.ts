import { AdminStorageSettingsRepo } from "@/lib/db/queries/admin-storage-settings";
import { connectDB } from "@/lib/db";
import { encrypt, decrypt, maskSecret } from "@/lib/utils/storage/encryption";

export class StorageSettingsService {
  async getMasked() {
    await connectDB();
    const settings = await AdminStorageSettingsRepo.findActiveLean();
    if (!settings) return { settings: null };

    const response: any = { provider: (settings as any).provider, isActive: (settings as any).isActive };

    if ((settings as any).cloudinaryCloudName) {
      response.cloudinary = {
        cloudName: (settings as any).cloudinaryCloudName || "",
        apiKey: (settings as any).cloudinaryApiKey || "",
        apiSecret: (settings as any).cloudinaryApiSecret ? maskSecret(decrypt((settings as any).cloudinaryApiSecret)) : "",
        hasSecret: !!(settings as any).cloudinaryApiSecret,
      };
    }

    if ((settings as any).r2AccountId) {
      response.r2 = {
        accountId: (settings as any).r2AccountId || "",
        accessKeyId: (settings as any).r2AccessKeyId || "",
        secretAccessKey: (settings as any).r2SecretAccessKey ? maskSecret(decrypt((settings as any).r2SecretAccessKey)) : "",
        bucketName: (settings as any).r2BucketName || "",
        publicUrl: (settings as any).r2PublicUrl || "",
        hasSecret: !!(settings as any).r2SecretAccessKey,
      };
    }

    return { settings: response };
  }

  async save(auth: any, body: any) {
    await connectDB();
    const { provider, cloudinary, r2 } = body;
    if (!provider || !["cloudinary", "r2"].includes(provider)) {
      return { status: 400, data: { error: "Invalid provider" } };
    }

    const existingSettings = await AdminStorageSettingsRepo.findActive();

    if (provider === "cloudinary") {
      if (!cloudinary?.cloudName || !cloudinary?.apiKey) {
        return { status: 400, data: { error: "Missing required Cloudinary credentials (Cloud Name and API Key)" } };
      }
      if (!cloudinary.apiSecret && (!existingSettings || !(existingSettings as any).cloudinaryApiSecret)) {
        return { status: 400, data: { error: "API Secret is required for initial Cloudinary setup" } };
      }
    } else if (provider === "r2") {
      if (!r2?.accountId || !r2?.accessKeyId || !r2?.bucketName) {
        return { status: 400, data: { error: "Missing required R2 credentials (Account ID, Access Key ID, and Bucket Name)" } };
      }
      if (!r2.secretAccessKey && (!existingSettings || !(existingSettings as any).r2SecretAccessKey)) {
        return { status: 400, data: { error: "Secret Access Key is required for initial R2 setup" } };
      }
    }

    await AdminStorageSettingsRepo.deactivateAllActive();

    const settingsData: any = { provider, isActive: true, updatedBy: auth.sub };

    if (provider === "cloudinary") {
      settingsData.cloudinaryCloudName = cloudinary.cloudName;
      settingsData.cloudinaryApiKey = cloudinary.apiKey;
      if (cloudinary.apiSecret) settingsData.cloudinaryApiSecret = encrypt(cloudinary.apiSecret);
      else if (existingSettings?.cloudinaryApiSecret) settingsData.cloudinaryApiSecret = existingSettings.cloudinaryApiSecret;

      if (existingSettings?.r2AccountId) {
        settingsData.r2AccountId = existingSettings.r2AccountId;
        settingsData.r2AccessKeyId = existingSettings.r2AccessKeyId;
        settingsData.r2SecretAccessKey = existingSettings.r2SecretAccessKey;
        settingsData.r2BucketName = existingSettings.r2BucketName;
        settingsData.r2PublicUrl = existingSettings.r2PublicUrl;
      }
    } else if (provider === "r2") {
      settingsData.r2AccountId = r2.accountId;
      settingsData.r2AccessKeyId = r2.accessKeyId;
      settingsData.r2BucketName = r2.bucketName;
      settingsData.r2PublicUrl = r2.publicUrl || "";
      if (r2.secretAccessKey) settingsData.r2SecretAccessKey = encrypt(r2.secretAccessKey);
      else if (existingSettings?.r2SecretAccessKey) settingsData.r2SecretAccessKey = existingSettings.r2SecretAccessKey;

      if (existingSettings?.cloudinaryCloudName) {
        settingsData.cloudinaryCloudName = existingSettings.cloudinaryCloudName;
        settingsData.cloudinaryApiKey = existingSettings.cloudinaryApiKey;
        settingsData.cloudinaryApiSecret = existingSettings.cloudinaryApiSecret;
      }
    }

    await AdminStorageSettingsRepo.create(settingsData);
    return { status: 200, data: { success: true, message: "Storage settings saved successfully" } };
  }

  async deleteActive() {
    await connectDB();
    await AdminStorageSettingsRepo.deleteActive();
    return { success: true, message: "Storage settings deleted" };
  }

  async resetAll() {
    await connectDB();
    await AdminStorageSettingsRepo.deleteAll();
    return { success: true, message: "All storage settings cleared. Please re-enter your credentials." };
  }
}

export const storageSettingsService = new StorageSettingsService();

