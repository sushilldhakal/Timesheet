import { z } from 'zod'

// Query schemas
export const imageProxyQuerySchema = z.object({
  url: z.string().url("Invalid URL format"),
})

// Response schemas - Note: Image proxy returns binary data, not JSON
export const imageProxyErrorResponseSchema = z.object({
  error: z.string(),
})