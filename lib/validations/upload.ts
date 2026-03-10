import { z } from 'zod'

// Response schemas
export const imageUploadResponseSchema = z.object({
  url: z.string().url(),
})