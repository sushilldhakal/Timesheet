"use client"

import { formatTime, calculateShiftDuration } from "@/lib/roster-validation"
import { Button } from "@/components/ui/button"
import { X, AlertCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShiftCellProps {
  shift: any
  validation?: any
  onUpdate: (shiftId: string, updates: any) => void
  onRemove: (shiftId: string) => void
  employeeHours?: number
  roster: any
}

export function ShiftCell({
  shift,
  validation,
  onUpdate,
  onRemove,
  employeeHours = 0,
  roster,
}: ShiftCellProps) {
  const hasErrors = validation?.errors.some((e: any) => e.type === "error") || false
  const hasWarnings = validation?.errors.some((e: any) => e.type === "warning") || false
  const duration = calculateShiftDuration(shift.startTime, shift.endTime)

  if (!shift.employeeId) {
    return (
      <div className="p-2 border-2 border-dashed border-gray-300 rounded text-center text-xs text-gray-500">
        Vacant
      </div>
    )
  }

  return (
    <div
      className={cn(
        "p-2 rounded border-l-4 text-xs space-y-1",
        hasErrors && "border-l-red-500 bg-red-50",
        hasWarnings && !hasErrors && "border-l-yellow-500 bg-yellow-50",
        !hasErrors && !hasWarnings && "border-l-green-500 bg-green-50"
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("shiftId", shift._id.toString())
      }}
    >
      {/* Employee Name */}
      <div className="font-medium text-gray-900">
        {shift.employeeId.name}
      </div>

      {/* Time Range */}
      <div className="text-gray-700">
        {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
        <span className="ml-2 text-gray-500">
          ({duration.toFixed(1)}h)
        </span>
      </div>

      {/* Weekly Hours */}
      {employeeHours && (
        <div className="text-gray-600 text-xs">
          Week: {employeeHours.toFixed(1)}h
          {shift.employeeId.standardHoursPerWeek && (
            <span className="ml-1 text-gray-500">
              / {shift.employeeId.standardHoursPerWeek}h target
            </span>
          )}
        </div>
      )}

      {/* Errors */}
      {validation?.errors.filter((e: any) => e.type === "error").length > 0 && (
        <div className="flex gap-1 items-start">
          <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-600 text-xs">
            {validation.errors
              .filter((e: any) => e.type === "error")
              .map((e: any) => e.message)
              .join("; ")}
          </div>
        </div>
      )}

      {/* Warnings */}
      {validation?.errors.filter((e: any) => e.type === "warning").length > 0 && (
        <div className="flex gap-1 items-start">
          <AlertTriangle className="w-3 h-3 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-yellow-700 text-xs">
            {validation.errors
              .filter((e: any) => e.type === "warning")
              .map((e: any) => e.message)
              .join("; ")}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => onRemove(shift._id.toString())}
          title="Remove employee from shift"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
