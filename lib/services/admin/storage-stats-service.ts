import { getStorageConfig } from "@/lib/storage";
import { AdminStorageSettingsRepo } from "@/lib/db/queries/admin-storage-settings";
import { connectDB } from "@/lib/db";

export class StorageStatsService {
  async getStats() {
    await connectDB();
    const rawSettings = await AdminStorageSettingsRepo.findActiveLean();
    if (!rawSettings) {
      return { provider: null, stats: null, error: null };
    }

    const config = await getStorageConfig();
    if (!config) {
      return {
        provider: (rawSettings as any).provider,
        stats: null,
        error: "Failed to read storage credentials. Please re-save your API secret in Storage Settings.",
      };
    }

    let stats: any = null;
    let error: string | null = null;

    if (config.provider === "cloudinary" && (config as any).cloudinary) {
      if (!(config as any).cloudinary.apiSecret) {
        return {
          provider: "cloudinary",
          stats: null,
          error: "Cloudinary API secret could not be decrypted. Please re-save your credentials.",
        };
      }

      try {
        const cloudinary = await import("cloudinary");
        (cloudinary as any).v2.config({
          cloud_name: (config as any).cloudinary.cloudName,
          api_key: (config as any).cloudinary.apiKey,
          api_secret: (config as any).cloudinary.apiSecret,
        });

        const usage = await (cloudinary as any).v2.api.usage();
        const bytesToMB = (bytes: number | undefined | null) => (bytes ? bytes / (1024 * 1024) : 0);
        const bytesToMBOrNull = (bytes: number | undefined | null) => (bytes ? bytes / (1024 * 1024) : null);

        stats = {
          plan: usage.plan || null,
          storageUsedMB: bytesToMB(usage.storage?.usage),
          storageLimitMB: bytesToMBOrNull(usage.storage?.limit),
          storageCredits: usage.storage?.credits_usage ?? null,
          assets: usage.resources || 0,
          bandwidth: bytesToMB(usage.bandwidth?.usage),
          bandwidthLimit: bytesToMBOrNull(usage.bandwidth?.limit),
          bandwidthCredits: usage.bandwidth?.credits_usage ?? null,
          transformations: usage.transformations?.usage || 0,
          transformationsLimit: usage.transformations?.limit || null,
          transformationsCredits: usage.transformations?.credits_usage ?? null,
          credits: usage.credits?.usage ?? null,
          creditsLimit: usage.credits?.limit ?? null,
          creditsUsedPercent: usage.credits?.used_percent ?? null,
          images: usage.resources_by_type?.image || 0,
          videos: usage.resources_by_type?.video || 0,
          derivedResources: usage.derived_resources || 0,
          lastSync: new Date(),
        };
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || "Unknown error";
        error = `Failed to fetch Cloudinary stats: ${msg}. Please verify your credentials.`;
      }
    } else if (config.provider === "r2" && (config as any).r2) {
      if (!(config as any).r2.secretAccessKey) {
        return {
          provider: "r2",
          stats: null,
          error: "R2 secret access key could not be decrypted. Please re-save your credentials.",
        };
      }

      try {
        const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
        const r2 = (config as any).r2;
        const s3Client = new S3Client({
          region: "auto",
          endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
        });

        let totalSize = 0;
        let totalObjects = 0;
        let imageCount = 0;
        let imageSize = 0;
        let videoCount = 0;
        let videoSize = 0;
        let otherCount = 0;
        let otherSize = 0;
        let oldestDate: Date | null = null;
        let newestDate: Date | null = null;
        let largestFileSize = 0;
        let largestFileName = "";
        let smallestFileSize = Infinity;
        const folders = new Set<string>();
        const extensions = new Map<string, { count: number; size: number }>();
        let continuationToken: string | undefined;

        do {
          const response = await s3Client.send(
            new ListObjectsV2Command({ Bucket: r2.bucketName, ContinuationToken: continuationToken })
          );

          response.Contents?.forEach((obj: any) => {
            const size = obj.Size ?? 0;
            totalSize += size;
            totalObjects++;
            if (size > largestFileSize) {
              largestFileSize = size;
              largestFileName = obj.Key || "";
            }
            if (size < smallestFileSize) smallestFileSize = size;
            if (obj.LastModified) {
              if (!oldestDate || obj.LastModified < oldestDate) oldestDate = obj.LastModified;
              if (!newestDate || obj.LastModified > newestDate) newestDate = obj.LastModified;
            }

            const key = obj.Key || "";
            const folder = key.includes("/") ? key.substring(0, key.lastIndexOf("/")) : "(root)";
            folders.add(folder);

            const ext = key.includes(".") ? key.substring(key.lastIndexOf(".") + 1).toLowerCase() : "no-ext";
            const extEntry = extensions.get(ext) || { count: 0, size: 0 };
            extEntry.count++;
            extEntry.size += size;
            extensions.set(ext, extEntry);

            const lowerKey = key.toLowerCase();
            if (lowerKey.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|avif|heic)$/)) {
              imageCount++;
              imageSize += size;
            } else if (lowerKey.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv|m4v)$/)) {
              videoCount++;
              videoSize += size;
            } else {
              otherCount++;
              otherSize += size;
            }
          });

          continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        if (totalObjects === 0) smallestFileSize = 0;

        const topExtensions = [...extensions.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([ext, data]) => ({ ext, count: data.count, sizeMB: data.size / (1024 * 1024) }));

        stats = {
          storageUsedMB: totalSize / (1024 * 1024),
          storageLimitMB: null,
          assets: totalObjects,
          images: imageCount,
          imageSizeMB: imageSize / (1024 * 1024),
          videos: videoCount,
          videoSizeMB: videoSize / (1024 * 1024),
          other: otherCount,
          otherSizeMB: otherSize / (1024 * 1024),
          bandwidth: null,
          bandwidthLimit: null,
          avgFileSizeKB: totalObjects > 0 ? totalSize / totalObjects / 1024 : 0,
          largestFileSizeKB: largestFileSize / 1024,
          largestFileName,
          smallestFileSizeKB: smallestFileSize / 1024,
          folderCount: folders.size,
          folders: [...folders].slice(0, 20),
          topExtensions,
          oldestFile: oldestDate ? (oldestDate as Date).toISOString() : null,
          newestFile: newestDate ? (newestDate as Date).toISOString() : null,
          bucketName: r2.bucketName,
          lastSync: new Date(),
        };
      } catch (err: any) {
        error = `Failed to fetch R2 stats: ${err?.message || "Unknown error"}. Please verify your credentials.`;
      }
    }

    return { provider: config.provider, stats, error };
  }
}

export const storageStatsService = new StorageStatsService();

