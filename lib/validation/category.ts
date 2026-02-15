import { z } from "zod"
import { CATEGORY_TYPES_LIST } from "@/lib/config/category-types"

const categoryTypeSchema = z.enum(
  CATEGORY_TYPES_LIST as [string, ...string[]]
)

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Name required").max(200).trim(),
  type: categoryTypeSchema,
})

export const categoryUpdateSchema = z.object({
  name: z.string().min(1, "Name required").max(200).trim(),
})

export const categoryTypeParamSchema = z.object({
  type: categoryTypeSchema.optional(),
})

export const categoryIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId"),
})

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
