import { z } from "zod"

// MongoDB ObjectId validation
export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId")
export const objectIdSchema = mongoIdSchema // Alias for consistency

// Common parameter schemas
export const employeeIdParamSchema = z.object({
  id: objectIdSchema
})

export const categoryIdParamSchema = z.object({
  id: objectIdSchema
})

export const userIdParamSchema = z.object({
  id: objectIdSchema
})

export const awardIdParamSchema = z.object({
  id: objectIdSchema
})

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
})

export const extendedPaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(1000).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})

// Date and time schemas
export const dateTimeSchema = z.string().datetime()
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)")
export const timeStringSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (expected HH:MM)")

// Search and filter schemas
export const searchQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
})

export const dateRangeQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
})

// Response schemas
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional()
})

export const successResponseSchema = z.object({
  success: z.boolean().default(true),
  message: z.string().optional()
})

// Common field validations
export const emailSchema = z.string().email("Invalid email format")
export const phoneSchema = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, "Invalid phone number format").optional()
export const pinSchema = z.string().min(3, "PIN must be at least 3 characters").max(10, "PIN must be less than 10 characters")
export const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format (expected #RRGGBB)")

// Coordinate schemas
export const latitudeSchema = z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90")
export const longitudeSchema = z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180")

export const coordinatesSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
})