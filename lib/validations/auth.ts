import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email").min(1, "Email is required"),
  password: z.string().min(1, "Password is required")
})

export const pinLoginSchema = z.object({
  pin: z.string().length(4, "PIN must be 4 digits").regex(/^\d{4}$/, "PIN must contain only digits")
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address")
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
})

export const setupPasswordSchema = z.object({
  token: z.string().min(1, "Setup token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
})

// Response schemas for OpenAPI
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["admin", "user", "super_admin"]),
  location: z.array(z.string()),
  rights: z.array(z.string())
})

export const meUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["admin", "user", "super_admin"]),
  location: z.array(z.string()),
  rights: z.array(z.string()),
  managedRoles: z.array(z.string())
})

export const loginResponseSchema = z.object({
  user: userSchema
})

export const meResponseSchema = z.object({
  user: meUserSchema.nullable()
})

export const tokenVerificationResponseSchema = z.object({
  valid: z.boolean(),
  email: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(["admin", "employee"]).optional()
})

export const resetPasswordResponseSchema = z.object({
  message: z.string(),
  userType: z.enum(["admin", "employee"])
})

export const setupTokenVerificationResponseSchema = z.object({
  valid: z.boolean(),
  email: z.string().optional(),
  name: z.string().optional(),
  pin: z.string().optional()
})

export const setupPasswordResponseSchema = z.object({
  message: z.string(),
  redirect: z.string()
})

export const errorResponseSchema = z.object({
  error: z.string()
})

export const successResponseSchema = z.object({
  message: z.string()
})

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.enum(["admin", "user", "super_admin"]),
    location: z.string().optional()
  }),
  token: z.string()
})