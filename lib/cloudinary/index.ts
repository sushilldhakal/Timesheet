import { v2 as cloudinary, UploadApiResponse } from "cloudinary"

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET
const UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "timesheet"

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.warn(
    "Cloudinary env missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
  )
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
})

/**
 * Upload a file (buffer or base64) to Cloudinary.
 * Returns the secure URL and public_id. Store public_id if you need to delete/update later.
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  options?: {
    folder?: string
    publicId?: string
    resourceType?: "image" | "video" | "raw" | "auto"
  }
): Promise<UploadApiResponse> {
  const folder = options?.folder ?? UPLOAD_FOLDER
  const resourceType = options?.resourceType ?? "image"

  if (Buffer.isBuffer(file)) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          ...(options?.publicId && { public_id: options.publicId }),
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
    resource_type: resourceType,
    ...(options?.publicId && { public_id: options.publicId }),
  })
}

/**
 * Build the full Cloudinary URL for an image (optionally with transformations).
 */
export function getCloudinaryUrl(
  publicIdOrUrl: string,
  options?: {
    width?: number
    height?: number
    crop?: string
    fetchFormat?: "auto" | "webp" | "jpg" | "png"
  }
): string {
  if (publicIdOrUrl.startsWith("http")) return publicIdOrUrl

  return cloudinary.url(publicIdOrUrl, {
    secure: true,
    type: "upload",
    ...(options?.width != null && { width: options.width }),
    ...(options?.height != null && { height: options.height }),
    ...(options?.crop && { crop: options.crop }),
    ...(options?.fetchFormat && { fetch_format: options.fetchFormat }),
  })
}

/**
 * Delete an asset by public_id (optional, for cleanup).
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image"
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
}

/** Resource shape from Cloudinary Admin API resources() */
export type CloudinaryResource = { public_id: string; created_at: string; [key: string]: unknown }

/**
 * List all resources in a folder (paginated). Uses Admin API.
 */
export async function listResourcesInFolder(
  prefix: string,
  options?: { type?: "upload" | "private" | "authenticated"; maxResults?: number }
): Promise<CloudinaryResource[]> {
  const type = options?.type ?? "upload"
  const maxResults = options?.maxResults ?? 500
  const prefixNorm = prefix.endsWith("/") ? prefix : `${prefix}/`
  const out: CloudinaryResource[] = []
  let nextCursor: string | undefined
  do {
    const result = (await cloudinary.api.resources({
      type,
      prefix: prefixNorm,
      max_results: Math.min(maxResults, 500),
      ...(nextCursor && { next_cursor: nextCursor }),
    })) as { resources: CloudinaryResource[]; next_cursor?: string }
    out.push(...(result.resources ?? []))
    nextCursor = result.next_cursor
  } while (nextCursor)
  return out
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Delete images in the timesheet folder older than the given number of days.
 * Returns the count of deleted images.
 */
export async function deleteTimesheetImagesOlderThanDays(
  olderThanDays: number,
  folder: string = UPLOAD_FOLDER
): Promise<{ deleted: number; errors: number }> {
  const resources = await listResourcesInFolder(folder)
  const cutoff = Date.now() - olderThanDays * MS_PER_DAY
  let deleted = 0
  let errors = 0
  for (const r of resources) {
    const created = new Date(r.created_at).getTime()
    if (created < cutoff) {
      try {
        await deleteFromCloudinary(r.public_id, "image")
        deleted++
      } catch {
        errors++
      }
    }
  }
  return { deleted, errors }
}

/**
 * Delete images in the folder older than the given date (start of day UTC).
 * beforeDate: "YYYY-MM-DD"
 */
export async function deleteImagesOlderThanDate(
  beforeDate: string,
  folder: string = UPLOAD_FOLDER
): Promise<{ deleted: number; errors: number }> {
  const cutoff = new Date(beforeDate + "T00:00:00.000Z").getTime()
  const resources = await listResourcesInFolder(folder)
  let deleted = 0
  let errors = 0
  for (const r of resources) {
    const created = new Date(r.created_at).getTime()
    if (created < cutoff) {
      try {
        await deleteFromCloudinary(r.public_id, "image")
        deleted++
      } catch {
        errors++
      }
    }
  }
  return { deleted, errors }
}

export { cloudinary }
