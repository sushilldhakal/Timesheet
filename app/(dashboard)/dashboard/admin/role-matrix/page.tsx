"use client"

import { useEffect, useState } from "react"
import { LocationRoleMatrix } from "@/components/locations/LocationRoleMatrix"
import type { ICategory, ILocationRoleEnablement } from "@/components/locations/LocationRoleMatrix"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function RoleMatrixPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<ICategory[]>([])
  const [roles, setRoles] = useState<ICategory[]>([])
  const [enablements, setEnablements] = useState<ILocationRoleEnablement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all data
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch locations
      const locationsRes = await fetch("/api/categories?type=location")
      if (!locationsRes.ok) throw new Error("Failed to fetch locations")
      const locationsData = await locationsRes.json()

      // Fetch roles
      const rolesRes = await fetch("/api/categories?type=role")
      if (!rolesRes.ok) throw new Error("Failed to fetch roles")
      const rolesData = await rolesRes.json()

      // Fetch all enablements
      const enablementsPromises = (locationsData.categories || []).map(
        async (location: ICategory) => {
          const res = await fetch(`/api/locations/${location._id || location.id}/roles`)
          if (res.ok) {
            const data = await res.json()
            return (data.roles || []).map((role: any) => ({
              _id: `${location._id || location.id}-${role.roleId}`,
              locationId: location._id || location.id,
              roleId: role.roleId,
              effectiveFrom: role.effectiveFrom,
              effectiveTo: role.effectiveTo,
              isActive: role.isActive,
              employeeCount: role.employeeCount,
            }))
          }
          return []
        }
      )

      const enablementsArrays = await Promise.all(enablementsPromises)
      const allEnablements = enablementsArrays.flat()

      setLocations(locationsData.categories || [])
      setRoles(rolesData.categories || [])
      setEnablements(allEnablements)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handle toggle role at location
  const handleToggle = async (locationId: string, roleId: string) => {
    // Check if currently enabled
    const isEnabled = enablements.some(
      (e) => e.locationId === locationId && e.roleId === roleId && e.isActive
    )

    try {
      if (isEnabled) {
        // Disable role
        const res = await fetch(`/api/locations/${locationId}/roles/${roleId}`, {
          method: "DELETE",
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to disable role")
        }
      } else {
        // Enable role
        const res = await fetch(`/api/locations/${locationId}/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleId,
            effectiveFrom: new Date().toISOString(),
            effectiveTo: null,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to enable role")
        }
      }

      // Refresh data
      await fetchData()
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
        fetch(`/api/locations/${locationId}/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleId,
            effectiveFrom: new Date().toISOString(),
            effectiveTo: null,
          }),
        })
      )

      const results = await Promise.all(promises)
      const failed = results.filter((r) => !r.ok)

      if (failed.length > 0) {
        throw new Error(`Failed to enable role at ${failed.length} location(s)`)
      }

      // Refresh data
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
      throw err
    }
  }

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
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading matrix...</div>
      ) : error ? (
        <div className="py-8 text-center text-destructive">{error}</div>
      ) : (
        <LocationRoleMatrix
          locations={locations}
          roles={roles}
          enablements={enablements}
          onToggle={handleToggle}
          onBulkEnable={handleBulkEnable}
        />
      )}
    </div>
  )
}
