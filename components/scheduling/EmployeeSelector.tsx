"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEmployeeAvailability } from "@/lib/queries/employees"

interface Employee {
  employeeId: string
  employeeName: string
  assignmentId: string
  validFrom: string
  validTo: string | null
}

interface EmployeeSelectorProps {
  roleId: string
  locationId: string
  selectedDate: Date
  value: string
  onChange: (employeeId: string) => void
  placeholder?: string
  className?: string
}

/**
 * EmployeeSelector Component
 * Filters employees by role assignment at a specific location on a specific date
 * Only shows employees assigned to the selected role at the selected location
 */
export function EmployeeSelector({
  roleId,
  locationId,
  selectedDate,
  value,
  onChange,
  placeholder = "Select employee",
  className,
}: EmployeeSelectorProps) {
  const [open, setOpen] = useState(false)

  // TanStack Query hook
  const { data: employeesData, isLoading: loading, error } = useEmployeeAvailability(
    roleId,
    {
      date: selectedDate.toISOString(),
      locationId
    }
  )

  const employees = (employeesData as any)?.employees || []
  const errorMessage = error ? (error as Error).message : null

  const selectedEmployee = employees.find((emp: any) => emp.employeeId === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={loading || !roleId || !locationId}
        >
          {loading ? (
            "Loading employees..."
          ) : selectedEmployee ? (
            <span className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {selectedEmployee.employeeName[0]}
                </AvatarFallback>
              </Avatar>
              {selectedEmployee.employeeName}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search employees..." />
          <CommandEmpty>
            {error ? (
              <div className="text-sm text-destructive p-2">{errorMessage}</div>
            ) : employees.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">
                No employees available for this role at this location
              </div>
            ) : (
              "No employee found."
            )}
          </CommandEmpty>
          <CommandGroup>
            {employees.map((employee: any) => (
              <CommandItem
                key={employee.employeeId}
                value={employee.employeeId}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? "" : currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === employee.employeeId ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">
                      {(employee as any).employeeName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {(employee as any).employeeName}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
