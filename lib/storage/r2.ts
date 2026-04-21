import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"

type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl?: string
}

const UPLOAD_FOLDER = "timesheet"

/**
 * Create S3 client for R2
 */
export function createR2Client(config: R2Config): S3Client {
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`
  
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadToR2(
  file: Buffer | string,
  config: R2Config,
  options?: {
    folder?: string
    filename?: string
    key?: string
  }
): Promise<{ url: string; key: string }> {
  const client = createR2Client(config)
  
  // Use provided key or build from folder/filename
  let key: string
  if (options?.key) {
    key = options.key
  } else {
    const folder = options?.folder ?? UPLOAD_FOLDER
    const filename = options?.filename ?? `${Date.now()}-${Math.random().toString(36).substring(7)}`
    key = folder ? `${folder}/${filename}` : filename
  }
  
  // Convert string (base64) to buffer if needed
  let buffer: Buffer
  if (Buffer.isBuffer(file)) {
    buffer = file
  } else if (typeof file === "string") {
    // Check if it's a base64 data URL
    if (file.startsWith("data:")) {
      const base64Data = file.split(",")[1]
      buffer = Buffer.from(base64Data, "base64")
    } else {
      buffer = Buffer.from(file, "base64")
    }
  } else {
    throw new Error("Invalid file format")
  }
  
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg", // Default to JPEG, could be made dynamic
    })
  )
  
  // Generate public URL
  // R2 public URLs can be:
  // 1. Custom domain (if configured): https://images.yourdomain.com/key
  // 2. R2.dev subdomain: https://pub-{hash}.r2.dev/key
  // 3. Direct bucket URL (requires public bucket): https://{bucket}.{accountId}.r2.cloudflarestorage.com/key
  
  let publicUrl: string
  
  if (config.publicUrl) {
    // Use custom domain if configured
    publicUrl = `${config.publicUrl}/${key}`
  } else {
    // Use direct bucket URL (note: bucket must be public or have public access configured)
    publicUrl = `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${key}`
  }
  
  return {
    url: publicUrl,
    key,
  }
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string, config: R2Config): Promise<void> {
  const client = createR2Client(config)
  
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })
  )
}

/**
 * List files in a folder
 */
async function listFilesInFolder(
  prefix: string,
  config: R2Config
): Promise<Array<{ key: string; lastModified: Date }>> {
  const client = createR2Client(config)
  const prefixNorm = prefix.endsWith("/") ? prefix : `${prefix}/`
  const files: Array<{ key: string; lastModified: Date }> = []
  
  let continuationToken: string | undefined
  
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: prefixNorm,
        ContinuationToken: continuationToken,
      })
    )
    
    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key && item.LastModified) {
          files.push({
            key: item.Key,
            lastModified: item.LastModified,
          })
        }
      }
    }
    
    continuationToken = response.NextContinuationToken
  } while (continuationToken)
  
  return files
}

/**
 * Delete files older than a specific date
 */
export async function deleteFilesOlderThanDate(
  beforeDate: string,
  config: R2Config,
  folder: string = UPLOAD_FOLDER
): Promise<{ deleted: number; errors: number }> {
  const cutoff = new Date(beforeDate + "T00:00:00.000Z").getTime()
  const files = await listFilesInFolder(folder, config)
  
  let deleted = 0
  let errors = 0
  
  for (const file of files) {
    const fileTime = file.lastModified.getTime()
    if (fileTime < cutoff) {
      try {
        await deleteFromR2(file.key, config)
        deleted++
      } catch {
        errors++
      }
    }
  }
  
  return { deleted, errors }
}
