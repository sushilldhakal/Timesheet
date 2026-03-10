import { z } from 'zod';

// Employee ID parameter schema
export const employeeIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format")
});

// Nested schemas for employee detail response
const geofenceSchema = z.object({
  radius: z.number(),
  mode: z.string()
});

const hoursSchema = z.object({
  opening: z.string().optional(),
  closing: z.string().optional(),
  workingDays: z.array(z.string())
});

const locationDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  address: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  geofence: geofenceSchema,
  hours: hoursSchema
});

const employerDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional()
});

const roleDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional()
});

const roleAssignmentSchema = z.object({
  id: z.string(),
  role: roleDetailSchema,
  location: locationDetailSchema,
  validFrom: z.string(),
  validTo: z.string().nullable(),
  isActive: z.boolean()
});

const awardDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
  description: z.string()
}).nullable();

// Employee Detail Response Schema
export const employeeDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  pin: z.string(),
  email: z.string(),
  phone: z.string(),
  homeAddress: z.string(),
  img: z.string(),
  dob: z.string(),
  gender: z.string(),
  employmentType: z.string().nullable(),
  standardHoursPerWeek: z.number().optional(),
  comment: z.string(),
  award: awardDetailSchema,
  roles: z.array(roleAssignmentSchema),
  employers: z.array(employerDetailSchema),
  locations: z.array(locationDetailSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

// Response schemas
export const employeeDetailResponseSchema = z.object({
  employee: employeeDetailSchema
});

export const employeeDeleteResponseSchema = z.object({
  success: z.boolean()
});