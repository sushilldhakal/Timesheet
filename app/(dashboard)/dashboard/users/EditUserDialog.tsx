"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/MultiSelect"
import { useLocations } from "@/lib/queries/locations"
import { useRoles } from "@/lib/queries/roles"
import { useUser } from "@/lib/queries/users"
import { useEmployees } from "@/lib/queries/employees"
import { useUpdateUser } from "@/lib/queries/users"
import { UserRole } from "@/lib/config/roles"
import type { UserRow } from "./page"

type Props = {
  user: UserRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isSelf: boolean
  currentUserRole: string | null
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
  isSelf,
  currentUserRole,
}: Props) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email || "")
  const [password, setPassword] = useState("")
  const [location, setLocation] = useState<string[]>(user.location ?? [])
  const [managedRoles, setManagedRoles] = useState<string[]>([])
  const [linkedEmployee, setLinkedEmployee] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const locationsQuery = useLocations()
  const rolesQuery = useRoles()
  const userQuery = useUser(user.id)
  const employeesQuery = useEmployees(1000)
  const updateUserMutation = useUpdateUser()

  const locationOptions = locationsQuery.data?.locations?.map((c) => ({
    value: c.name,
    label: c.name,
  })) || []

  const allRoles = rolesQuery.data?.roles || []

  // Compute role options based on selected locations
  const roleOptions = useMemo(() => {
    if (location.length === 0) {
      return []
    }
    return allRoles.map(r => ({
      value: r.name,
      label: r.name,
    }))
  }, [location.length, allRoles])

  // Determine if we should show location field
  const showLocationField = useMemo(() => {
    // Hide for global scope roles
    return ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTS].includes(user.role as UserRole)
  }, [user.role])

  // Determine if we should show managed roles field
  const showManagedRolesField = useMemo(() => {
    return user.role === UserRole.SUPERVISOR
  }, [user.role])

  useEffect(() => {
    if (userQuery.data && 'data' in userQuery.data) {
      setManagedRoles(userQuery.data.data.managedRoles ?? [])
    }
  }, [userQuery.data])

  useEffect(() => {
    if (employeesQuery.data?.employees && user.email) {
      // Find linked employee by email
      const employee = employeesQuery.data.employees.find((emp) =>
        emp.email && emp.email.toLowerCase() === user.email?.toLowerCase()
      )
      setLinkedEmployee(employee)
    }
  }, [employeesQuery.data, user.email])

  useEffect(() => {
    if (open && user) {
      setName(user.name)
      setEmail(user.email || "")
      setPassword("")
      setLocation(user.location ?? [])
      setManagedRoles(user.managedRoles ?? [])
      setError(null)
    }
  }, [open, user])

  const syncFromEmployee = () => {
    if (linkedEmployee) {
      // Sync locations
      const employeeLocationNames = linkedEmployee.locations?.map((loc: any) => loc.name) || []
      setLocation(employeeLocationNames)

      // Sync managed roles from employee's current roles
      const employeeRoleNames = linkedEmployee.roles?.map((role: any) => role.role.name) || []
      setManagedRoles(employeeRoleNames)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const body = isSelf
        ? {
            email: email.trim().toLowerCase(),
            ...(password ? { password } : {}),
          }
        : {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            ...(password ? { password } : {}),
            location: showLocationField ? location : [],
            rights: [], // Deprecated
            managedRoles: showManagedRolesField ? managedRoles : [],
          }

      await updateUserMutation.mutateAsync({ id: user.id, data: body })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const loading = updateUserMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSelf ? "Edit My Profile" : "Edit User"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            {!isSelf && linkedEmployee && (
              <Field>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Linked Employee: {linkedEmployee.name}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Roles: {linkedEmployee.roles?.map((r: any) => r.role.name).join(", ") || "None"} |
                      Locations: {linkedEmployee.locations?.map((l: any) => l.name).join(", ") || "None"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={syncFromEmployee}
                    className="ml-3"
                  >
                    Sync from Employee
                  </Button>
                </div>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="edit-user-name">Name *</FieldLabel>
              <Input
                id="edit-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSelf}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-user-email">Email *</FieldLabel>
              <Input
                id="edit-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email is used for login
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-user-password">New Password</FieldLabel>
              <Input
                id="edit-user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                minLength={password ? 6 : undefined}
              />
            </Field>

            {!isSelf && showLocationField && (
              <Field>
                <FieldLabel>Locations</FieldLabel>
                <MultiSelect
                  options={locationOptions}
                  onValueChange={setLocation}
                  defaultValue={location}
                  placeholder="Select locations..."
                  disabled={loading}
                />
              </Field>
            )}

            {!isSelf && showManagedRolesField && (
              <Field>
                <FieldLabel>Managed Roles</FieldLabel>
                <MultiSelect
                  options={roleOptions}
                  onValueChange={setManagedRoles}
                  defaultValue={managedRoles}
                  placeholder={location.length === 0 ? "Select locations first..." : "Select roles..."}
                  disabled={loading || location.length === 0}
                />
              </Field>
            )}

            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
