import { z } from 'zod';

// Device Register Schema
export const deviceRegisterSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
  locationName: z.string().min(1, "Location name is required"),
  locationAddress: z.string().optional()
});

// Device Register Response Schema
export const deviceRegisterResponseSchema = z.object({
  success: z.boolean(),
  deviceId: z.string()
});