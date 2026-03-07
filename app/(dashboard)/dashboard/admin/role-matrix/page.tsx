"use client"

import { useEffect, useState } from "react"
import { LocationRoleMatrix } from "@/components/locations/LocationRoleMatrix"
import type { ILocationRoleEnablement } from "@/components/locations/LocationRoleMatrix"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCategoriesByType } from "@/lib/queries/categories"
import { useEnableLocationRole, useDisableLocationRole } from "@/lib/queries/locations"
import { getLocationRoles } from "@/lib/api/locations"

function RoleMatrixPage() {
  const router = useRouter()
  const [enablements, setEnablements] = useState<ILocationRoleEnablement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const locationsQuery = useCategoriesByType("location")
  const rolesQuery = useCategoriesByType("role")
  const enableLocationRoleMutation = useEnableLocationRole()
  const disableLocationRoleMutation = useDisableLocationRole()

  const locations = locationsQuery.data?.categories || []
  const roles = rolesQuery.data?.categories || []

  // Fetch all enablements
  const fetchEnablements = async () => {
    if (!locations.length) return

    setLoading(true)
    setError(null)
    try {
      const enablementsPromises = locations.map(async (location: any) => {
        try {
          const locationId = (location as any)._id || location.id
          
          // Use the API function directly
          const apiData = await getLocationRoles(locationId)
          return (apiData.data?.roles || []).map((role: any) => ({
            _id: `${locationId}-${role.roleId}`,
            locationId: locationId,
            roleId: role.roleId,
            effectiveFrom: role.effectiveFrom,
            effectiveTo: role.effectiveTo,
            isActive: role.isActive,
            employeeCount: role.employeeCount,
          }))
        } catch {
          return []
        }
      })

      const enablementsArrays = await Promise.all(enablementsPromises)
      const allEnablements = enablementsArrays.flat()
      setEnablements(allEnablements)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load enablements")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (locations.length > 0) {
      fetchEnablements()
    }
  }, [locations])

  // Handle toggle role at location
  const handleToggle = async (locationId: string, roleId: string) => {
    // Check if currently enabled
    const isEnabled = enablements.some(
      (e) => e.locationId === locationId && e.roleId === roleId && e.isActive
    )

    try {
      if (isEnabled) {
        await disableLocationRoleMutation.mutateAsync({ locationId, roleId })
      } else {
        await enableLocationRoleMutation.mutateAsync({
          locationId,
          data: {
            roleId,
            effectiveFrom: new Date().toISOString(),
            effectiveTo: null,
          }
        })
      }

      // Refresh enablements
      await fetchEnablements()
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
      throw err
    }
  }

  // Handle bulk enable
  const handleBulkEnable = async (roleId: string, locationIds: string[]) => {
    try {
      // Enable role at each location
      const promises = locationIds.map((locationId) =>
        enableLocationRoleMutation.mutateAsync({
          locationId,
          data: {
            roleId,
            effectiveFrom: new Date().toISOString(),
            effectiveTo: null,
          }
        })
      )

      await Promise.all(promises)

      // Refresh enablements
      await fetchEnablements()
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
      throw err
    }
  }

  const isLoading = locationsQuery.isLoading || rolesQuery.isLoading || loading

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/category")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Role-Location Matrix</h1>
          <p className="text-sm text-muted-foreground">
            Manage role enablement across all locations
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading matrix...</div>
      ) : error ? (
        <div className="py-8 text-center text-destructive">{error}</div>
      ) : (
        <LocationRoleMatrix
          locations={locations as any}
          roles={roles as any}
          enablements={enablements}
          onToggle={handleToggle}
          onBulkEnable={handleBulkEnable}
        />
      )}
    </div>
  )
}


export default RoleMatrixPage
