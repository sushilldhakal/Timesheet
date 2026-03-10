import { z } from 'zod';

// Device Create Schema
export const deviceCreateSchema = z.object({
  deviceName: z.string().min(1, "Device name is required"),
  locationName: z.string().min(1, "Location name is required"),
  locationAddress: z.string().optional()
});

// Device Update Schema
export const deviceUpdateSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  action: z.enum(["disable", "enable", "revoke"]),
  reason: z.string().optional()
});

// Device Delete Schema
export const deviceDeleteSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required")
});

// Device Response Schema
export const deviceResponseSchema = z.object({
  _id: z.string(),
  deviceId: z.string().optional(),
  deviceName: z.string(),
  locationName: z.string(),
  locationAddress: z.string().optional(),
  status: z.enum(["active", "disabled", "revoked"]),
  registeredBy: z.object({
    _id: z.string(),
    name: z.string(),
    username: z.string()
  }).optional(),
  revokedBy: z.object({
    _id: z.string(),
    name: z.string(),
    username: z.string()
  }).optional(),
  registeredAt: z.string(),
  revokedAt: z.string().optional(),
  revocationReason: z.string().optional(),
  lastActivity: z.string(),
  totalPunches: z.number(),
  activationCode: z.string().optional(),
  activationCodeExpiry: z.string().optional()
});

// Device Create Response Schema
export const deviceCreateResponseSchema = z.object({
  success: z.boolean(),
  device: deviceResponseSchema,
  activationCode: z.string(),
  activationUrl: z.string()
});

// Devices List Response Schema
export const devicesListResponseSchema = z.object({
  devices: z.array(deviceResponseSchema)
});

// Device Update Response Schema
export const deviceUpdateResponseSchema = z.object({
  success: z.boolean(),
  device: deviceResponseSchema
});

// Device Delete Response Schema
export const deviceDeleteResponseSchema = z.object({
  success: z.boolean()
});