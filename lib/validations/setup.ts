import { z } from 'zod'

// Setup status response
export const setupStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    isSetupComplete: z.boolean(),
    hasAdmin: z.boolean(),
    databaseConnected: z.boolean(),
    requiredSteps: z.array(z.string()),
    completedSteps: z.array(z.string()),
    needsSetup: z.boolean(),
  }).optional(),
  error: z.string().optional(),
})

// Admin creation response
export const adminCreateResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  issues: z.any().optional(),
})