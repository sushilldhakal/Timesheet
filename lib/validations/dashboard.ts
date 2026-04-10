import { z } from 'zod'
import { objectIdSchema } from './common'

// Common parameter schemas
export const dashboardLocationIdParamSchema = z.object({
  locationId: objectIdSchema,
})

export const dashboardRoleIdParamSchema = z.object({
  roleId: objectIdSchema,
})

export const dashboardLocationRoleParamsSchema = z.object({
  locationId: objectIdSchema,
  roleId: objectIdSchema,
})

// Query schemas
export const hoursSummaryQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD").optional(),
})

export const dashboardStatsQuerySchema = z.object({
  timelineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD").optional(),
})

export const dashboardDateQuerySchema = z.object({
  date: z.string().optional(),
})

// Response schemas
export const hoursSummaryResponseSchema = z.object({
  mostHours: z.array(z.object({
    name: z.string(),
    pin: z.string(),
    hours: z.number(),
  })),
  leastHours: z.array(z.object({
    name: z.string(),
    pin: z.string(),
    hours: z.number(),
  })),
  startDate: z.string(),
  endDate: z.string(),
})

export const inactiveEmployeesResponseSchema = z.object({
  inactiveEmployees: z.array(z.object({
    id: z.string(),
    name: z.string(),
    pin: z.string(),
    lastPunchDate: z.string().nullable(),
    daysInactive: z.number(),
  })),
  thresholdDays: z.number(),
})

export const dashboardStatsResponseSchema = z.object({
  dailyTimeline: z.array(z.object({
    hour: z.string(),
    clockIn: z.number(),
    breakIn: z.number(),
    breakOut: z.number(),
    clockOut: z.number(),
  })),
  locationDistribution: z.array(z.object({
    name: z.string(),
    value: z.number(),
    fill: z.string(),
  })),
  attendanceByDay: z.array(z.object({
    day: z.string(),
    count: z.number(),
  })),
  weeklyMonthly: z.array(z.object({
    period: z.string(),
    totalHours: z.number(),
    activeEmployees: z.number(),
    attendanceRate: z.number(),
  })),
  roleStaffingByRole: z.array(z.object({
    name: z.string(),
    count: z.number(),
    color: z.string().optional(),
  })),
  employerMix: z.array(z.record(z.string(), z.union([z.number(), z.string()]))),
  employerCategories: z.array(z.object({
    name: z.string(),
    color: z.string().optional(),
  })),
})

export const userStatsResponseSchema = z.object({
  metadata: z.object({
    userId: z.string(),
    username: z.string(),
    effectiveDate: z.string(),
    validationTimestamp: z.string(),
    managedLocationsCount: z.number(),
    managedRolesCount: z.number(),
  }),
  metrics: z.object({
    totalEmployeeCount: z.number(),
    totalHours: z.number(),
    totalActiveEmployees: z.number(),
  }),
  locationBreakdown: z.array(z.object({
    locationId: z.string(),
    locationName: z.string(),
    employeeCount: z.number(),
    totalHours: z.number(),
    roleDistribution: z.array(z.object({
      roleId: z.string(),
      roleName: z.string(),
      employeeCount: z.number(),
    })),
  })),
  roleBreakdown: z.array(z.object({
    roleId: z.string(),
    roleName: z.string(),
    roleColor: z.string().optional(),
    employeeCount: z.number(),
    totalHours: z.number(),
    locationDistribution: z.array(z.object({
      locationId: z.string(),
      locationName: z.string(),
      employeeCount: z.number(),
    })),
  })),
})

export const roleStatsResponseSchema = z.object({
  metadata: z.object({
    roleId: z.string(),
    roleName: z.string(),
    roleColor: z.string().optional(),
    effectiveDate: z.string(),
    validationTimestamp: z.string(),
    filters: z.object({
      role: z.string(),
      date: z.string().optional(),
    }),
  }),
  metrics: z.object({
    employeeCount: z.number(),
    totalHours: z.number(),
    activeEmployees: z.number(),
    locationDistribution: z.array(z.object({
      locationId: z.string(),
      locationName: z.string(),
      employeeCount: z.number(),
      totalHours: z.number(),
    })),
  }),
  dailyTimeline: z.any(), // Complex timeline structure
})

export const locationStatsResponseSchema = z.object({
  metadata: z.object({
    locationId: z.string(),
    locationName: z.string(),
    effectiveDate: z.string(),
    validationTimestamp: z.string(),
    filters: z.object({
      location: z.string(),
      date: z.string().optional(),
    }),
  }),
  metrics: z.object({
    employeeCount: z.number(),
    totalHours: z.number(),
    activeEmployees: z.number(),
    roleDistribution: z.array(z.object({
      roleId: z.string(),
      roleName: z.string(),
      roleColor: z.string().optional(),
      employeeCount: z.number(),
      totalHours: z.number(),
    })),
  }),
  dailyTimeline: z.any(), // Complex timeline structure
})

export const locationRoleStatsResponseSchema = z.object({
  metadata: z.object({
    locationId: z.string(),
    locationName: z.string(),
    roleId: z.string(),
    roleName: z.string(),
    roleColor: z.string().optional(),
    effectiveDate: z.string(),
    validationTimestamp: z.string(),
    pairingValid: z.boolean(),
    filters: z.object({
      location: z.string(),
      role: z.string(),
      date: z.string().optional(),
    }),
  }),
  metrics: z.object({
    employeeCount: z.number(),
    totalHours: z.number(),
    activeEmployees: z.number(),
    employees: z.array(z.object({
      employeeId: z.string(),
      employeeName: z.string(),
      totalHours: z.number(),
      shiftCount: z.number(),
    })),
  }),
  dailyTimeline: z.any(), // Complex timeline structure
})