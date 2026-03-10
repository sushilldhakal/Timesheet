import { z } from "zod"
import { 
  loginSchema, 
  pinLoginSchema, 
  changePasswordSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema, 
  setupPasswordSchema, 
  authResponseSchema 
} from "@/lib/validations/auth"

/** Authenticated user (admin/staff) from session */
export type AuthUser = {
  id: string
  name?: string
  username: string
  role: "admin" | "user" | "super_admin"
  location?: string[]
  rights?: string[]
  managedRoles?: string[]
}

export type LoginRequest = z.infer<typeof loginSchema>
export type PinLoginRequest = z.infer<typeof pinLoginSchema>
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>
export type SetupPasswordRequest = z.infer<typeof setupPasswordSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>