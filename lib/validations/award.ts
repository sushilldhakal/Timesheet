import { z } from 'zod'
import { mongoIdSchema } from './common'
import { awardSchema, awardRuleSchema } from './awards'

// Award query schema
export const awardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  search: z.string().optional().default(""),
  tags: z.array(z.string()).optional(), // Filter by tags
  isActive: z.boolean().optional(),
})

// Award creation schema using the new unified system
export const awardCreateSchema = awardSchema.omit({ 
  createdAt: true, 
  updatedAt: true 
})

// Award update schema
export const awardUpdateSchema = awardCreateSchema.partial()

// Award rule creation/update schemas
export const awardRuleCreateSchema = awardRuleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const awardRuleUpdateSchema = awardRuleCreateSchema.partial()

// Award ID parameter schema
export const awardIdParamSchema = z.object({
  id: mongoIdSchema,
})

// Award rule ID parameter schema
export const awardRuleIdParamSchema = z.object({
  awardId: mongoIdSchema,
  ruleId: z.string(),
})

// Award response schema (updated for new structure)
export const awardResponseSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  levelRates: z.array(z.object({
    level: z.string(),
    employmentType: z.string(),
    hourlyRate: z.number(),
    effectiveFrom: z.string(),
    effectiveTo: z.string().nullable().optional(),
  })).default([]),
  availableTags: z.array(z.object({
    _id: z.string().optional(),
    name: z.string(),
  })),
  rules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    priority: z.number(),
    canStack: z.boolean(),
    conditions: z.any(),
    outcome: z.object({
      type: z.enum(['ordinary', 'overtime', 'allowance', 'toil', 'break', 'leave']),
      exportName: z.string(),
    }).and(z.any()),
    isActive: z.boolean(),
  })),
  isActive: z.boolean(),
  version: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Awards list response
export const awardsListResponseSchema = z.object({
  awards: z.array(awardResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
})

// Award creation response
export const awardCreateResponseSchema = awardResponseSchema

// Single award response
export const singleAwardResponseSchema = awardResponseSchema

// Award rule response
export const awardRuleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  priority: z.number(),
  canStack: z.boolean(),
  conditions: z.any(),
  outcome: z.object({
    type: z.enum(['ordinary', 'overtime', 'allowance', 'toil', 'break', 'leave']),
    exportName: z.string(),
  }).and(z.any()), // Allow additional fields based on outcome type
  isActive: z.boolean(),
})

// Award evaluation request (updated to use ShiftContext)
export const awardEvaluationRequestSchema = z.object({
  employeeId: z.string(),
  employmentType: z.string(),
  baseRate: z.number().min(0),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  awardTags: z.array(z.string()).default([]),
  rosteredStart: z.string().datetime().optional(),
  rosteredEnd: z.string().datetime().optional(),
  isPublicHoliday: z.boolean().default(false),
  weeklyHoursWorked: z.number().min(0).default(0),
  dailyHoursWorked: z.number().min(0).default(0),
  consecutiveShifts: z.number().min(0).default(0),
  breaks: z.array(z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    isPaid: z.boolean(),
  })).default([]),
})

export const awardEvaluationResponseSchema = z.object({
  payLines: z.array(z.object({
    units: z.number(),
    from: z.string().datetime(),
    to: z.string().datetime(),
    name: z.string(),
    exportName: z.string(),
    ordinaryHours: z.number(),
    cost: z.number(),
    baseRate: z.number(),
    multiplier: z.number().optional(),
    ruleId: z.string().optional(),
  })),
  totalCost: z.number(),
  totalHours: z.number(),
  breakEntitlements: z.array(z.object({
    startTime: z.string().datetime(),
    durationMinutes: z.number(),
    isPaid: z.boolean(),
    name: z.string(),
    exportName: z.string(),
  })),
  leaveAccruals: z.array(z.object({
    type: z.string(),
    hoursAccrued: z.number(),
    exportName: z.string(),
  })),
})