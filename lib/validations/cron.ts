import { z } from 'zod'

// Query schemas
export const cronSecretQuerySchema = z.object({
  secret: z.string().optional(),
})

// Response schemas
export const cloudinaryCleanupResponseSchema = z.object({
  ok: z.boolean(),
  deleted: z.number(),
  errors: z.number(),
  message: z.string(),
})