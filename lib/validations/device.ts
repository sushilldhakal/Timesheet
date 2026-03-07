import { z } from 'zod'
import { objectIdSchema } from './common'

// Register/activate device request
export const registerDeviceSchema = z.object({
  deviceName: z.string().min(1, 'Device name is required').max(100, 'Device name must be less than 100 characters'),
  locationName: z.string().min(1, 'Location name is required').max(100, 'Location name must be less than 100 characters'),
})

// Update device request
export const updateDeviceSchema = z.object({
  deviceName: z.string().min(1, 'Device name is required').max(100, 'Device name must be less than 100 characters').optional(),
  locationName: z.string().min(1, 'Location name is required').max(100, 'Location name must be less than 100 characters').optional(),
  isActive: z.boolean().optional(),
})

// Device query parameters
export const deviceQuerySchema = z.object({
  search: z.string().optional(),
  locationName: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

// Device ID parameter
export const deviceIdParamSchema = z.object({
  id: objectIdSchema,
})