import { createApiRoute } from "@/lib/api/create-api-route"
import { uploadFile } from "@/lib/storage"
import { imageUploadResponseSchema } from "@/lib/validations/upload"
import { errorResponseSchema } from "@/lib/validations/auth"

/** POST /api/upload/image - Upload image to Cloudinary. Returns { url } */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/upload/image',
  summary: 'Upload image',
  description: 'Upload image to Cloudinary storage and return the URL',
  tags: ['Media'],
  security: 'adminAuth',
  request: {
    // Note: FormData is handled automatically by createApiRoute
  },
  responses: {
    200: imageUploadResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ req }) => {
    try {
      const formData = await req!.formData()
      const file = formData.get("file")
      
      if (!file || !(file instanceof File)) {
        return { status: 400, data: { error: "No file provided" } }
      }
      
      if (!file.type.startsWith("image/")) {
        return { status: 400, data: { error: "File must be an image" } }
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const result = await uploadFile(buffer, {
        folder: "employees",
      })

      return { status: 200, data: { url: result.url } }
    } catch (err) {
      console.error("[api/upload/image]", err)
      return { status: 500, data: { error: "Failed to upload image" } }
    }
  }
})