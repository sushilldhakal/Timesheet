/**
 * Employee Password Verification API
 * 
 * Verifies employee password for sensitive operations
 */

import { getEmployeeFromWebCookie } from "@/lib/auth/employee-auth"
import { connectDB, Employee } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

const verifyPasswordRequestSchema = z.object({
  password: z.string().min(1, "Password is required"),
})

const verifyPasswordResponseSchema = z.object({
  verified: z.boolean(),
  message: z.string(),
})

const errorResponseSchema = z.object({
  error: z.string(),
})

// POST - Verify employee password
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/verify-password',
  summary: 'Verify employee password',
  description: 'Verify employee password for sensitive operations like updating bank details',
  tags: ['Employee'],
  security: 'employeeAuth',
  request: {
    body: verifyPasswordRequestSchema,
  },
  responses: {
    200: verifyPasswordResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      const employeeAuth = await getEmployeeFromWebCookie()
      if (!employeeAuth) {
        return {
          status: 401,
          data: { error: "Not authenticated" },
        }
      }

      if (!body || !body.password) {
        return {
          status: 400,
          data: { error: "Password is required" },
        }
      }

      await connectDB()

      // Find employee with password field (normally excluded)
      const employee = await Employee.findById(employeeAuth.sub).select("+password")
      if (!employee) {
        return {
          status: 404,
          data: { error: "Employee not found" },
        }
      }

      // Check if employee has a password set
      if (!(employee as any).password) {
        return {
          status: 400,
          data: { error: "No password set for this account" },
        }
      }

      // Verify password using the comparePassword method
      const isValid = await (employee as any).comparePassword(body.password)

      if (!isValid) {
        return {
          status: 401,
          data: { error: "Incorrect password" },
        }
      }

      return {
        status: 200,
        data: {
          verified: true,
          message: "Password verified successfully",
        },
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[employee/verify-password POST]", err)
      }
      return {
        status: 500,
        data: { error: "Failed to verify password" },
      }
    }
  },
})
