import { z } from 'zod'
import { mongoIdSchema } from './common'

// Award query schema
export const awardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  search: z.string().optional().default(""),
})

// Award creation schema (simplified for basic award creation)
export const awardCreateSchema = z.object({
  name: z.string().min(1, "Award name is required"),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

// Award update schema
export const awardUpdateSchema = awardCreateSchema.partial()

// Award ID parameter schema
export const awardIdParamSchema = z.object({
  id: mongoIdSchema,
})

// Award response schema
export const awardResponseSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  levels: z.array(z.any()).optional(), // Simplified for now
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Awards list response
export const awardsListResponseSchema = z.object({
  awards: z.array(awardResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
})

// Award creation response
export const awardCreateResponseSchema = awardResponseSchema

// Single award response
export const singleAwardResponseSchema = awardResponseSchema