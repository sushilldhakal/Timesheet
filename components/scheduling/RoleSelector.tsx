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
import { useLocationRoles } from "@/lib/queries/locations"

interface Role {
  roleId: string
  roleName: string
  roleColor?: string
  isEnabled: boolean
  employeeCount: number
}

interface RoleSelectorProps {
  locationId: string
  selectedDate: Date
  value: string
  onChange: (roleId: string) => void
  placeholder?: string
  className?: string
}

/**
 * RoleSelector Component
 * Filters roles by location enablement on a specific date
 * Only shows roles that are enabled at the selected location
 */
export function RoleSelector({
  locationId,
  selectedDate,
  value,
  onChange,
  placeholder = "Select role",
  className,
}: RoleSelectorProps) {
  const [open, setOpen] = useState(false)

  // TanStack Query hook
  const { data: rolesData, isLoading: loading, error } = useLocationRoles(locationId)

  const roles = rolesData?.data || []
  const errorMessage = error ? (error as Error).message : null

  const selectedRole = roles.find((role) => role.roleId === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={loading || !locationId}
        >
          {loading ? (
            "Loading roles..."
          ) : selectedRole ? (
            <span className="flex items-center gap-2">
              {(selectedRole as any).roleColor && (
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: (selectedRole as any).roleColor }}
                />
              )}
              {(selectedRole as any).roleName}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search roles..." />
          <CommandEmpty>
            {error ? (
              <div className="text-sm text-destructive p-2">{errorMessage}</div>
            ) : roles.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">
                No roles available at this location
              </div>
            ) : (
              "No role found."
            )}
          </CommandEmpty>
          <CommandGroup>
            {roles.map((role: any) => (
              <CommandItem
                key={role.roleId}
                value={role.roleId}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? "" : currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === role.roleId ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex items-center gap-2 flex-1">
                  {(role as any).roleColor && (
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: (role as any).roleColor }}
                    />
                  )}
                  {(role as any).roleName}
                  <span className="text-xs text-muted-foreground ml-auto">
                    ({(role as any).employeeCount} staff)
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
