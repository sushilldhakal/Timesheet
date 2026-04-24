"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, Check, X } from "lucide-react"
import { cn } from "@/lib/utils/cn"

export interface ILocationRoleMatrixItem {
  _id: string
  id?: string
  name: string
  color?: string
}

export interface ILocationRoleEnablement {
  _id: string
  id?: string
  locationId: string
  roleId: string
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  employeeCount?: number
}

interface LocationRoleMatrixProps {
  locations: ILocationRoleMatrixItem[]
  roles: ILocationRoleMatrixItem[]
  enablements: ILocationRoleEnablement[]
  onToggle: (locationId: string, roleId: string) => Promise<void>
  onBulkEnable: (roleId: string, locationIds: string[]) => Promise<void>
}

export function LocationRoleMatrix({
  locations,
  roles,
  enablements,
  onToggle,
  onBulkEnable,
}: LocationRoleMatrixProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)

  // Create a map for quick lookup of enablements
  const enablementMap = useMemo(() => {
    const map = new Map<string, ILocationRoleEnablement>()
    enablements.forEach((e) => {
      const key = `${e.locationId}-${e.roleId}`
      map.set(key, e)
    })
    return map
  }, [enablements])

  // Check if a role is enabled at a location
  const isEnabled = (locationId: string, roleId: string): boolean => {
    const key = `${locationId}-${roleId}`
    const enablement = enablementMap.get(key)
    return enablement?.isActive ?? false
  }

  // Get employee count for a role at a location
  const getEmployeeCount = (locationId: string, roleId: string): number => {
    const key = `${locationId}-${roleId}`
    const enablement = enablementMap.get(key)
    return enablement?.employeeCount ?? 0
  }

  // Handle cell click to toggle enablement
  const handleCellClick = async (locationId: string, roleId: string) => {
    const key = `${locationId}-${roleId}`
    setLoading(key)
    try {
      await onToggle(locationId, roleId)
    } finally {
      setLoading(null)
    }
  }

  // Handle location selection for bulk operations
  const toggleLocationSelection = (locationId: string) => {
    const newSelection = new Set(selectedLocations)
    if (newSelection.has(locationId)) {
      newSelection.delete(locationId)
    } else {
      newSelection.add(locationId)
    }
    setSelectedLocations(newSelection)
  }

  // Handle bulk enable operation
  const handleBulkEnable = async () => {
    if (!selectedRole || selectedLocations.size === 0) return

    setLoading("bulk")
    try {
      await onBulkEnable(selectedRole, Array.from(selectedLocations))
      setSelectedLocations(new Set())
      setSelectedRole(null)
    } finally {
      setLoading(null)
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    // Create CSV header
    const header = ["Location", ...roles.map((r) => r.name)].join(",")

    // Create CSV rows
    const rows = locations.map((location) => {
      const row = [
        location.name,
        ...roles.map((role) => {
          const enabled = isEnabled(location._id || location.id!, role._id || role.id!)
          const count = getEmployeeCount(location._id || location.id!, role._id || role.id!)
          return enabled ? `Enabled (${count})` : "Disabled"
        }),
      ]
      return row.join(",")
    })

    // Combine header and rows
    const csv = [header, ...rows].join("\n")

    // Create and download file
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `LocationRoleMatrix-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Location–team matrix</CardTitle>
            <CardDescription>
              View and manage role enablement across all locations. Click cells to toggle.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={locations.length === 0 || roles.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Bulk Operations Section */}
        {selectedLocations.size > 0 && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedLocations.size} location{selectedLocations.size !== 1 ? "s" : ""} selected
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Enable role:</span>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedRole || ""}
                    onChange={(e) => setSelectedRole(e.target.value || null)}
                  >
                    <option value="">Select a role...</option>
                    {roles.map((role) => (
                      <option key={role._id || role.id} value={role._id || role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkEnable}
                  disabled={!selectedRole || loading === "bulk"}
                >
                  {loading === "bulk" ? "Enabling..." : "Enable"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedLocations(new Set())
                    setSelectedRole(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Matrix Table */}
        {locations.length === 0 || roles.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {locations.length === 0
              ? "No locations available. Create locations first."
              : "No teams available. Create teams first."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-background border-b border-r p-2 text-left font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Location</span>
                    </div>
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role._id || role.id}
                      className="border-b p-2 text-center font-medium min-w-[100px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        {role.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: role.color }}
                          />
                        )}
                        <span className="text-xs">{role.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => {
                  const locationId = location._id || location.id!
                  return (
                    <tr key={locationId} className="hover:bg-muted/50">
                      <td className="sticky left-0 z-10 bg-background border-b border-r p-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedLocations.has(locationId)}
                            onCheckedChange={() => toggleLocationSelection(locationId)}
                          />
                          <span className="text-sm font-medium">{location.name}</span>
                        </div>
                      </td>
                      {roles.map((role) => {
                        const roleId = role._id || role.id!
                        const enabled = isEnabled(locationId, roleId)
                        const employeeCount = getEmployeeCount(locationId, roleId)
                        const cellKey = `${locationId}-${roleId}`
                        const isLoading = loading === cellKey

                        return (
                          <td
                            key={roleId}
                            className="border-b p-1 text-center"
                          >
                            <button
                              onClick={() => handleCellClick(locationId, roleId)}
                              disabled={isLoading}
                              className={cn(
                                "w-full h-12 rounded-md border-2 transition-all flex flex-col items-center justify-center gap-0.5",
                                enabled
                                  ? "bg-primary/10 border-primary hover:bg-primary/20"
                                  : "bg-muted border-border hover:bg-muted/80",
                                isLoading && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {isLoading ? (
                                <span className="text-xs text-muted-foreground">...</span>
                              ) : enabled ? (
                                <>
                                  <Check className="h-4 w-4 text-primary" />
                                  {employeeCount > 0 && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                      {employeeCount}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md border-2 border-primary bg-primary/10 flex items-center justify-center">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <span>Enabled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md border-2 border-border bg-muted flex items-center justify-center">
              <X className="h-4 w-4 text-muted-foreground" />
            </div>
            <span>Disabled</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              5
            </Badge>
            <span>Number of employees assigned</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
