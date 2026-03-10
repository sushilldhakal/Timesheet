import { z } from 'zod';

// PIN check query schema
export const pinCheckQuerySchema = z.object({
  pin: z.string().min(4, "PIN must be at least 4 characters")
});

// PIN check response schema
export const pinCheckResponseSchema = z.object({
  available: z.boolean(),
  pin: z.string()
});

// PIN generation response schema
export const pinGenerationResponseSchema = z.object({
  pin: z.string()
});