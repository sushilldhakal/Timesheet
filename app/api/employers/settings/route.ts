import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { Employer } from "@/lib/db/schemas/employer"
import { errorResponseSchema } from "@/lib/validations/auth"
import { isLikelyObjectIdString } from "@/shared/ids"

const settingsResponseSchema = z.object({
  enableExternalHire: z.boolean(),
})

const settingsUpdateSchema = z.object({
  enableExternalHire: z.boolean(),
})

async function findEmployer(tenantId: string | undefined) {
  if (!tenantId) return null
  await connectDB()
  // Try by ObjectId first, then fall back to name (slug) for legacy setups
  if (isLikelyObjectIdString(tenantId)) {
    return Employer.findById(tenantId).lean()
  }
  return (Employer as any).findOne({ slug: tenantId }).lean()
}

/** GET /api/employers/settings — returns org-level feature flags */
export const GET = createApiRoute({
  method: "GET",
  path: "/api/employers/settings",
  summary: "Get org settings",
  description: "Returns org-level feature flags such as enableExternalHire",
  tags: ["Employers"],
  security: "adminAuth",
  responses: {
    200: settingsResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const employer = await findEmployer(auth.tenantId)
    return {
      status: 200,
      data: { enableExternalHire: (employer as any)?.enableExternalHire ?? false },
    }
  },
})

/** PATCH /api/employers/settings — update org-level feature flags (admin only) */
export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/employers/settings",
  summary: "Update org settings",
  description: "Update org-level feature flags such as enableExternalHire",
  tags: ["Employers"],
  security: "adminAuth",
  request: { body: settingsUpdateSchema },
  responses: {
    200: settingsResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }
    if (!isAdminOrSuperAdmin(auth.role)) return { status: 403, data: { error: "Forbidden" } }

    await connectDB()

    if (!body) return { status: 400, data: { error: "Request body is required" } }

    let employer
    if (auth.tenantId && isLikelyObjectIdString(auth.tenantId)) {
      employer = await Employer.findByIdAndUpdate(
        auth.tenantId,
        { $set: { enableExternalHire: body.enableExternalHire } },
        { new: true }
      ).lean()
    } else if (auth.tenantId) {
      employer = await (Employer as any).findOneAndUpdate(
        { slug: auth.tenantId },
        { $set: { enableExternalHire: body.enableExternalHire } },
        { new: true }
      ).lean()
    }

    if (!employer) return { status: 404, data: { error: "Organisation not found" } }

    return {
      status: 200,
      data: { enableExternalHire: (employer as any).enableExternalHire ?? false },
    }
  },
})
