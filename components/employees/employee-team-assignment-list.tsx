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
import { FormDialogShell } from '@/components/shared/forms/FormDialogShell'
import { ConfirmDialogShell } from '@/components/shared/forms/ConfirmDialogShell'
import { useEmployeeTeams, useDeleteEmployeeTeam } from "@/lib/queries/employees"

interface TeamAssignment {
  id: string
  teamId: string
  teamName: string
  teamColor?: string
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
  active: TeamAssignment[]
  historical: TeamAssignment[]
}

interface EmployeeTeamAssignmentListProps {
  employeeId: string
  onAdd?: () => void
  readOnly?: boolean
}

export default function EmployeeTeamAssignmentList({
  employeeId,
  onAdd,
  readOnly = false,
}: EmployeeTeamAssignmentListProps) {
  const [assignmentToEnd, setAssignmentToEnd] = useState<TeamAssignment | null>(null)
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  // TanStack Query hooks
  const { data: teamsData, isLoading: loading, error } = useEmployeeTeams(employeeId, { includeInactive: true })
  const deleteTeamMutation = useDeleteEmployeeTeam()

  const assignments = teamsData?.data?.assignments || []

  if (error) {
    toast.error("Failed to load team assignments")
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

    deleteTeamMutation.mutate(
      {
        employeeId,
        assignmentId: assignmentToEnd.id,
      },
      {
        onSuccess: () => {
          toast.success("Team assignment ended successfully")
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
                              {/* Team Color Indicator */}
                              {assignment.teamColor && (
                                <div
                                  className="w-3 h-3 rounded-full mt-1 shrink-0"
                                  style={{ backgroundColor: assignment.teamColor }}
                                />
                              )}

                              <div className="flex-1 min-w-0">
                                {/* Team Name */}
                                <div className="flex items-center gap-2 mb-1">
                                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium">
                                    {assignment.teamName}
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
                                disabled={deleteTeamMutation.isPending}
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
        <ConfirmDialogShell
          open={!!assignmentToEnd}
          onOpenChange={(open) => !open && setAssignmentToEnd(null)}
          title="End Team Assignment?"
          description={
            <span>
              This will end the assignment of{" "}
              <strong>{assignmentToEnd?.teamName}</strong> at{" "}
              <strong>{assignmentToEnd?.locationName}</strong>. The assignment
              will be marked as historical and the employee will no longer be
              able to work this team at this location.
            </span>
          }
          onConfirm={handleEndAssignment}
          confirmLabel={deleteTeamMutation.isPending ? "Ending..." : "End Assignment"}
          loading={deleteTeamMutation.isPending}
          variant="destructive"
        />
      ) : null}

      {/* History Dialog */}
      <FormDialogShell
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        title="Team Assignment History"
        description="Complete history of expired and ended team assignments"
        size="xl"
      >
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
                        {assignment.teamColor && (
                          <div
                            className="w-3 h-3 rounded-full mt-1 shrink-0 opacity-50"
                            style={{ backgroundColor: assignment.teamColor }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-muted-foreground">
                              {assignment.teamName}
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
      </FormDialogShell>
    </>
  )
}
