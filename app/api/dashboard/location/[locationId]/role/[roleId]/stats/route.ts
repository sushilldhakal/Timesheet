import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  dashboardLocationRoleParamsSchema,
  dashboardDateQuerySchema, 
  locationRoleStatsResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/location/{locationId}/role/{roleId}/stats',
  summary: 'Get location-role dashboard statistics',
  description: 'Get dashboard statistics for a specific location-role combination including employee breakdown',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    params: dashboardLocationRoleParamsSchema,
    query: dashboardDateQuerySchema,
  },
  responses: {
    200: locationRoleStatsResponseSchema,
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
      canViewLocation,
      canViewRole 
    } = await import('@/lib/utils/dashboard/dashboard-permissions')
    const { validateLocationRolePairing } = await import('@/lib/utils/dashboard/dashboard-validation')
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

      // 2. Validate ObjectId formats
      const { locationId, roleId } = params!
      if (!ObjectId.isValid(locationId)) {
        return {
          status: 400,
          data: { 
            error: 'Invalid location ID format',
            code: 'INVALID_OBJECT_ID'
          }
        }
      }
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
        `/api/dashboard/location/${locationId}/role/${roleId}/stats`,
        { date: dateParam || undefined }
      )
      
      const cached = dashboardCache.get(cacheKey)
      if (cached) {
        return { status: 200, data: cached }
      }

      await connectDB()

      // 5. Authorization
      const permCtx = await getUserPermissionContext(ctx.auth.sub)
      if (!permCtx || !canViewLocation(permCtx, locationId) || !canViewRole(permCtx, roleId)) {
        console.warn('[SECURITY] Unauthorized access attempt', {
          userId: ctx.auth.sub,
          resource: 'location-role',
          locationId,
          roleId,
          timestamp: new Date().toISOString()
        })
        
        return {
          status: 403,
          data: { 
            error: 'Forbidden: You do not have permission to view this location or role',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        }
      }

      // 6. Verify location and role exist
      const location = await Category.findById(locationId)
        .select('name type')
        .lean()
      
      if (!location || location.type !== 'location') {
        return {
          status: 404,
          data: { 
            error: 'Location not found',
            code: 'RESOURCE_NOT_FOUND',
            details: { resourceType: 'location', resourceId: locationId }
          }
        }
      }

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

      // 7. Validate location-role pairing
      const pairingValid = await validateLocationRolePairing(
        locationId,
        roleId,
        effectiveDate
      )

      if (!pairingValid) {
        return {
          status: 400,
          data: {
            error: 'Location-role pairing is not enabled',
            code: 'INVALID_PAIRING',
            details: {
              locationId,
              roleId
            }
          }
        }
      }

      // 8. Get active role assignments
      const assignments = await getActiveRoleAssignments({
        locationId,
        roleId,
        effectiveDate
      })

      // 9. Aggregate metrics
      const employeePins = assignments.map(a => (a.employeeId as any).pin)
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

      // 10. Build employee-level breakdown
      const employees = assignments.map(a => ({
        employeeId: String((a.employeeId as any)._id),
        employeeName: (a.employeeId as any).name,
        totalHours: 0,
        shiftCount: 0
      }))

      // 11. Build response
      const response = {
        metadata: {
          locationId,
          locationName: location.name,
          roleId,
          roleName: role.name,
          roleColor: role.color,
          effectiveDate: effectiveDate.toISOString(),
          validationTimestamp: new Date().toISOString(),
          pairingValid: true,
          filters: {
            location: locationId,
            role: roleId,
            ...(dateParam && { date: dateParam })
          }
        },
        metrics: {
          employeeCount: uniquePins.length,
          totalHours: shiftData.totalHours,
          activeEmployees: shiftData.activeEmployees,
          employees
        },
        dailyTimeline: shiftData.dailyTimeline
      }

      // 12. Cache and return
      dashboardCache.set(cacheKey, response)

      return { status: 200, data: response }

    } catch (err) {
      console.error('[api/dashboard/location/role/stats GET]', err)
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