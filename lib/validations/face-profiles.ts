import { z } from 'zod'

// Parameter schemas
export const employeeIdParamSchema = z.object({
  employeeId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format"),
})

// Request schemas
export const faceProfileCreateSchema = z.object({
  employeeId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format"),
  descriptor: z.array(z.number()).min(1, "Face descriptor is required"),
  enrollmentQuality: z.number().min(0).max(1),
  enrolledBy: z.string().default("admin"),
})

export const faceProfileUpdateSchema = z.object({
  isActive: z.boolean(),
})

// Query schemas
export const faceProfilesQuerySchema = z.object({
  activeOnly: z.string().transform(val => val === "true").optional(),
})

// Response schemas
export const faceProfileSchema = z.object({
  _id: z.string(),
  employeeId: z.string(),
  descriptor: z.array(z.number()).optional(), // Not included in list view
  enrollmentQuality: z.number(),
  enrolledBy: z.string(),
  enrolledAt: z.string(),
  isActive: z.boolean(),
})

export const faceProfilesListResponseSchema = z.object({
  success: z.boolean(),
  profiles: z.array(faceProfileSchema),
})

export const faceProfileResponseSchema = z.object({
  success: z.boolean(),
  profile: faceProfileSchema,
})

export const faceProfileCreateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  profile: faceProfileSchema,
})