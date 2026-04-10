"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Calendar } from "lucide-react"
import { format } from "date-fns"
import { useLocation, useLocationRoles, useEnableLocationRole, useDisableLocationRole } from "@/lib/queries/locations"
import { useRoles } from "@/lib/queries/roles"

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

function LocationRolesPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params?.id as string

  const [toggling, setToggling] = useState<string | null>(null)

  const locationQuery = useLocation(locationId)
  const allRolesQuery = useRoles()
  const locationRolesQuery = useLocationRoles(locationId)
  const enableLocationRoleMutation = useEnableLocationRole()
  const disableLocationRoleMutation = useDisableLocationRole()

  const location = locationQuery.data?.location
  const allRoles = allRolesQuery.data?.roles || []
  const roles = locationRolesQuery.data?.data?.roles || []
  const loading = locationQuery.isLoading || allRolesQuery.isLoading || locationRolesQuery.isLoading
  const error = (locationQuery.error as Error | null)?.message || (allRolesQuery.error as Error | null)?.message || (locationRolesQuery.error as Error | null)?.message

  // Handle role toggle (enable/disable)
  const handleToggle = async (roleId: string, currentlyEnabled: boolean) => {
    console.log(`Toggle clicked for role ${roleId}, currentlyEnabled: ${currentlyEnabled}`)
    setToggling(roleId)
    try {
      if (currentlyEnabled) {
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
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
      employeeCount: (enablement as any)?.employeeCount || 0,
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


export default LocationRolesPage
