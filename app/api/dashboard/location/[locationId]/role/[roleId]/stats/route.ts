import { NextResponse } from 'next/server'
import { getAuthWithUserLocations } from '@/lib/auth-api'
import { connectDB, Category } from '@/lib/db'
import { dashboardCache } from '@/lib/utils/dashboard-cache'
import { 
  getUserPermissionContext, 
  canViewLocation,
  canViewRole 
} from '@/lib/utils/dashboard-permissions'
import { validateLocationRolePairing } from '@/lib/utils/dashboard-validation'
import { 
  getActiveRoleAssignments,
  aggregateShiftData 
} from '@/lib/utils/dashboard-queries'
import mongoose from 'mongoose'

const { ObjectId } = mongoose.Types

export async function GET(
  request: Request,
  { params }: { params: { locationId: string; roleId: string } }
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

    // 2. Validate ObjectId formats
    const { locationId, roleId } = params
    if (!ObjectId.isValid(locationId)) {
      return NextResponse.json(
        { 
          error: 'Invalid location ID format',
          code: 'INVALID_OBJECT_ID'
        },
        { status: 400 }
      )
    }
    if (!ObjectId.isValid(roleId)) {
      return NextResponse.json(
        { 
          error: 'Invalid role ID format',
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
      `/api/dashboard/location/${locationId}/role/${roleId}/stats`,
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
    if (!permCtx || !canViewLocation(permCtx, locationId) || !canViewRole(permCtx, roleId)) {
      console.warn('[SECURITY] Unauthorized access attempt', {
        userId: ctx.auth.sub,
        resource: 'location-role',
        locationId,
        roleId,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json(
        { 
          error: 'Forbidden: You do not have permission to view this location or role',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      )
    }

    // 6. Verify location and role exist
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

    const role = await Category.findById(roleId)
      .select('name type color')
      .lean()
    
    if (!role || role.type !== 'role') {
      return NextResponse.json(
        { 
          error: 'Role not found',
          code: 'RESOURCE_NOT_FOUND',
          details: { resourceType: 'role', resourceId: roleId }
        },
        { status: 404 }
      )
    }

    // 7. Validate location-role pairing
    const pairingValid = await validateLocationRolePairing(
      locationId,
      roleId,
      effectiveDate
    )

    if (!pairingValid) {
      return NextResponse.json(
        {
          error: 'Location-role pairing is not enabled',
          code: 'INVALID_PAIRING',
          details: {
            locationId,
            roleId
          }
        },
        { status: 400 }
      )
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

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'MISS'
      }
    })

  } catch (err) {
    console.error('[api/dashboard/location/role/stats GET]', err)
    return NextResponse.json(
      { 
        error: 'Failed to load dashboard statistics',
        code: 'DATABASE_ERROR'
      },
      { status: 500 }
    )
  }
}
