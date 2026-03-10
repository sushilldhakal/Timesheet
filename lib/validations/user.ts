import { z } from "zod"
import { mongoIdSchema } from "./common"

export const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  username: z.string().min(1, "Username is required").max(50),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.enum(["admin", "user", "super_admin"]).optional(),
  location: z.array(z.string()).optional(),
  rights: z.array(z.string()).optional(),
  managedRoles: z.array(z.string()).optional(),
  employeeId: mongoIdSchema.optional()
})

export const userUpdateSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  role: z.enum(["admin", "user", "super_admin"]).optional(),
  location: mongoIdSchema.optional(),
  rights: z.array(z.string()).optional(),
  managedRoles: z.array(mongoIdSchema).optional()
})

export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.enum(["admin", "user", "super_admin"]),
  location: z.array(z.string()),
  rights: z.array(z.string()),
  managedRoles: z.array(z.string()),
  createdAt: z.number().optional(),
})

// Users list response
export const usersListResponseSchema = z.object({
  users: z.array(userResponseSchema),
})

// User creation response
export const userCreateResponseSchema = z.object({
  user: userResponseSchema,
})

// Single user response
export const singleUserResponseSchema = z.object({
  user: userResponseSchema,
})

// User update response
export const userUpdateResponseSchema = z.object({
  user: userResponseSchema,
})

// User deletion response
export const userDeleteResponseSchema = z.object({
  success: z.boolean(),
})

export const adminCreateSchema = z.object({
  username: z.string().min(1, "Username required").max(100).trim().toLowerCase(),
  password: z.string().min(6, "Password at least 6 characters").max(128),
})

export const userAdminUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  username: z.string().min(1).max(100).trim().toLowerCase().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  password: z.string().min(6).max(128).optional(),
  role: z.enum(["admin", "user"]).optional(),
  location: z.array(z.string().trim()).optional(),
  rights: z.array(z.string()).optional(),
  managedRoles: z.array(z.string().trim()).optional(),
})

export const userSelfUpdateSchema = z.object({
  username: z.string().min(1).max(100).trim().toLowerCase(),
  email: z.string().email().trim().toLowerCase().optional(),
  password: z.string().min(6).optional(),
})

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId"),
})