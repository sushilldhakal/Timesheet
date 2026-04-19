import { z } from "zod"
import { mongoIdSchema, objectIdSchema } from "./common"

// Base user role enum - single source of truth
export const userRoleEnum = z.enum(["admin", "manager", "supervisor", "accounts", "user", "super_admin", "employee"])

// Request schemas
export const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: userRoleEnum,
  location: z.array(z.string()).optional(),
  managedRoles: z.array(z.string()).optional(),
  teamIds: z.array(mongoIdSchema).optional(),
  employeeId: mongoIdSchema.optional()
}).refine((data) => {
  // Password is required unless employeeId is provided (promoting existing employee)
  return data.password || data.employeeId;
}, {
  message: "Password is required when not promoting an existing employee",
  path: ["password"]
})

export const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: userRoleEnum.optional(),
  location: z.array(z.string()).optional(),
  managedRoles: z.array(z.string()).optional(),
  teamIds: z.array(mongoIdSchema).optional()
})

// Response schemas
export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: userRoleEnum,
  location: z.array(z.string()),
  rights: z.array(z.string()),
  managedRoles: z.array(z.string()),
  teamIds: z.array(z.string()).optional(),
  createdAt: z.number().optional(),
})

// Standardized API response wrappers
export const usersListResponseSchema = z.object({
  data: z.object({
    users: z.array(userResponseSchema),
  })
})

export const userCreateResponseSchema = z.object({
  data: z.object({
    user: userResponseSchema,
  })
})

export const singleUserResponseSchema = z.object({
  data: z.object({
    user: userResponseSchema,
  })
})

export const userUpdateResponseSchema = z.object({
  data: z.object({
    user: userResponseSchema,
  })
})

export const userDeleteResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
  })
})

// Legacy schemas for backward compatibility
export const adminCreateSchema = z.object({
  email: z.string().email("Invalid email").min(1, "Email required").trim().toLowerCase(),
  password: z.string().min(6, "Password at least 6 characters").max(128),
})

export const userAdminUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  password: z.string().min(6).max(128).optional(),
  role: userRoleEnum.optional(),
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
