"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Calendar } from "lucide-react"
import { format } from "date-fns"

type RoleData = {
  roleId: string
  roleName: string
  roleColor?: string
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  employeeCount: number
}

type LocationData = {
  id: string
  name: string
  type: string
}

export default function LocationRolesPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params.id as string

  const [location, setLocation] = useState<LocationData | null>(null)
  const [roles, setRoles] = useState<RoleData[]>([])
  const [allRoles, setAllRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  // Fetch location details
  const fetchLocation = async () => {
    try {
      const res = await fetch(`/api/categories/${locationId}`)
      if (res.ok) {
        const data = await res.json()
        setLocation(data.category)
      } else {
        setError("Failed to load location")
      }
    } catch (err) {
      setError("Failed to load location")
    }
  }

  // Fetch all roles (for enabling new ones)
  const fetchAllRoles = async () => {
    try {
      const res = await fetch("/api/categories?type=role")
      if (res.ok) {
        const data = await res.json()
        setAllRoles(data.categories || [])
      }
    } catch (err) {
      console.error("Failed to fetch all roles:", err)
    }
  }

  // Fetch enabled roles for this location
  const fetchRoles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/locations/${locationId}/roles`)
      if (res.ok) {
        const response = await res.json()
        console.log('Fetched roles:', response.data?.roles)
        setRoles(response.data?.roles || [])
      } else {
        setError("Failed to load roles")
      }
    } catch (err) {
      setError("Failed to load roles")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (locationId) {
      fetchLocation()
      fetchAllRoles()
      fetchRoles()
    }
  }, [locationId])

  // Handle role toggle (enable/disable)
  const handleToggle = async (roleId: string, currentlyEnabled: boolean) => {
    console.log(`Toggle clicked for role ${roleId}, currentlyEnabled: ${currentlyEnabled}`)
    setToggling(roleId)
    try {
      if (currentlyEnabled) {
        // Disable role
        const res = await fetch(`/api/locations/${locationId}/roles/${roleId}`, {
          method: "DELETE",
        })
        if (!res.ok) {
          const data = await res.json()
          alert(data.error || "Failed to disable role")
          return
        }
        // Wait for the response to be fully processed
        await res.json()
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
          alert(data.error || "Failed to enable role")
          return
        }
        // Wait for the response to be fully processed
        await res.json()
      }
      // Refresh the list
      await fetchRoles()
    } catch (err) {
      alert("An error occurred")
    } finally {
      setToggling(null)
    }
  }

  // Create a map of enabled roles for quick lookup
  const enabledRolesMap = new Map(roles.map((r) => [r.roleId, r]))

  // Merge all roles with their enablement status
  const mergedRoles = allRoles.map((role) => {
    const enablement = enabledRolesMap.get(role.id)
    return {
      roleId: role.id,
      roleName: role.name,
      roleColor: role.color,
      isEnabled: !!enablement,
      effectiveFrom: enablement?.effectiveFrom,
      effectiveTo: enablement?.effectiveTo,
      employeeCount: enablement?.employeeCount || 0,
    }
  })

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
          <h1 className="text-2xl font-bold">
            {location?.name || "Location"} - Role Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Enable or disable roles for this location
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Available Roles</CardTitle>
          <CardDescription>
            Toggle roles on or off for this location. Only enabled roles will appear in scheduling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading roles...</div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : mergedRoles.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No roles available. Create roles in the Category page first.
            </div>
          ) : (
            <div className="space-y-2">
              {mergedRoles.map((role) => (
                <div
                  key={role.roleId}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Role Color Indicator */}
                    {role.roleColor && (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: role.roleColor }}
                      />
                    )}

                    {/* Role Name */}
                    <div className="flex-1">
                      <div className="font-medium">{role.roleName}</div>
                      {role.isEnabled && role.effectiveFrom && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Enabled: {format(new Date(role.effectiveFrom), "MMM d, yyyy")}
                            {role.effectiveTo && (
                              <> - {format(new Date(role.effectiveTo), "MMM d, yyyy")}</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Employee Count */}
                    {role.isEnabled && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {role.employeeCount} {role.employeeCount === 1 ? "employee" : "employees"}
                      </Badge>
                    )}

                    {/* Status Badge */}
                    <Badge variant={role.isEnabled ? "default" : "outline"}>
                      {role.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  {/* Toggle Switch */}
                  <Switch
                    checked={role.isEnabled}
                    onCheckedChange={() => handleToggle(role.roleId, role.isEnabled)}
                    disabled={toggling === role.roleId}
                    className="ml-4"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
