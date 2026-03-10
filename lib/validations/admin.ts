import { z } from 'zod'

// Activity logs schemas
export const activityLogQuerySchema = z.object({
  category: z.string().optional().default("storage"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  page: z.coerce.number().int().min(1).optional().default(1),
})

export const activityLogCreateSchema = z.object({
  action: z.string().min(1, "Action is required"),
  details: z.string().min(1, "Details is required"),
  status: z.string().min(1, "Status is required"),
  category: z.string().optional().default("storage"),
})

export const activityLogSchema = z.object({
  _id: z.string(),
  action: z.string(),
  details: z.string(),
  status: z.string(),
  userId: z.string(),
  category: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const activityLogsResponseSchema = z.object({
  logs: z.array(activityLogSchema),
  hasMore: z.boolean(),
  total: z.number(),
  page: z.number(),
})

export const activityLogCreateResponseSchema = z.object({
  log: activityLogSchema,
})

// Mail settings schemas
export const mailSettingsUpdateSchema = z.object({
  apiKey: z.string().optional(),
  fromEmail: z.string().email("Invalid from email"),
  fromName: z.string().optional(),
})

export const mailSettingsResponseSchema = z.object({
  settings: z.object({
    fromEmail: z.string(),
    fromName: z.string(),
    hasApiKey: z.boolean(),
  }).nullable(),
})

export const mailTestSchema = z.object({
  testEmail: z.string().email("Invalid email address"),
})

export const mailTestResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
})

// Storage settings schemas
export const storageSettingsUpdateSchema = z.object({
  provider: z.enum(['cloudinary', 'r2']),
  cloudinary: z.object({
    cloudName: z.string().min(1, "Cloud name is required"),
    apiKey: z.string().min(1, "API key is required"),
    apiSecret: z.string().optional(),
  }).optional(),
  r2: z.object({
    accountId: z.string().min(1, "Account ID is required"),
    accessKeyId: z.string().min(1, "Access key ID is required"),
    secretAccessKey: z.string().optional(),
    bucketName: z.string().min(1, "Bucket name is required"),
    publicUrl: z.string().optional(),
  }).optional(),
})

export const storageSettingsResponseSchema = z.object({
  settings: z.object({
    provider: z.enum(['cloudinary', 'r2']),
    isActive: z.boolean(),
    cloudinary: z.object({
      cloudName: z.string(),
      apiKey: z.string(),
      apiSecret: z.string(),
      hasSecret: z.boolean(),
    }).optional(),
    r2: z.object({
      accountId: z.string(),
      accessKeyId: z.string(),
      secretAccessKey: z.string(),
      bucketName: z.string(),
      publicUrl: z.string(),
      hasSecret: z.boolean(),
    }).optional(),
  }).nullable(),
})

export const storageSettingsCreateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export const storageTestResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  details: z.any().optional(),
})

// Storage stats schemas
export const storageStatsResponseSchema = z.object({
  provider: z.enum(['cloudinary', 'r2']).nullable(),
  stats: z.object({
    storageUsedMB: z.number(),
    storageLimitMB: z.number().nullable(),
    assets: z.number(),
    bandwidth: z.number().nullable(),
    bandwidthLimit: z.number().nullable(),
    transformations: z.number().optional(),
    transformationsLimit: z.number().optional(),
    images: z.number(),
    videos: z.number(),
    other: z.number().optional(),
    lastSync: z.string().datetime(),
  }).nullable(),
})

// Cleanup schemas
export const cleanupRequestSchema = z.object({
  beforeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
})

export const cloudinaryCleanupResponseSchema = z.object({
  deleted: z.number(),
  errors: z.array(z.string()),
})

export const timesheetsCleanupResponseSchema = z.object({
  deleted: z.number(),
})