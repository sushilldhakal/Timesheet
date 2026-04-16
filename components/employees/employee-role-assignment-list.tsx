"use client"

import { useState } from "react"
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
  ChevronRight,
  History
} from "lucide-react"
import { toast } from "sonner"
import { formatDateLong } from "@/lib/utils/format/date-format"
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
import { useEmployeeRoles, useDeleteEmployeeRole } from "@/lib/queries/employees"

interface RoleAssignment {
  id: string
  roleId: string
  roleName: string
  roleColor?: string
  locationId: string
  locationName: string
  locationColor?: string
  validFrom: string
  validTo: string | null
  isActive: boolean
  notes?: string
  assignedAt: string
}

interface GroupedAssignments {
  locationId: string
  locationName: string
  locationColor?: string
  active: RoleAssignment[]
  historical: RoleAssignment[]
}

interface EmployeeRoleAssignmentListProps {
  employeeId: string
  onAdd?: () => void
  readOnly?: boolean
}

export default function EmployeeRoleAssignmentList({
  employeeId,
  onAdd,
  readOnly = false,
}: EmployeeRoleAssignmentListProps) {
  const [assignmentToEnd, setAssignmentToEnd] = useState<RoleAssignment | null>(null)
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  // TanStack Query hooks
  const { data: rolesData, isLoading: loading, error } = useEmployeeRoles(employeeId, { includeInactive: true })
  const deleteRoleMutation = useDeleteEmployeeRole()

  const assignments = rolesData?.data?.assignments || []

  if (error) {
    toast.error("Failed to load role assignments")
  }

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
          locationColor: assignment.locationColor,
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

  // Count total historical assignments
  const totalHistorical = groupedAssignments.reduce((sum, group) => sum + group.historical.length, 0)

  const handleEndAssignment = async () => {
    if (!assignmentToEnd) return

    deleteRoleMutation.mutate(
      {
        employeeId,
        assignmentId: assignmentToEnd.id,
      },
      {
        onSuccess: () => {
          toast.success("Role assignment ended successfully")
          setAssignmentToEnd(null)
        },
        onError: (err: any) => {
          console.error("Failed to end assignment:", err)
          toast.error(err.message || "Failed to end assignment")
        },
      }
    )
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
            Team Assignments
          </CardTitle>
          <CardDescription>
            Loading team assignments...
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
              Team Assignments
            </CardTitle>
            <CardDescription>
              Employee teams at different locations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {totalHistorical > 0 && (
              <Button onClick={() => setShowHistoryDialog(true)} size="sm" variant="ghost">
                <History className="h-4 w-4 mr-2" />
                View History ({totalHistorical})
              </Button>
            )}
            {!readOnly && onAdd && (
              <Button onClick={onAdd} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {groupedAssignments.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No team assignments yet
              </p>
              {!readOnly && onAdd && (
                <Button onClick={onAdd} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Assignment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedAssignments
                .filter(group => group.active.length > 0)
                .map((group) => (
                <div
                  key={group.locationId}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Location Header - Non-clickable */}
                  <div className="w-full flex items-center justify-between p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      {group.locationColor && (
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: group.locationColor }}
                        />
                      )}
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{group.locationName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        {group.active.length} active
                      </Badge>
                    </div>
                  </div>

                  {/* Assignments List - Always visible */}
                  {group.active.length > 0 && (
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
                                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
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
                            {!readOnly ? (
                              <Button
                                onClick={() => setAssignmentToEnd(assignment)}
                                variant="ghost"
                                size="sm"
                                disabled={deleteRoleMutation.isPending}
                                className="shrink-0"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                End
                              </Button>
                            ) : null}
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
      {!readOnly ? (
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
              <AlertDialogCancel disabled={deleteRoleMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEndAssignment}
                disabled={deleteRoleMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteRoleMutation.isPending ? "Ending..." : "End Assignment"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {/* History Dialog */}
      <AlertDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <AlertDialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Role Assignment History
            </AlertDialogTitle>
            <AlertDialogDescription>
              Complete history of expired and ended role assignments
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            {groupedAssignments.map((group) => 
              group.historical.length > 0 && (
                <div key={group.locationId} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/30 p-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{group.locationName}</span>
                    <Badge variant="outline" className="ml-auto">
                      {group.historical.length} expired
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {group.historical.map((assignment) => (
                      <div key={assignment.id} className="p-4 bg-muted/10">
                        <div className="flex items-start gap-3">
                          {assignment.roleColor && (
                            <div
                              className="w-3 h-3 rounded-full mt-1 shrink-0 opacity-50"
                              style={{ backgroundColor: assignment.roleColor }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-muted-foreground">
                                {assignment.roleName}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                Expired
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {formatDate(assignment.validFrom)} → {formatDate(assignment.validTo)}
                              </span>
                            </div>
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
                </div>
              )
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowHistoryDialog(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
