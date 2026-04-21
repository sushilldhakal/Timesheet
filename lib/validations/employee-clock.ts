import { z } from 'zod'
import { objectIdSchema, dateStringSchema } from './common'

// Employee login request
export const employeeLoginSchema = z.object({
  pin: z.string().min(1, 'PIN is required'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})

// Clock action types
export const clockTypeSchema = z.enum(['in', 'break', 'endBreak', 'out'])

// Clock request
export const clockRequestSchema = z.object({
  type: clockTypeSchema,
  imageUrl: z.string().url().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
  noPhoto: z.boolean().optional(),
  offline: z.boolean().optional(),
  offlineTimestamp: z.string().optional(),
  employeePin: z.string().optional(),
  faceDescriptor: z.string().optional(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
})

// Change password request
export const changeEmployeePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
})

// Employee timesheet query parameters
export const employeeTimesheetQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// Offline session request
export const offlineSessionSchema = z.object({
  employeeId: objectIdSchema,
  pin: z.string().min(1, 'PIN is required'),
  offline: z.boolean(),
})

// File upload validation (handled by multer middleware, but we can validate file types)
export const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const maxFileSize = 10 * 1024 * 1024 // 10MB

// Response schemas for OpenAPI
export const employeeLoginResponseSchema = z.object({
  employee: z.object({
    id: z.string(),
    name: z.string(),
    pin: z.string(),
    role: z.string(),
    location: z.string(),
  }),
  punches: z.object({
    clockIn: z.string(),
    breakIn: z.string(),
    breakOut: z.string(),
    clockOut: z.string(),
  }),
  geofenceWarning: z.boolean(),
  isBirthday: z.boolean(),
  detectedLocation: z.string().nullable(),
})

export const clockResponseSchema = z.object({
  success: z.boolean(),
  type: clockTypeSchema,
  date: z.string(),
  time: z.string(),
  lat: z.string(),
  lng: z.string(),
  where: z.string(),
  flag: z.boolean(),
  offline: z.boolean(),
  detectedLocation: z.string(),
  deviceLocation: z.string(),
  syncedAt: z.string().optional(),
  employee: z.object({
    id: z.string(),
    pin: z.string(),
    name: z.string(),
    role: z.string(),
    location: z.string(),
  }),
})

export const employeeMeResponseSchema = z.object({
  employee: z.object({
    pin: z.string(),
    id: z.string(),
    name: z.string(),
    location: z.string(),
    employer: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    homeAddress: z.string().optional(),
    employmentType: z.string().optional(),
    img: z.string().optional(),
    onboardingCompleted: z.boolean().optional(),
    onboardingCompletedAt: z.string().datetime().nullable().optional(),
    timeZone: z.string().optional(),
    nationality: z.string().optional(),
    legalFirstName: z.string().optional(),
    legalMiddleNames: z.string().optional(),
    legalLastName: z.string().optional(),
    preferredName: z.string().optional(),
    address: z.any().optional(),
    emergencyContact: z.any().optional(),
  }),
})

export const employeeTimesheetResponseSchema = z.object({
  timesheets: z.array(z.object({
    id: z.string(),
    date: z.string(),
    clockIn: z.string().optional(),
    clockOut: z.string().optional(),
    breakIn: z.string().optional(),
    breakOut: z.string().optional(),
    totalHours: z.number(),
    totalBreakMinutes: z.number(),
    status: z.string(),
  })),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

export const offlineSessionResponseSchema = z.object({
  sessionId: z.string(),
  employee: z.object({
    id: z.string(),
    name: z.string(),
    pin: z.string(),
  }),
  expiresAt: z.string().datetime(),
})

export const uploadImageResponseSchema = z.object({
  url: z.string().url(),
})
