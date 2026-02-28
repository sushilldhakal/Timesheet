import { v2 as cloudinary, UploadApiResponse } from "cloudinary"

type CloudinaryConfig = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

const UPLOAD_FOLDER = "timesheet"

/**
 * Configure Cloudinary with provided credentials
 */
function configureCloudinary(config: CloudinaryConfig) {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  })
}

/**
 * Upload a file to Cloudinary using provided config
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  config: CloudinaryConfig,
  options?: {
    folder?: string
    filename?: string
  }
): Promise<UploadApiResponse> {
  configureCloudinary(config)
  
  const folder = options?.folder ?? UPLOAD_FOLDER
  
  if (Buffer.isBuffer(file)) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          ...(options?.filename && { public_id: options.filename }),
        },
        (err: Error | undefined, result: UploadApiResponse | undefined) => {
          if (err) reject(err)
          else if (result) resolve(result)
          else reject(new Error("Upload returned no result"))
        }
      )
      uploadStream.end(file)
    })
  }
  
  return cloudinary.uploader.upload(file, {
    folder,
    resource_type: "image",
    ...(options?.filename && { public_id: options.filename }),
  })
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFromCloudinary(
  publicId: string,
  config: CloudinaryConfig
): Promise<void> {
  configureCloudinary(config)
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" })
}

/**
 * List resources in a folder
 */
async function listResourcesInFolder(
  prefix: string,
  config: CloudinaryConfig,
  maxResults: number = 500
): Promise<Array<{ public_id: string; created_at: string }>> {
  configureCloudinary(config)
  
  const prefixNorm = prefix.endsWith("/") ? prefix : `${prefix}/`
  const out: Array<{ public_id: string; created_at: string }> = []
  let nextCursor: string | undefined
  
  do {
    const result = (await cloudinary.api.resources({
      type: "upload",
      prefix: prefixNorm,
      max_results: Math.min(maxResults, 500),
      ...(nextCursor && { next_cursor: nextCursor }),
    })) as { resources: Array<{ public_id: string; created_at: string }>; next_cursor?: string }
    
    out.push(...(result.resources ?? []))
    nextCursor = result.next_cursor
  } while (nextCursor)
  
  return out
}

/**
 * Delete images older than a specific date
 */
export async function deleteImagesOlderThanDate(
  beforeDate: string,
  config: CloudinaryConfig,
  folder: string = UPLOAD_FOLDER
): Promise<{ deleted: number; errors: number }> {
  const cutoff = new Date(beforeDate + "T00:00:00.000Z").getTime()
  const resources = await listResourcesInFolder(folder, config)
  
  let deleted = 0
  let errors = 0
  
  for (const r of resources) {
    const created = new Date(r.created_at).getTime()
    if (created < cutoff) {
      try {
        await deleteFromCloudinary(r.public_id, config)
        deleted++
      } catch {
        errors++
      }
    }
  }
  
  return { deleted, errors }
}
