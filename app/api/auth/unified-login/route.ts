/**
 * Unified Login API
 * 
 * Handles login for both admins (users collection) and employees (employees collection)
 * Routes to appropriate dashboard based on user type
 * Supports explicit loginAs parameter to handle users who exist in both collections
 */

import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { unifiedLoginService } from "@/lib/services/auth/unified-login-service"

// Request schema
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  loginAs: z.enum(["admin", "staff"]).optional(),
})

// Response schemas
const loginResponseSchema = z.object({
  success: z.boolean(),
  userType: z.enum(["admin", "employee"]),
  redirect: z.string().optional(),
  requirePasswordChange: z.boolean().optional(),
  user: z.object({
    id: z.any(),
    name: z.string(),
    email: z.string(),
    pin: z.string().optional(),
    role: z.string().optional(),
    location: z.any().optional(),
    employer: z.string().optional(),
    rights: z.array(z.string()).optional(),
  }).optional()
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/auth/unified-login',
  summary: 'Unified login for admins and employees',
  description: 'Handles login for both admin users and employees with optional loginAs parameter',
  tags: ['auth'],
  security: 'none',
  request: {
    body: loginSchema
  },
  responses: {
    200: loginResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      const result = await unifiedLoginService.login(body)
      if ((result as any)?.status) return result as any
      return { status: 200, data: result as any }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/unified-login]", err)
      }
      return { status: 500, data: { error: "Login failed" } }
    }
  }
});
