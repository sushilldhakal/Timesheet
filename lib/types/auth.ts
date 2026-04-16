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
  email: string
  role: "admin" | "manager" | "supervisor" | "accounts" | "user" | "super_admin"
  location?: string[]
  /** @deprecated Use role-based permissions instead */
  rights?: string[]
  managedRoles?: string[]
  createdBy?: string
}

export type LoginRequest = z.infer<typeof loginSchema>
export type PinLoginRequest = z.infer<typeof pinLoginSchema>
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>
export type SetupPasswordRequest = z.infer<typeof setupPasswordSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>