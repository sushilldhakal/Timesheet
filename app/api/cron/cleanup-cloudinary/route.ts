import { createApiRoute } from "@/lib/api/create-api-route"
import { deleteFilesOlderThanDays } from "@/lib/storage"
import { 
  cronSecretQuerySchema,
  cloudinaryCleanupResponseSchema,
} from "@/lib/validations/cron"
import { errorResponseSchema } from "@/lib/validations/auth"

const OLDER_THAN_DAYS = 40

async function runCleanup(req: Request) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? new URL(req.url).searchParams.get("secret")

  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected) {
    return { status: 401, data: { error: "Unauthorized" } }
  }

  try {
    const { deleted, errors } = await deleteFilesOlderThanDays(OLDER_THAN_DAYS)
    return { 
      status: 200, 
      data: {
        ok: true,
        deleted,
        errors,
        message: `Deleted ${deleted} image(s) older than ${OLDER_THAN_DAYS} days; ${errors} error(s).`,
      }
    }
  } catch (err) {
    console.error("[cron/cleanup-cloudinary]", err)
    return { 
      status: 500, 
      data: { 
        error: err instanceof Error ? err.message : "Cleanup failed" 
      }
    }
  }
}

/**
 * GET /api/cron/cleanup-cloudinary
 * Deletes Cloudinary images in the timesheet folder older than 40 days.
 */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/cron/cleanup-cloudinary',
  summary: 'Cleanup old Cloudinary images (GET)',
  description: 'Deletes Cloudinary images in the timesheet folder older than 40 days via GET request',
  tags: ['Cron'],
  security: 'none', // Uses CRON_SECRET for auth
  request: {
    query: cronSecretQuerySchema,
  },
  responses: {
    200: cloudinaryCleanupResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ req }) => {
    return runCleanup(req!)
  }
})

/**
 * POST /api/cron/cleanup-cloudinary
 * Deletes Cloudinary images in the timesheet folder older than 40 days.
 */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/cron/cleanup-cloudinary',
  summary: 'Cleanup old Cloudinary images (POST)',
  description: 'Deletes Cloudinary images in the timesheet folder older than 40 days via POST request',
  tags: ['Cron'],
  security: 'none', // Uses CRON_SECRET for auth
  request: {
    query: cronSecretQuerySchema,
  },
  responses: {
    200: cloudinaryCleanupResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ req }) => {
    return runCleanup(req!)
  }
})