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

export const templateCreateSchema = z.object({
  roleId: mongoIdSchema,
  organizationId: mongoIdSchema,
  shiftPattern: z.object({
    dayOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    locationId: mongoIdSchema.optional(),
    roleId: mongoIdSchema.optional(),
    isRotating: z.boolean().optional().default(false),
    rotationCycle: z.number().optional(),
    rotationStartDate: z.string().datetime().optional(),
  }),
})

export const templateResponseSchema = z.object({
  id: z.string(),
  roleId: z.string(),
  organizationId: z.string(),
  shiftPattern: z.object({
    dayOfWeek: z.array(z.number()),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    locationId: z.string().optional(),
    roleId: z.string().optional(),
    isRotating: z.boolean(),
    rotationCycle: z.number().optional(),
    rotationStartDate: z.string().datetime().optional(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const templatesListResponseSchema = z.object({
  templates: z.array(templateResponseSchema),
})

export const templateCreateResponseSchema = z.object({
  template: templateResponseSchema,
})

export const templateQuerySchema = z.object({
  organizationId: mongoIdSchema.optional(),
})