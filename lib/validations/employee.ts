import { z } from "zod"
import { objectIdSchema, dateTimeSchema, emailSchema, phoneSchema, pinSchema, extendedPaginationSchema } from "./common"

// Employee Certification Schema
export const employeeCertificationSchema = z.object({
  type: z.enum(['wwcc', 'police_check', 'food_safety', 'rsa', 'other']),
  label: z.string().optional(),
  required: z.boolean(),
})

export const employeeCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  pin: pinSchema,
  email: emailSchema.optional(),
  phone: phoneSchema,
  comment: z.string().max(1000).optional(),
  img: z.string().url().optional(),
  profileImage: z.string().url().optional(),
  employmentType: z.string().optional(),
  standardHoursPerWeek: z.number().min(0).max(168).optional(),
  team: z.array(z.string()).optional(), // Category names (legacy - for single location or Cartesian product)
  location: z.array(z.string()).optional(), // Category names
  employer: z.array(z.string()).optional(), // Category names
  locationTeamAssignments: z.array(z.object({
    location: z.string(),
    team: z.string(),
  })).optional(), // Per-location team assignments (preferred for multi-location)
  awardId: objectIdSchema.optional(),
  awardLevel: z.string().optional(),
  password: z.string().min(8).optional(),
  sendSetupEmail: z.boolean().optional(),
  certifications: z.array(employeeCertificationSchema).optional(),
})

export const employeeUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pin: pinSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  comment: z.string().max(1000).optional(),
  img: z.string().url().optional(),
  profileImage: z.string().url().optional(),
  employmentType: z.string().optional(),
  standardHoursPerWeek: z.number().min(0).max(168).optional(),
  team: z.array(z.string()).optional(), // Category names (deprecated - use EmployeeRoleAssignment API)
  employer: z.array(z.string()).optional(),
  location: z.array(z.string()).optional(),
  awardId: objectIdSchema.optional(),
  awardLevel: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
  sendSetupEmail: z.boolean().optional(),
  certifications: z.array(employeeCertificationSchema).optional(),
})

export const employeeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  pin: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  homeAddress: z.string().optional(),
  dob: z.string().optional(),
  comment: z.string().optional(),
  img: z.string().optional(),
  employmentType: z.string().optional(),
  standardHoursPerWeek: z.number().optional(),
  teams: z.array(z.any()).optional(),
  employers: z.array(z.any()).optional(),
  locations: z.array(z.any()).optional(),
  awardId: z.string().optional(),
  awardLevel: z.string().optional(),
  isActive: z.boolean(),
  onboardingCompleted: z.boolean().optional(),
  onboardingCompletedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

export const assignRoleSchema = z.object({
  teamId: objectIdSchema,
  locationId: objectIdSchema,
  validFrom: dateTimeSchema.optional(),
  validTo: dateTimeSchema.optional(),
  notes: z.string().max(500).optional()
})

export const updateAssignmentSchema = z.object({
  validTo: dateTimeSchema.optional(),
  notes: z.string().max(500).optional()
})

// Employee query parameters
export const employeeQuerySchema = extendedPaginationSchema.extend({
  search: z.string().optional(),
  location: z.string().optional(),
  team: z.string().optional(),
  employer: z.string().optional(),
}).merge(z.object({
  sortBy: z.string().optional().default('name'),
}))

// Employee ID parameter validation
export const employeeIdParamSchema = z.object({
  id: objectIdSchema
})
// Response schemas for OpenAPI - simplified for compatibility
export const employeeListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  pin: z.string(),
  teams: z.array(z.any()), // Simplified for now
  employers: z.array(z.any()), // Simplified for now
  locations: z.array(z.any()), // Simplified for now
  email: z.string(),
  phone: z.string(),
  homeAddress: z.string(),
  dob: z.string(),
  gender: z.string(),
  comment: z.string(),
  img: z.string(),
  employmentType: z.string().nullable(),
  standardHoursPerWeek: z.number().nullable(),
  awardId: z.string().nullable(),
  awardLevel: z.string().nullable(),
  onboardingCompleted: z.boolean().optional(),
  onboardingCompletedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const employeesListResponseSchema = z.object({
  employees: z.array(employeeListItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

export const employeeCreateResponseSchema = z.object({
  employee: employeeListItemSchema,
})
