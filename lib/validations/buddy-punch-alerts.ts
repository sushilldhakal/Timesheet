import { z } from 'zod'

// Parameter schemas
export const buddyPunchAlertIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid buddy punch alert ID format"),
})

// Query schemas
export const buddyPunchAlertsQuerySchema = z.object({
  status: z.string().optional(),
  employeeId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format").optional(),
  locationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid location ID format").optional(),
  page: z.string().transform(val => Math.max(parseInt(val) || 1, 1)).optional(),
  limit: z.string().transform(val => Math.min(Math.max(parseInt(val) || 50, 1), 100)).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// Request schemas
export const buddyPunchAlertCreateSchema = z.object({
  employeeId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format"),
  punchType: z.string(),
  punchTime: z.string(),
  matchScore: z.number().min(0).max(1),
  capturedPhotoUrl: z.string().optional(),
  enrolledPhotoUrl: z.string().optional(),
  locationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid location ID format"),
})

export const buddyPunchAlertUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed_buddy', 'dismissed', 'false_alarm']),
  notes: z.string().optional(),
})

// Response schemas
export const buddyPunchAlertSchema = z.object({
  _id: z.string(),
  employeeId: z.any(), // Populated employee object
  punchType: z.string(),
  punchTime: z.string(),
  matchScore: z.number(),
  capturedPhotoUrl: z.string().optional(),
  enrolledPhotoUrl: z.string().optional(),
  locationId: z.any(), // Populated location object
  status: z.string(),
  notes: z.string().optional(),
  reviewedBy: z.any().optional(), // Populated user object
  reviewedAt: z.string().optional(),
})

export const buddyPunchAlertsListResponseSchema = z.object({
  success: z.boolean(),
  alerts: z.array(buddyPunchAlertSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
})

export const buddyPunchAlertResponseSchema = z.object({
  success: z.boolean(),
  alert: buddyPunchAlertSchema,
})

export const buddyPunchAlertCreateResponseSchema = z.object({
  success: z.boolean(),
  alert: buddyPunchAlertSchema,
})

export const buddyPunchAlertUpdateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  alert: buddyPunchAlertSchema,
})