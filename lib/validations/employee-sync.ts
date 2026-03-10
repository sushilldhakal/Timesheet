import { z } from 'zod';

// Employee sync request schema
export const employeeSyncRequestSchema = z.object({
  pin: z.string().optional(),
  employeeId: z.string().optional()
}).refine(data => data.pin || data.employeeId, {
  message: "Either pin or employeeId is required"
});

// Employee sync response schema
export const employeeSyncResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  total: z.number().optional(),
  updated: z.number().optional(),
  skipped: z.number().optional(),
  employee: z.object({
    id: z.string(),
    name: z.string(),
    pin: z.string(),
    previousPhoto: z.string().optional(),
    newPhoto: z.string().optional(),
    photoDate: z.string().optional(),
    photoTime: z.string().optional()
  }).optional()
});