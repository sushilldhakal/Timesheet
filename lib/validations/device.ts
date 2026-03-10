import { z } from 'zod'

// Device activation schema
export const deviceActivateSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  activationCode: z.string().min(1, "Activation code is required"),
})

// Device check schema
export const deviceCheckSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
})

// Device info schema
export const deviceInfoSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  deviceName: z.string(),
  locationName: z.string(),
  lastActivity: z.string().datetime().optional(),
})

// Device activation response
export const deviceActivateResponseSchema = z.object({
  success: z.boolean(),
  device: deviceInfoSchema.optional(),
  error: z.string().optional(),
  issues: z.any().optional(),
})

// Device check response
export const deviceCheckResponseSchema = z.object({
  authorized: z.boolean(),
  device: deviceInfoSchema.optional(),
  error: z.string().optional(),
  reason: z.string().optional(),
  issues: z.any().optional(),
})