import { z } from "zod"
import { RIGHTS_LIST } from "@/lib/config/rights"

export const userRoleEnum = z.enum(["admin", "user"])

const rightsSchema = z.array(z.enum(RIGHTS_LIST as [string, ...string[]]))

/** Admin creates user - full fields */
export const userCreateSchema = z.object({
  name: z.string().min(1, "Name required").max(200).trim(),
  username: z.string().min(1, "Username required").max(100).trim().toLowerCase(),
  password: z.string().min(6, "Password at least 6 characters").max(128),
  role: userRoleEnum.optional().default("user"),
  location: z.array(z.string().trim()).default([]),
  rights: rightsSchema.optional().default([]),
})

/** Admin updates user - full fields, all optional except at least one */
export const userAdminUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  username: z.string().min(1).max(100).trim().toLowerCase().optional(),
  password: z.string().min(6).max(128).optional(),
  role: userRoleEnum.optional(),
  location: z.array(z.string().trim()).optional(),
  rights: rightsSchema.optional(),
})

/** User updates own profile - username and password only */
export const userSelfUpdateSchema = z.object({
  username: z.string().min(1, "Username required").max(100).trim().toLowerCase(),
  password: z.string().min(6, "Password at least 6 characters").optional(),
})

export const userUpdateSchema = userAdminUpdateSchema // default for backward compat

export const adminLoginSchema = z.object({
  username: z.string().min(1).max(100).trim().toLowerCase(),
  password: z.string().min(1),
})

export const adminCreateSchema = z.object({
  username: z.string().min(1, "Username required").max(100).trim().toLowerCase(),
  password: z.string().min(6, "Password at least 6 characters").max(128),
})

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId"),
})

export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserAdminUpdateInput = z.infer<typeof userAdminUpdateSchema>
export type UserSelfUpdateInput = z.infer<typeof userSelfUpdateSchema>
export type UserUpdateInput = z.infer<typeof userAdminUpdateSchema>
export type AdminLoginInput = z.infer<typeof adminLoginSchema>
export type AdminCreateInput = z.infer<typeof adminCreateSchema>
