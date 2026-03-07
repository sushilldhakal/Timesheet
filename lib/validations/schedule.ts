import { z } from "zod"
import { mongoIdSchema, dateTimeSchema } from "./common"

export const scheduleSchema = z.object({
  dayOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: dateTimeSchema,
  endTime: dateTimeSchema,
  locationId: mongoIdSchema,
  roleId: mongoIdSchema,
  effectiveFrom: dateTimeSchema,
  effectiveTo: dateTimeSchema.optional()
})

export const scheduleUpdateSchema = z.object({
  dayOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  startTime: dateTimeSchema.optional(),
  endTime: dateTimeSchema.optional(),
  locationId: mongoIdSchema.optional(),
  roleId: mongoIdSchema.optional(),
  effectiveFrom: dateTimeSchema.optional(),
  effectiveTo: dateTimeSchema.optional()
})

export const scheduleResponseSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  dayOfWeek: z.array(z.number()),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  locationId: z.string(),
  roleId: z.string(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})