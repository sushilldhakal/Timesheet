"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmployeePanelProps {
  weekId: string
}

export function EmployeePanel({ weekId }: EmployeePanelProps) {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    loadEmployees()
  }, [weekId])

  async function loadEmployees() {
    setLoading(true)
    try {
      const res = await fetch(`/api/roster/schedule/${weekId}/available-employees`)
      if (!res.ok) throw new Error("Failed to load employees")
      const data = await res.json()
      setEmployees(data.employees)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(filter.toLowerCase())
  )

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Available Staff</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-fit sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Available Staff
          <Badge variant="secondary" className="ml-auto">
            {filteredEmployees.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search Filter */}
        <Input
          placeholder="Search staff..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8"
        />

        {/* Employee List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredEmployees.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              No employees found
            </p>
          ) : (
            filteredEmployees.map((employee) => (
              <div
                key={employee._id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy"
                  e.dataTransfer.setData("employeeId", employee._id)
                }}
                className={cn(
                  "p-2 rounded border cursor-move hover:shadow-md transition bg-white",
                  employee.currentHours === 0 && "border-gray-300 opacity-80",
                  employee.currentHours > 0 && "border-blue-300 bg-blue-50",
                  employee.hoursRemaining !== null &&
                    employee.hoursRemaining < 5 &&
                    "border-orange-300 bg-orange-50"
                )}
              >
                {/* Name */}
                <div className="font-medium text-xs text-gray-900">
                  {employee.name}
                </div>

                {/* Employment Type Badge */}
                {employee.employmentType && (
                  <Badge variant="outline" className="text-xs mb-1">
                    {employee.employmentType}
                  </Badge>
                )}

                {/* Hours Info */}
                <div className="text-xs text-gray-600 space-y-1">
                  {employee.standardHoursPerWeek && (
                    <div>
                      <div className="text-gray-700">
                        Scheduled: <span className="font-semibold">{employee.currentHours.toFixed(1)}h</span>
                      </div>
                      <div className="text-gray-700">
                        Target: <span className="font-semibold">{employee.standardHoursPerWeek}h</span>
                      </div>
                      {employee.hoursRemaining !== null && (
                        <div className={cn(
                          "text-gray-700",
                          employee.hoursRemaining < 0 && "text-red-600 font-semibold"
                        )}>
                          Remaining: <span className="font-semibold">
                            {employee.hoursRemaining.toFixed(1)}h
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Assigned Roles/Locations */}
                {employee.assignments.length > 0 && (
                  <div className="mt-1 space-y-1">
                    <div className="text-xs font-semibold text-gray-700">
                      Roles:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {employee.assignments.map((a: any) => (
                        <Badge key={a.roleId} variant="secondary" className="text-xs">
                          {a.roleName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unscheduled Badge */}
                {employee.currentHours === 0 && (
                  <Badge variant="outline" className="text-xs mt-1 bg-yellow-50 text-yellow-700">
                    Unscheduled
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>

        {/* Tips */}
        <div className="text-xs text-gray-500 border-t pt-2 space-y-1">
          <p className="font-semibold">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Drag staff onto the roster grid</li>
            <li>Orange = Low hours remaining</li>
            <li>Unscheduled = No shifts yet</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
