import { z } from "zod"
import { objectIdSchema, dateTimeSchema, emailSchema, phoneSchema, pinSchema } from "./common"

export const employeeCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  pin: pinSchema,
  email: emailSchema.optional(),
  phone: phoneSchema,
  homeAddress: z.string().max(500).optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  comment: z.string().max(1000).optional(),
  img: z.string().url().optional(),
  employmentType: z.string().optional(),
  standardHoursPerWeek: z.number().min(0).max(168).optional(),
  role: z.array(z.string()).optional(), // Category names
  location: z.array(z.string()).optional(), // Category names
  employer: z.array(z.string()).optional(), // Category names
  awardId: objectIdSchema.optional(),
  awardLevel: z.string().optional(),
  password: z.string().min(8).optional(),
  sendSetupEmail: z.boolean().optional(),
})

export const employeeUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pin: pinSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  homeAddress: z.string().max(500).optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  comment: z.string().max(1000).optional(),
  img: z.string().url().optional(),
  employmentType: z.string().optional(),
  standardHoursPerWeek: z.number().min(0).max(168).optional(),
  role: z.array(z.string()).optional(), // Category names (deprecated - use EmployeeRoleAssignment API)
  employer: z.array(z.string()).optional(),
  location: z.array(z.string()).optional(),
  awardId: objectIdSchema.optional(),
  awardLevel: z.string().optional(),
  isActive: z.boolean().optional(),
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
  roles: z.array(z.any()).optional(),
  employers: z.array(z.any()).optional(),
  locations: z.array(z.any()).optional(),
  awardId: z.string().optional(),
  awardLevel: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

export const assignRoleSchema = z.object({
  roleId: objectIdSchema,
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
export const employeeQuerySchema = z.object({
  search: z.string().optional(),
  location: z.string().optional(),
  role: z.string().optional(),
  employer: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sortBy: z.string().optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})

// Employee ID parameter validation
export const employeeIdParamSchema = z.object({
  id: objectIdSchema
})
// Response schemas for OpenAPI - simplified for compatibility
export const employeeListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  pin: z.string(),
  roles: z.array(z.any()), // Simplified for now
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