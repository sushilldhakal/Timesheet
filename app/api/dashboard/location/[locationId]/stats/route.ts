import { NextResponse } from 'next/server'
import { getAuthWithUserLocations } from '@/lib/auth-api'
import { connectDB, Category } from '@/lib/db'
import { dashboardCache } from '@/lib/utils/dashboard-cache'
import { 
  getUserPermissionContext, 
  canViewLocation 
} from '@/lib/utils/dashboard-permissions'
import { getEnabledRolesForLocation } from '@/lib/utils/dashboard-validation'
import { 
  getActiveRoleAssignments,
  aggregateShiftData 
} from '@/lib/utils/dashboard-queries'
import mongoose from 'mongoose'

const { ObjectId } = mongoose.Types

export async function GET(
  request: Request,
  { params }: { params: { locationId: string } }
) {
  try {
    // 1. Authentication
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Validate ObjectId format
    const { locationId } = params
    if (!ObjectId.isValid(locationId)) {
      return NextResponse.json(
        { 
          error: 'Invalid location ID format',
          code: 'INVALID_OBJECT_ID'
        },
        { status: 400 }
      )
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    let effectiveDate = new Date()
    
    if (dateParam) {
      const parsed = new Date(dateParam)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid date parameter',
            code: 'INVALID_DATE_FORMAT',
            details: {
              provided: dateParam,
              expected: 'ISO 8601 date string (e.g., 2024-01-15)'
            }
          },
          { status: 400 }
        )
      }
      effectiveDate = parsed
    }

    // 4. Check cache
    const cacheKey = dashboardCache.generateKey(
      `/api/dashboard/location/${locationId}/stats`,
      { date: dateParam || undefined }
    )
    
    const cached = dashboardCache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'X-Cache': 'HIT'
        }
      })
    }

    await connectDB()

    // 5. Authorization
    const permCtx = await getUserPermissionContext(ctx.auth.sub)
    if (!permCtx || !canViewLocation(permCtx, locationId)) {
      console.warn('[SECURITY] Unauthorized access attempt', {
        userId: ctx.auth.sub,
        resource: 'location',
        resourceId: locationId,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json(
        { 
          error: 'Forbidden: You do not have permission to view this location',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      )
    }

    // 6. Verify location exists
    const location = await Category.findById(locationId)
      .select('name type')
      .lean()
    
    if (!location || location.type !== 'location') {
      return NextResponse.json(
        { 
          error: 'Location not found',
          code: 'RESOURCE_NOT_FOUND',
          details: { resourceType: 'location', resourceId: locationId }
        },
        { status: 404 }
      )
    }

    // 7. Get enabled roles for this location
    const enabledRoleIds = await getEnabledRolesForLocation(
      locationId,
      effectiveDate
    )

    // 8. Get active role assignments
    const assignments = await getActiveRoleAssignments({
      locationId,
      effectiveDate
    })

    // Filter assignments to only enabled roles
    const filteredAssignments = assignments.filter(a =>
      enabledRoleIds.includes(String((a.roleId as any)._id))
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

    // 10. Build role distribution
    const roleMap = new Map<string, {
      roleId: string
      roleName: string
      roleColor?: string
      employeeCount: number
      totalHours: number
    }>()

    for (const assignment of filteredAssignments) {
      const roleId = String((assignment.roleId as any)._id)
      const roleName = (assignment.roleId as any).name
      const roleColor = (assignment.roleId as any).color
      
      if (!roleMap.has(roleId)) {
        roleMap.set(roleId, {
          roleId,
          roleName,
          roleColor,
          employeeCount: 0,
          totalHours: 0
        })
      }
      
      roleMap.get(roleId)!.employeeCount += 1
    }

    const roleDistribution = Array.from(roleMap.values())
      .sort((a, b) => b.employeeCount - a.employeeCount)

    // 11. Build response
    const response = {
      metadata: {
        locationId,
        locationName: location.name,
        effectiveDate: effectiveDate.toISOString(),
        validationTimestamp: new Date().toISOString(),
        filters: {
          location: locationId,
          ...(dateParam && { date: dateParam })
        }
      },
      metrics: {
        employeeCount: uniquePins.length,
        totalHours: shiftData.totalHours,
        activeEmployees: shiftData.activeEmployees,
        roleDistribution
      },
      dailyTimeline: shiftData.dailyTimeline
    }

    // 12. Cache and return
    dashboardCache.set(cacheKey, response)

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'MISS'
      }
    })

  } catch (err) {
    console.error('[api/dashboard/location/stats GET]', err)
    return NextResponse.json(
      { 
        error: 'Failed to load dashboard statistics',
        code: 'DATABASE_ERROR'
      },
      { status: 500 }
    )
  }
}
