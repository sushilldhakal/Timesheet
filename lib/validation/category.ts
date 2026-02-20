import { z } from "zod"
import { CATEGORY_TYPES_LIST } from "@/lib/config/category-types"

const categoryTypeSchema = z.enum(
  CATEGORY_TYPES_LIST as [string, ...string[]]
)

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Name required").max(200).trim(),
  type: categoryTypeSchema,
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().min(10).max(5000).optional(),
  geofenceMode: z.enum(["hard", "soft"]).optional(),
})

export const categoryUpdateSchema = z.object({
  name: z.string().min(1, "Name required").max(200).trim().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().min(10).max(5000).optional(),
  geofenceMode: z.enum(["hard", "soft"]).optional(),
})

export const categoryTypeParamSchema = z.object({
  type: categoryTypeSchema.optional(),
})

export const categoryIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId"),
})

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
