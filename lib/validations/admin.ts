import { z } from 'zod'
import { objectIdSchema, dateStringSchema } from './common'

// Activity logs query parameters
export const activityLogsQuerySchema = z.object({
  userId: objectIdSchema.optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// Storage settings update request
export const updateStorageSettingsSchema = z.object({
  maxFileSize: z.number().int().min(1024).max(100 * 1024 * 1024).optional(), // 1KB to 100MB
  allowedFileTypes: z.array(z.string()).optional(),
  compressionEnabled: z.boolean().optional(),
  compressionQuality: z.number().min(0.1).max(1.0).optional(),
  retentionDays: z.number().int().min(1).max(3650).optional(), // 1 day to 10 years
})

// Mail settings update request
export const updateMailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required').optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().min(1, 'SMTP user is required').optional(),
  smtpPassword: z.string().optional(),
  fromEmail: z.string().email('Invalid email format').optional(),
  fromName: z.string().min(1, 'From name is required').optional(),
  replyToEmail: z.string().email('Invalid email format').optional(),
})

// Test mail settings request
export const testMailSettingsSchema = z.object({
  testEmail: z.string().email('Invalid email format'),
})

// Cleanup query parameters
export const cleanupQuerySchema = z.object({
  olderThanDays: z.coerce.number().int().min(1).max(3650).optional().default(30),
  dryRun: z.coerce.boolean().optional().default(false),
})

// Create test data request
export const createTestDataSchema = z.object({
  employeeCount: z.number().int().min(1).max(1000).optional().default(10),
  locationCount: z.number().int().min(1).max(100).optional().default(3),
  shiftCount: z.number().int().min(1).max(10000).optional().default(50),
})