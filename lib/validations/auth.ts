import { z } from "zod"

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
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

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    username: z.string(),
    role: z.enum(["admin", "user", "super_admin"]),
    location: z.string().optional()
  }),
  token: z.string()
})