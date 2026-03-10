import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  dashboardRoleIdParamSchema,
  dashboardDateQuerySchema, 
  roleStatsResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/role/{roleId}/stats',
  summary: 'Get role dashboard statistics',
  description: 'Get dashboard statistics for a specific role including location distribution and metrics',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    params: dashboardRoleIdParamSchema,
    query: dashboardDateQuerySchema,
  },
  responses: {
    200: roleStatsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, query }) => {
    const { getAuthWithUserLocations } = await import('@/lib/auth/auth-api')
    const { connectDB, Category } = await import('@/lib/db')
    const { dashboardCache } = await import('@/lib/utils/dashboard/dashboard-cache')
    const { 
      getUserPermissionContext, 
      canViewRole 
    } = await import('@/lib/utils/dashboard/dashboard-permissions')
    const { getEnabledLocationsForRole } = await import('@/lib/utils/dashboard/dashboard-validation')
    const { 
      getActiveRoleAssignments,
      aggregateShiftData 
    } = await import('@/lib/utils/dashboard/dashboard-queries')
    const mongoose = await import('mongoose')

    const { ObjectId } = mongoose.Types

    try {
      // 1. Authentication
      const ctx = await getAuthWithUserLocations()
      if (!ctx) {
        return { status: 401, data: { error: 'Unauthorized' } }
      }

      // 2. Validate ObjectId format
      const { roleId } = params!
      if (!ObjectId.isValid(roleId)) {
        return {
          status: 400,
          data: { 
            error: 'Invalid role ID format',
            code: 'INVALID_OBJECT_ID'
          }
        }
      }

      // 3. Parse query parameters
      const { date: dateParam } = query || {}
      let effectiveDate = new Date()
      
      if (dateParam) {
        const parsed = new Date(dateParam)
        if (isNaN(parsed.getTime())) {
          return {
            status: 400,
            data: {
              error: 'Invalid date parameter',
              code: 'INVALID_DATE_FORMAT',
              details: {
                provided: dateParam,
                expected: 'ISO 8601 date string (e.g., 2024-01-15)'
              }
            }
          }
        }
        effectiveDate = parsed
      }

      // 4. Check cache
      const cacheKey = dashboardCache.generateKey(
        `/api/dashboard/role/${roleId}/stats`,
        { date: dateParam || undefined }
      )
      
      const cached = dashboardCache.get(cacheKey)
      if (cached) {
        return { status: 200, data: cached }
      }

      await connectDB()

      // 5. Authorization
      const permCtx = await getUserPermissionContext(ctx.auth.sub)
      if (!permCtx || !canViewRole(permCtx, roleId)) {
        console.warn('[SECURITY] Unauthorized access attempt', {
          userId: ctx.auth.sub,
          resource: 'role',
          resourceId: roleId,
          timestamp: new Date().toISOString()
        })
        
        return {
          status: 403,
          data: { 
            error: 'Forbidden: You do not have permission to view this role',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        }
      }

      // 6. Verify role exists
      const role = await Category.findById(roleId)
        .select('name type color')
        .lean()
      
      if (!role || role.type !== 'role') {
        return {
          status: 404,
          data: { 
            error: 'Role not found',
            code: 'RESOURCE_NOT_FOUND',
            details: { resourceType: 'role', resourceId: roleId }
          }
        }
      }

      // 7. Get enabled locations for this role
      const enabledLocationIds = await getEnabledLocationsForRole(
        roleId,
        effectiveDate
      )

      // 8. Get active role assignments
      const assignments = await getActiveRoleAssignments({
        roleId,
        effectiveDate
      })

      // Filter assignments to only enabled locations
      const filteredAssignments = assignments.filter(a =>
        enabledLocationIds.includes(String((a.locationId as any)._id))
      )

      // 9. Aggregate metrics
      const employeePins = filteredAssignments.map(a => (a.employeeId as any).pin)
      const uniquePins = [...new Set(employeePins)]
      
      const startDate = new Date(effectiveDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(effectiveDate)
      endDate.setHours(23, 59, 59, 999)
      
      const shiftData = await aggregateShiftData(
        uniquePins,
        startDate,
        endDate
      )

      // 10. Build location distribution
      const locationMap = new Map<string, {
        locationId: string
        locationName: string
        employeeCount: number
        totalHours: number
      }>()

      for (const assignment of filteredAssignments) {
        const locationId = String((assignment.locationId as any)._id)
        const locationName = (assignment.locationId as any).name
        
        if (!locationMap.has(locationId)) {
          locationMap.set(locationId, {
            locationId,
            locationName,
            employeeCount: 0,
            totalHours: 0
          })
        }
        
        locationMap.get(locationId)!.employeeCount += 1
      }

      const locationDistribution = Array.from(locationMap.values())
        .sort((a, b) => b.employeeCount - a.employeeCount)

      // 11. Build response
      const response = {
        metadata: {
          roleId,
          roleName: role.name,
          roleColor: role.color,
          effectiveDate: effectiveDate.toISOString(),
          validationTimestamp: new Date().toISOString(),
          filters: {
            role: roleId,
            ...(dateParam && { date: dateParam })
          }
        },
        metrics: {
          employeeCount: uniquePins.length,
          totalHours: shiftData.totalHours,
          activeEmployees: shiftData.activeEmployees,
          locationDistribution
        },
        dailyTimeline: shiftData.dailyTimeline
      }

      // 12. Cache and return
      dashboardCache.set(cacheKey, response)

      return { status: 200, data: response }

    } catch (err) {
      console.error('[api/dashboard/role/stats GET]', err)
      return {
        status: 500,
        data: { 
          error: 'Failed to load dashboard statistics',
          code: 'DATABASE_ERROR'
        }
      }
    }
  }
})