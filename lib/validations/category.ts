import { z } from "zod"
import { mongoIdSchema } from "./common"

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["role", "location", "employer"]),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  parentId: mongoIdSchema.optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().optional(),
  radius: z.number().optional(),
  geofenceMode: z.enum(["hard", "soft"]).optional(),
  openingHour: z.number().optional(),
  closingHour: z.number().optional(),
  workingDays: z.array(z.number()).optional(),
  color: z.string().optional(),
  defaultScheduleTemplate: z.any().optional()
})

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  parentId: mongoIdSchema.optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().optional(),
  radius: z.number().optional(),
  geofenceMode: z.enum(["hard", "soft"]).optional(),
  openingHour: z.number().optional(),
  closingHour: z.number().optional(),
  workingDays: z.array(z.number()).optional(),
  color: z.string().optional(),
  defaultScheduleTemplate: z.any().optional()
})

export const categoryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["role", "location", "employer"]),
  description: z.string().optional(),
  isActive: z.boolean(),
  parentId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().optional(),
  radius: z.number().optional(),
  geofenceMode: z.enum(["hard", "soft"]).optional(),
  openingHour: z.number().optional(),
  closingHour: z.number().optional(),
  color: z.string().optional(),
  defaultScheduleTemplate: z.any().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

export const categoriesListResponseSchema = z.object({
  categories: z.array(categoryResponseSchema)
})

export const categoryCreateResponseSchema = z.object({
  category: categoryResponseSchema
})

export const categoryQuerySchema = z.object({
  type: z.enum(["role", "location", "employer"]).optional()
})
export const categoryIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId"),
})