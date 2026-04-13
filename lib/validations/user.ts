import { z } from "zod"
import { mongoIdSchema, objectIdSchema } from "./common"

export const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["super_admin", "admin", "manager", "supervisor", "accounts", "user", "employee"]),
  location: z.array(z.string()).optional(),
  managedRoles: z.array(z.string()).optional(),
  teamIds: z.array(mongoIdSchema).optional(),
  employeeId: mongoIdSchema.optional()
})

export const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.enum(["super_admin", "admin", "manager", "supervisor", "accounts", "user", "employee"]).optional(),
  location: z.array(z.string()).optional(),
  managedRoles: z.array(z.string()).optional()
})

export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["super_admin", "admin", "manager", "supervisor", "accounts", "user", "employee"]),
  location: z.array(z.string()),
  rights: z.array(z.string()),
  managedRoles: z.array(z.string()),
  teamIds: z.array(z.string()).optional(),
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
  email: z.string().email("Invalid email").min(1, "Email required").trim().toLowerCase(),
  password: z.string().min(6, "Password at least 6 characters").max(128),
})

export const userAdminUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  password: z.string().min(6).max(128).optional(),
  role: z.enum(["super_admin", "admin", "manager", "supervisor", "accounts", "user", "employee"]).optional(),
  location: z.array(z.string().trim()).optional(),
  managedRoles: z.array(z.string().trim()).optional(),
  teamIds: z.array(mongoIdSchema).optional(),
})

export const userSelfUpdateSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(6).optional(),
})

export const userIdParamSchema = z.object({
  id: objectIdSchema,
})
