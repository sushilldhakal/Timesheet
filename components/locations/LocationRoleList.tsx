"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Users, Calendar } from "lucide-react"
import { format } from "date-fns"

export type RoleEnablement = {
  roleId: string
  roleName: string
  roleColor?: string
  isEnabled: boolean
  effectiveFrom?: string
  effectiveTo?: string | null
  employeeCount: number
}

type LocationRoleListProps = {
  locationId: string
  roles: RoleEnablement[]
  onToggle: (roleId: string) => Promise<void>
  onEdit?: (roleId: string) => void
  loading?: boolean
}

export function LocationRoleList({ locationId, roles, onToggle, onEdit, loading = false }: LocationRoleListProps) {
  const [toggling, setToggling] = useState<string | null>(null)

  const handleToggle = async (roleId: string, currentlyEnabled: boolean) => {
    setToggling(roleId)
    try {
      await onToggle(roleId)
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading roles...
      </div>
    )
  }

  if (roles.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No roles available. Create roles in the Category page first.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {roles.map((role) => (
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
  )
}
