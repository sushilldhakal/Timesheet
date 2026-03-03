"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  MapPin, 
  Calendar, 
  Plus, 
  XCircle, 
  Briefcase,
  ChevronDown,
  ChevronRight 
} from "lucide-react"
import { toast } from "sonner"
import { formatDateLong } from "@/lib/utils/date-format"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface RoleAssignment {
  id: string
  roleId: string
  roleName: string
  roleColor?: string
  locationId: string
  locationName: string
  validFrom: string
  validTo: string | null
  isActive: boolean
  notes?: string
  assignedAt: string
}

interface GroupedAssignments {
  locationId: string
  locationName: string
  active: RoleAssignment[]
  historical: RoleAssignment[]
}

interface EmployeeRoleAssignmentListProps {
  employeeId: string
  onAdd?: () => void
}

export default function EmployeeRoleAssignmentList({
  employeeId,
  onAdd,
}: EmployeeRoleAssignmentListProps) {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [endingAssignment, setEndingAssignment] = useState<string | null>(null)
  const [assignmentToEnd, setAssignmentToEnd] = useState<RoleAssignment | null>(null)
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())

  // Fetch assignments
  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/employees/${employeeId}/roles?includeInactive=true`
      )
      
      if (!res.ok) {
        throw new Error("Failed to fetch role assignments")
      }

      const data = await res.json()
      setAssignments(data.data?.assignments || [])
    } catch (err) {
      console.error("Failed to fetch role assignments:", err)
      toast.error("Failed to load role assignments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignments()
  }, [employeeId])

  // Group assignments by location
  const groupedAssignments: GroupedAssignments[] = assignments.reduce(
    (acc, assignment) => {
      const existing = acc.find((g) => g.locationId === assignment.locationId)
      
      if (existing) {
        if (assignment.isActive) {
          existing.active.push(assignment)
        } else {
          existing.historical.push(assignment)
        }
      } else {
        acc.push({
          locationId: assignment.locationId,
          locationName: assignment.locationName,
          active: assignment.isActive ? [assignment] : [],
          historical: assignment.isActive ? [] : [assignment],
        })
      }
      
      return acc
    },
    [] as GroupedAssignments[]
  )

  // Sort: locations with active assignments first
  groupedAssignments.sort((a, b) => {
    if (a.active.length > 0 && b.active.length === 0) return -1
    if (a.active.length === 0 && b.active.length > 0) return 1
    return a.locationName.localeCompare(b.locationName)
  })

  const handleEndAssignment = async () => {
    if (!assignmentToEnd) return

    setEndingAssignment(assignmentToEnd.id)
    try {
      const res = await fetch(
        `/api/employees/${employeeId}/roles/${assignmentToEnd.id}`,
        {
          method: "DELETE",
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || "Failed to end assignment")
      }

      toast.success("Role assignment ended successfully")
      fetchAssignments()
    } catch (err: any) {
      console.error("Failed to end assignment:", err)
      toast.error(err.message || "Failed to end assignment")
    } finally {
      setEndingAssignment(null)
      setAssignmentToEnd(null)
    }
  }

  const toggleLocation = (locationId: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev)
      if (next.has(locationId)) {
        next.delete(locationId)
      } else {
        next.add(locationId)
      }
      return next
    })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Present"
    return formatDateLong(dateStr) || dateStr
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Role Assignments
          </CardTitle>
          <CardDescription>
            Loading role assignments...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Role Assignments
            </CardTitle>
            <CardDescription>
              Employee roles at different locations
            </CardDescription>
          </div>
          {onAdd && (
            <Button onClick={onAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {groupedAssignments.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No role assignments yet
              </p>
              {onAdd && (
                <Button onClick={onAdd} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Assignment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedAssignments.map((group) => (
                <div
                  key={group.locationId}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Location Header */}
                  <button
                    onClick={() => toggleLocation(group.locationId)}
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedLocations.has(group.locationId) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{group.locationName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.active.length > 0 && (
                        <Badge variant="default">
                          {group.active.length} active
                        </Badge>
                      )}
                      {group.historical.length > 0 && (
                        <Badge variant="outline">
                          {group.historical.length} historical
                        </Badge>
                      )}
                    </div>
                  </button>

                  {/* Assignments List */}
                  {expandedLocations.has(group.locationId) && (
                    <div className="divide-y">
                      {/* Active Assignments */}
                      {group.active.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="p-4 bg-primary/5 hover:bg-primary/10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              {/* Role Color Indicator */}
                              {assignment.roleColor && (
                                <div
                                  className="w-3 h-3 rounded-full mt-1 shrink-0"
                                  style={{ backgroundColor: assignment.roleColor }}
                                />
                              )}

                              <div className="flex-1 min-w-0">
                                {/* Role Name */}
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">
                                    {assignment.roleName}
                                  </span>
                                  <Badge
                                    variant="default"
                                    className="text-xs"
                                  >
                                    Active
                                  </Badge>
                                </div>

                                {/* Date Range */}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {formatDate(assignment.validFrom)} →{" "}
                                    {formatDate(assignment.validTo)}
                                  </span>
                                </div>

                                {/* Notes */}
                                {assignment.notes && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {assignment.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* End Assignment Button */}
                            <Button
                              onClick={() => setAssignmentToEnd(assignment)}
                              variant="ghost"
                              size="sm"
                              disabled={endingAssignment === assignment.id}
                              className="shrink-0"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              End
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Historical Assignments */}
                      {group.historical.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="p-4 bg-muted/20 hover:bg-muted/30 transition-colors opacity-75"
                        >
                          <div className="flex items-start gap-3">
                            {/* Role Color Indicator */}
                            {assignment.roleColor && (
                              <div
                                className="w-3 h-3 rounded-full mt-1 shrink-0 opacity-50"
                                style={{ backgroundColor: assignment.roleColor }}
                              />
                            )}

                            <div className="flex-1 min-w-0">
                              {/* Role Name */}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-muted-foreground">
                                  {assignment.roleName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  Expired
                                </Badge>
                              </div>

                              {/* Date Range */}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {formatDate(assignment.validFrom)} →{" "}
                                  {formatDate(assignment.validTo)}
                                </span>
                              </div>

                              {/* Notes */}
                              {assignment.notes && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {assignment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* End Assignment Confirmation Dialog */}
      <AlertDialog
        open={!!assignmentToEnd}
        onOpenChange={(open) => !open && setAssignmentToEnd(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Role Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the assignment of{" "}
              <strong>{assignmentToEnd?.roleName}</strong> at{" "}
              <strong>{assignmentToEnd?.locationName}</strong>. The assignment
              will be marked as historical and the employee will no longer be
              able to work this role at this location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!endingAssignment}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndAssignment}
              disabled={!!endingAssignment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {endingAssignment ? "Ending..." : "End Assignment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
