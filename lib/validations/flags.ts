import { z } from 'zod'

// Query schemas
export const flagsQuerySchema = z.object({
  filter: z.enum(['no_image', 'no_location', 'no_image_no_location']).optional(),
  limit: z.string().transform(val => Math.min(Math.max(parseInt(val) || 50, 1), 200)).optional(),
  offset: z.string().transform(val => Math.max(parseInt(val) || 0, 0)).optional(),
  sortBy: z.enum(['date', 'name', 'pin', 'typeLabel', 'hasImage', 'hasLocation', 'issueType']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// Response schemas
export const flagRowSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string(),
  pin: z.string(),
  name: z.string(),
  type: z.string(),
  typeLabel: z.string(),
  hasImage: z.boolean(),
  hasLocation: z.boolean(),
  issueType: z.enum(['no_image', 'no_location', 'no_image_no_location']),
})

export const flagsResponseSchema = z.object({
  items: z.array(flagRowSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})