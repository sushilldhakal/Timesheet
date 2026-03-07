"use client"

import { useState, useEffect } from "react"
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
import { RIGHTS_LIST, RIGHT_LABELS, type Right } from "@/lib/config/rights"
import { CATEGORY_TYPES } from "@/lib/config/category-types"
import { useCategoriesByType } from "@/lib/queries/categories"
import { useUser } from "@/lib/queries/users"
import { useEmployees } from "@/lib/queries/employees"
import { useUpdateUser } from "@/lib/queries/users"
import type { UserRow } from "./page"

type Props = {
  user: UserRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isSelf: boolean
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
  isSelf,
}: Props) {
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email || "")
  const [password, setPassword] = useState("")
  const [location, setLocation] = useState<string[]>(user.location ?? [])
  const [rights, setRights] = useState<Right[]>(
    (user.rights?.filter((r) => RIGHTS_LIST.includes(r as Right)) ?? []) as Right[]
  )
  const [managedRoles, setManagedRoles] = useState<string[]>([])
  const [linkedEmployee, setLinkedEmployee] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([])

  const locationsQuery = useCategoriesByType("location")
  const rolesQuery = useCategoriesByType("role")
  const userQuery = useUser(user.id)
  const employeesQuery = useEmployees(1000)
  const updateUserMutation = useUpdateUser()

  const locationOptions = locationsQuery.data?.categories?.map((c) => ({
    value: c.name,
    label: c.name,
  })) || []

  const allRoles = rolesQuery.data?.categories || []

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

  // Filter roles based on selected locations
  useEffect(() => {
    if (location.length === 0) {
      setRoleOptions([])
      return
    }

    // Show all roles when locations are selected
    // In the future, you can add location-specific filtering if roles have location associations
    const opts = allRoles.map(r => ({
      value: r.name,
      label: r.name,
    }))
    setRoleOptions(opts)
  }, [location, allRoles])

  useEffect(() => {
    if (open && user) {
      setName(user.name)
      setUsername(user.username)
      setEmail(user.email || "")
      setPassword("")
      setLocation(user.location ?? [])
      setRights(
        (user.rights?.filter((r) => RIGHTS_LIST.includes(r as Right)) ?? []) as Right[]
      )
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
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            ...(password ? { password } : {}),
          }
        : {
            name: name.trim() || username.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            ...(password ? { password } : {}),
            location,
            rights,
            managedRoles,
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
              <FieldLabel htmlFor="edit-user-username">Username *</FieldLabel>
              <Input
                id="edit-user-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
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

            {!isSelf && (
              <>
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

                <Field>
                  <FieldLabel>Access Rights</FieldLabel>
                  <MultiSelect
                    options={RIGHTS_LIST.map(right => ({
                      label: RIGHT_LABELS[right],
                      value: right,
                    }))}
                    onValueChange={(values) => setRights(values as Right[])}
                    defaultValue={rights}
                    placeholder="Select access rights..."
                    disabled={loading}
                  />
                </Field>

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
              </>
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
