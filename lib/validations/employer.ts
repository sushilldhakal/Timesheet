import { z } from "zod"
import { objectIdSchema } from "./common"

export const employerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  abn: z.string().max(50).optional(),
  contactEmail: z.string().email().optional(),
  color: z.string().optional(),
  defaultAwardId: objectIdSchema.optional(),
  isActive: z.boolean().optional(),
})

export const employerUpdateSchema = employerCreateSchema.partial()

export const employerQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

export const employerIdParamSchema = z.object({
  id: objectIdSchema,
})

