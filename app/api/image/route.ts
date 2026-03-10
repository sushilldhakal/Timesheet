import { createApiRoute } from "@/lib/api/create-api-route"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { 
  imageProxyQuerySchema,
  imageProxyErrorResponseSchema,
} from "@/lib/validations/image"
import { errorResponseSchema } from "@/lib/validations/auth"

/** Allowed domains for image proxy – only Cloudinary. Prevents open redirect. */
const ALLOWED_HOSTS = ["res.cloudinary.com"]

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      ALLOWED_HOSTS.some((h) => parsed.hostname === h)
    )
  } catch {
    return false
  }
}

/** GET /api/image?url=... – Auth-protected image proxy. Requires dashboard or employee session. */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/image',
  summary: 'Image proxy',
  description: 'Auth-protected image proxy for Cloudinary images. Requires dashboard or employee session.',
  tags: ['Media'],
  security: 'none', // Handles both adminAuth and employeeAuth internally
  request: {
    query: imageProxyQuerySchema,
  },
  responses: {
    200: z.any(), // Binary image data
    400: imageProxyErrorResponseSchema,
    401: imageProxyErrorResponseSchema,
    404: imageProxyErrorResponseSchema,
    500: imageProxyErrorResponseSchema,
  },
  handler: async ({ query, req }) => {
    // Custom auth check since we support both admin and employee auth
    const dashboardAuth = await getAuthFromCookie()
    const employeeAuth = await getEmployeeFromCookie()

    if (!dashboardAuth && !employeeAuth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { url } = query!
    const decoded = decodeURIComponent(url)
    
    if (!isAllowedUrl(decoded)) {
      return { status: 400, data: { error: "Invalid image URL" } }
    }

    try {
      const res = await fetch(decoded, {
        headers: { Accept: "image/*" },
        next: { revalidate: 3600 },
      })

      if (!res.ok) {
        return { status: 404, data: { error: "Image not found" } }
      }

      const contentType = res.headers.get("content-type") ?? "image/jpeg"
      const blob = await res.blob()

      // Return raw NextResponse for binary data
      return new NextResponse(blob, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
        },
      }) as any
    } catch (err) {
      console.error("[api/image]", err)
      return { status: 500, data: { error: "Failed to fetch image" } }
    }
  }
})