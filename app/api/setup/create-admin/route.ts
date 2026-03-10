import { NextRequest, NextResponse } from "next/server"
import { connectDB, User } from "@/lib/db"
import { setAdminExistsCache } from "@/lib/db/setup"
import { adminCreateSchema } from "@/lib/validations/user"
import { createApiRoute } from "@/lib/api/create-api-route"
import { adminCreateResponseSchema } from "@/lib/validations/setup"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/setup/create-admin',
  summary: 'Create admin user',
  description: 'Create the initial admin user during setup',
  tags: ['Setup'],
  security: 'none',
  request: {
    body: adminCreateSchema,
  },
  responses: {
    200: adminCreateResponseSchema,
    400: adminCreateResponseSchema,
    409: adminCreateResponseSchema,
    500: adminCreateResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      const { username, password } = body!;

      await connectDB()

      const existing = await User.findOne({ username: username.toLowerCase() })
      if (existing) {
        return {
          status: 409,
          data: { success: false, error: "Username already exists" }
        };
      }

      const now = Math.floor(Date.now() / 1000) // Unix timestamp in seconds

      await User.create({
        name: "Administrator",
        username: username.toLowerCase(),
        password,
        role: "admin",
        location: [],
        rights: [],
        createdAt: now,
        updatedAt: now,
      })

      setAdminExistsCache(true)

      return {
        status: 200,
        data: { success: true }
      };
    } catch (err) {
      console.error("[setup/create-admin]", err)
      return {
        status: 500,
        data: { success: false, error: "Failed to create admin" }
      };
    }
  }
});
