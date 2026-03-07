"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, XCircle, Edit3 } from "lucide-react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useDeleteEmployeeRole } from "@/lib/queries/employees"

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
}

interface RoleAssignmentCardProps {
  assignment: RoleAssignment
  employeeId: string
  onEnd?: (assignmentId: string) => void
  onUpdate?: () => void
}

export function RoleAssignmentCard({
  assignment,
  employeeId,
  onEnd,
  onUpdate,
}: RoleAssignmentCardProps) {
  const [editNotesOpen, setEditNotesOpen] = useState(false)
  const [notes, setNotes] = useState(assignment.notes || "")

  // TanStack Query hook
  const updateRoleMutation = useDeleteEmployeeRole()

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Present"
    try {
      return format(new Date(dateStr), "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }

  const handleSaveNotes = () => {
    updateRoleMutation.mutate(
      {
        employeeId,
        assignmentId: assignment.id,
      },
      {
        onSuccess: () => {
          toast.success("Notes updated successfully")
          setEditNotesOpen(false)
          onUpdate?.()
        },
        onError: (err: any) => {
          console.error("Failed to update notes:", err)
          toast.error(err.message || "Failed to update notes")
        },
      }
    )
  }

  return (
    <>
      <Card
        className={`transition-all ${
          assignment.isActive
            ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
            : "bg-muted/20 border-muted opacity-75 hover:bg-muted/30"
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Role Color Indicator */}
              {assignment.roleColor && (
                <div
                  className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                    assignment.isActive ? "" : "opacity-50"
                  }`}
                  style={{ backgroundColor: assignment.roleColor }}
                />
              )}

              <div className="flex-1 min-w-0">
                {/* Role Name and Status Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <h4
                    className={`font-medium ${
                      assignment.isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {assignment.roleName}
                  </h4>
                  <Badge
                    variant={assignment.isActive ? "default" : "outline"}
                    className="text-xs"
                  >
                    {assignment.isActive ? "Active" : "Expired"}
                  </Badge>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{assignment.locationName}</span>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>
                    {formatDate(assignment.validFrom)} →{" "}
                    {formatDate(assignment.validTo)}
                  </span>
                </div>

                {/* Notes */}
                {assignment.notes && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {assignment.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              {assignment.isActive && onEnd && (
                <Button
                  onClick={() => onEnd(assignment.id)}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  End
                </Button>
              )}
              <Button
                onClick={() => {
                  setNotes(assignment.notes || "")
                  setEditNotesOpen(true)
                }}
                variant="ghost"
                size="sm"
                className="h-8 px-2"
              >
                <Edit3 className="h-4 w-4 mr-1.5" />
                Notes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Notes Dialog */}
      <Dialog open={editNotesOpen} onOpenChange={setEditNotesOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Assignment Notes</DialogTitle>
            <DialogDescription>
              Update notes for {assignment.roleName} at {assignment.locationName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this assignment (e.g., training completed, certifications)"
                className="resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {notes.length} / 500 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditNotesOpen(false)}
              disabled={updateRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
