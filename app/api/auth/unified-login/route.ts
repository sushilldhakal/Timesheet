/**
 * Unified Login API
 * 
 * Handles login for both admins (users collection) and employees (employees collection)
 * Routes to appropriate dashboard based on user type
 * Supports explicit loginAs parameter to handle users who exist in both collections
 */

import { connectDB, User, Employee } from "@/lib/db"
import { createAuthToken, setAuthCookie } from "@/lib/auth/auth-helpers"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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
      const { email, password, loginAs } = body!
      const normalizedEmail = email.trim().toLowerCase()

      await connectDB()

      // If user explicitly chose "staff", check employees only
      if (loginAs === "staff") {
        const employee = await Employee.findOne({ email: normalizedEmail })
          .select("+password")
          .lean()

        if (employee && employee.password) {
          const bcrypt = await import("bcrypt")
          const passwordMatch = await bcrypt.compare(password, employee.password)
          
          if (passwordMatch) {
            // Check if password change is required
            if (employee.requirePasswordChange) {
              const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/auth-helpers")
              
              const token = await createEmployeeWebToken({
                sub: String(employee._id),
                pin: employee.pin,
              })

              await setEmployeeWebCookie(token)

              return {
                status: 200,
                data: {
                  success: true,
                  requirePasswordChange: true,
                  userType: "employee",
                }
              }
            }

            // Employee found - create employee web session
            const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/auth-helpers")
            
            const token = await createEmployeeWebToken({
              sub: String(employee._id),
              pin: employee.pin,
            })

            await setEmployeeWebCookie(token)

            const locations = Array.isArray(employee.location) ? employee.location : []
            const employers = Array.isArray(employee.employer) ? employee.employer : []

            return {
              status: 200,
              data: {
                success: true,
                userType: "employee",
                redirect: "/staff/dashboard",
                user: {
                  id: employee._id,
                  name: employee.name,
                  email: employee.email,
                  pin: employee.pin,
                  location: locations[0] || "",
                  employer: employers[0] || "",
                },
              }
            }
          }
        }
        
        // If not found as staff, return error
        return { status: 401, data: { error: "Invalid email or password" } }
      }

      // If user explicitly chose "admin", check users only
      if (loginAs === "admin") {
        const user = await User.findOne({ email: normalizedEmail })
          .select("+password")
          .lean()

        if (user && user.password) {
          const bcrypt = await import("bcrypt")
          const passwordMatch = await bcrypt.compare(password, user.password)
          
          if (passwordMatch) {
            // Admin/Manager found - create admin session
            const token = await createAuthToken({
              sub: String(user._id),
              email: user.email,
              role: user.role,
              location: Array.isArray(user.location) ? user.location[0] : user.location,
            })

            await setAuthCookie(token)

            return {
              status: 200,
              data: {
                success: true,
                userType: "admin",
                redirect: "/dashboard",
                user: {
                  id: user._id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  location: user.location,
                  rights: user.rights ?? [],
                },
              }
            }
          }
        }

        // If not found as admin, return error
        return { status: 401, data: { error: "Invalid email or password" } }
      }

      // No loginAs specified - check both (admin first, then staff)
      // This is for backward compatibility
      const user = await User.findOne({ email: normalizedEmail })
        .select("+password")
        .lean()

      if (user && user.password) {
        const bcrypt = await import("bcrypt")
        const passwordMatch = await bcrypt.compare(password, user.password)
        
        if (passwordMatch) {
          const token = await createAuthToken({
            sub: String(user._id),
            email: user.email,
            role: user.role,
            location: Array.isArray(user.location) ? user.location[0] : user.location,
          })

          await setAuthCookie(token)

          return {
            status: 200,
            data: {
              success: true,
              userType: "admin",
              redirect: "/dashboard",
              user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                rights: user.rights ?? [],
              },
            }
          }
        }
      }

      // Check employees collection
      const employee = await Employee.findOne({ email: normalizedEmail })
        .select("+password")
        .lean()

      if (employee && employee.password) {
        const bcrypt = await import("bcrypt")
        const passwordMatch = await bcrypt.compare(password, employee.password)
        
        if (passwordMatch) {
          if (employee.requirePasswordChange) {
            const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/auth-helpers")
            
            const token = await createEmployeeWebToken({
              sub: String(employee._id),
              pin: employee.pin,
            })

            await setEmployeeWebCookie(token)

            return {
              status: 200,
              data: {
                success: true,
                requirePasswordChange: true,
                userType: "employee",
              }
            }
          }

          const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/auth-helpers")
          
          const token = await createEmployeeWebToken({
            sub: String(employee._id),
            pin: employee.pin,
          })

          await setEmployeeWebCookie(token)

          console.log("Employee web login successful for:", employee.name, "ID:", employee._id)

          const locations = Array.isArray(employee.location) ? employee.location : []
          const employers = Array.isArray(employee.employer) ? employee.employer : []

          return {
            status: 200,
            data: {
              success: true,
              userType: "employee",
              redirect: "/staff/dashboard",
              user: {
                id: employee._id,
                name: employee.name,
                email: employee.email,
                pin: employee.pin,
                location: locations[0] || "",
                employer: employers[0] || "",
              },
            }
          }
        }
      }

      // Not found in either collection or password mismatch
      return { status: 401, data: { error: "Invalid email or password" } }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/unified-login]", err)
      }
      return { status: 500, data: { error: "Login failed" } }
    }
  }
});
