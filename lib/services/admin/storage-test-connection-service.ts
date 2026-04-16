import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { AdminStorageSettingsRepo } from "@/lib/db/queries/admin-storage-settings";
import { decrypt } from "@/lib/utils/storage/encryption";
import { connectDB } from "@/lib/db";

export class StorageTestConnectionService {
  async resolveCredentials(provider: "r2" | "cloudinary", credentials: Record<string, any>) {
    await connectDB();
    let actual = credentials;
    const needsExisting =
      (provider === "r2" && credentials.secretAccessKey === "existing") ||
      (provider === "cloudinary" && credentials.apiSecret === "existing");

    if (!needsExisting) return actual;

    const settings = await AdminStorageSettingsRepo.findActiveLean();
    if (!settings) return { status: 400, data: { error: "No storage settings found in database" } };

    if (provider === "r2") {
      if (!(settings as any).r2SecretAccessKey) {
        return { status: 400, data: { error: "No R2 secret found in database. Please save your R2 credentials first." } };
      }
      actual = {
        accountId: credentials.accountId || (settings as any).r2AccountId,
        accessKeyId: credentials.accessKeyId || (settings as any).r2AccessKeyId,
        bucketName: credentials.bucketName || (settings as any).r2BucketName,
        secretAccessKey: decrypt((settings as any).r2SecretAccessKey),
      };
    } else {
      if (!(settings as any).cloudinaryApiSecret) {
        return { status: 400, data: { error: "No Cloudinary secret found in database. Please save your Cloudinary credentials first." } };
      }
      actual = {
        cloudName: credentials.cloudName || (settings as any).cloudinaryCloudName,
        apiKey: credentials.apiKey || (settings as any).cloudinaryApiKey,
        apiSecret: decrypt((settings as any).cloudinaryApiSecret),
      };
    }

    return actual;
  }

  async test(provider: "r2" | "cloudinary", credentials: Record<string, any>) {
    await connectDB();
    const resolved = await this.resolveCredentials(provider, credentials);
    if ((resolved as any)?.status) return resolved as any;

    if (provider === "r2") {
      const { accountId, accessKeyId, secretAccessKey, bucketName } = resolved as any;
      const missing: string[] = [];
      if (!accountId) missing.push("Account ID");
      if (!accessKeyId) missing.push("Access Key ID");
      if (!secretAccessKey) missing.push("Secret Access Key");
      if (!bucketName) missing.push("Bucket Name");
      if (missing.length) return { status: 400, data: { error: `Missing R2 credentials: ${missing.join(", ")}` } };

      try {
        const s3Client = new S3Client({
          region: "auto",
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey },
        });
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        return { status: 200, data: { success: true, message: "Successfully connected to Cloudflare R2" } };
      } catch (error: any) {
        return {
          status: 400,
          data: { error: "Failed to connect to Cloudflare R2", details: error?.message || "Invalid credentials or bucket not found" },
        };
      }
    }

    const { cloudName, apiKey, apiSecret } = resolved as any;
    const missing: string[] = [];
    if (!cloudName) missing.push("Cloud Name");
    if (!apiKey) missing.push("API Key");
    if (!apiSecret) missing.push("API Secret");
    if (missing.length) return { status: 400, data: { error: `Missing Cloudinary credentials: ${missing.join(", ")}` } };

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=1`, {
        headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` },
      });

      if (response.ok) {
        return { status: 200, data: { success: true, message: "Successfully connected to Cloudinary" } };
      }
      const errorData = await response.json();
      return { status: 400, data: { error: "Failed to connect to Cloudinary", details: errorData?.error?.message || "Invalid credentials" } };
    } catch (error: any) {
      return { status: 400, data: { error: "Failed to connect to Cloudinary", details: error?.message } };
    }
  }
}

export const storageTestConnectionService = new StorageTestConnectionService();

