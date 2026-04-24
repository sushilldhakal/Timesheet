"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { useLocations } from "@/lib/queries/locations"
import { useTeams } from "@/lib/queries/teams"
import { useEmployees } from "@/lib/queries/employees"
import { useUpdateUser } from "@/lib/queries/users"
import { UserRole, canCreateUser, getRoleName } from "@/lib/config/roles"
import { AlertCircle } from "lucide-react"
import type { UpdateUserRequest, User } from "@/lib/types/user"
import { FormDialogShell } from "@/components/shared/forms"

type Props = {
  user: User
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
  const [selectedRole, setSelectedRole] = useState<UpdateUserRequest["role"]>(user.role)
  const [location, setLocation] = useState<string[]>(user.location ?? [])
  const [managedRoles, setManagedRoles] = useState<string[]>(user.managedRoles ?? [])
  const [linkedEmployee, setLinkedEmployee] = useState<any>(null)

  const locationsQuery = useLocations()
  const teamsQuery = useTeams()
  const employeesQuery = useEmployees(1000)
  const updateUserMutation = useUpdateUser()

  const locationOptions = locationsQuery.data?.locations?.map((c) => ({
    value: c.name,
    label: c.name,
  })) || []

  const allRoles = teamsQuery.data?.teams || []

  // Role options the current user is allowed to assign
  const roleOptions = useMemo(() => [
    { value: UserRole.ADMIN, label: "Admin" },
    { value: UserRole.MANAGER, label: "Manager" },
    { value: UserRole.SUPERVISOR, label: "Supervisor" },
    { value: UserRole.ACCOUNTS, label: "Accounts" },
  ], [])

  // Determine if the current user can assign the selected role
  const canAssignRole = useMemo(() => {
    if (!selectedRole) return true
    return canCreateUser(currentUserRole, selectedRole)
  }, [currentUserRole, selectedRole])

  // Team options for managed roles (depends on location selection)
  const teamOptions = useMemo(() => {
    if (location.length === 0) return []
    return allRoles.map(r => ({ value: r.name, label: r.name }))
  }, [location.length, allRoles])

  // Show location field for roles that have location scope
  const showLocationField = useMemo(() => {
    return ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTS].includes(selectedRole as UserRole)
  }, [selectedRole])

  // Show managed roles field only for supervisors
  const showManagedRolesField = useMemo(() => {
    return selectedRole === UserRole.SUPERVISOR
  }, [selectedRole])

  // Reset form state when dialog opens with a (possibly different) user
  useEffect(() => {
    if (open && user) {
      setName(user.name)
      setEmail(user.email || "")
      setPassword("")
      setSelectedRole(user.role)
      setLocation(user.location ?? [])
      setManagedRoles(user.managedRoles ?? [])
    }
  }, [open, user])

  // Clear managed roles when location is cleared
  useEffect(() => {
    if (location.length === 0) {
      setManagedRoles([])
    }
  }, [location.length])

  // Clear managed roles when role changes away from supervisor
  useEffect(() => {
    if (selectedRole !== UserRole.SUPERVISOR) {
      setManagedRoles([])
    }
  }, [selectedRole])

  // Find linked employee by email
  useEffect(() => {
    if (employeesQuery.data?.employees && user.email) {
      const employee = employeesQuery.data.employees.find((emp) =>
        emp.email && emp.email.toLowerCase() === user.email?.toLowerCase()
      )
      setLinkedEmployee(employee ?? null)
    }
  }, [employeesQuery.data, user.email])

  const syncFromEmployee = () => {
    if (linkedEmployee) {
      const employeeLocationNames = linkedEmployee.locations?.map((loc: any) => loc.name) || []
      setLocation(employeeLocationNames)
      const employeeRoleNames = linkedEmployee.roles?.map((role: any) => role.role.name) || []
      setManagedRoles(employeeRoleNames)
    }
  }

  const handleSubmit = async () => {
    if (!isSelf && !canAssignRole) {
      throw new Error(`You don't have permission to assign the ${getRoleName(selectedRole ?? null)} role.`)
    }

    const body: UpdateUserRequest = isSelf
      ? {
          email: email.trim().toLowerCase(),
          ...(password ? { password } : {}),
        }
      : {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: selectedRole,
          ...(password ? { password } : {}),
          location: showLocationField ? location : [],
          managedRoles: showManagedRolesField ? managedRoles : [],
        }

    await updateUserMutation.mutateAsync({ id: user.id, data: body })
    onSuccess()
  }

  const isFormValid = useMemo(() => {
    return name.trim() && 
           email.trim() && 
           (isSelf || canAssignRole) &&
           (!password || password.length >= 6)
  }, [name, email, isSelf, canAssignRole, password])

  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={isSelf ? "Edit My Profile" : "Edit User"}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
      loading={updateUserMutation.isPending}
      disabled={!isFormValid}
    >
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

            {!isSelf && (
              <Field>
                <FieldLabel htmlFor="edit-user-role">Role *</FieldLabel>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UpdateUserRequest["role"])}>
                  <SelectTrigger id="edit-user-role">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRole && !canAssignRole && (
                  <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      You don't have permission to assign the {getRoleName(selectedRole)} role.
                    </p>
                  </div>
                )}
              </Field>
            )}

            {!isSelf && showLocationField && (
              <Field>
                <FieldLabel>Locations</FieldLabel>
                <MultiSelect
                  options={locationOptions}
                  onValueChange={setLocation}
                  defaultValue={location}
                  placeholder="Select locations..."
                  disabled={updateUserMutation.isPending}
                />
              </Field>
            )}

            {!isSelf && showManagedRolesField && (
              <Field>
                <FieldLabel>Managed Roles</FieldLabel>
                <MultiSelect
                  options={teamOptions}
                  onValueChange={setManagedRoles}
                  defaultValue={managedRoles}
                  placeholder={location.length === 0 ? "Select locations first..." : "Select roles this supervisor manages..."}
                  disabled={updateUserMutation.isPending || location.length === 0}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Roles this supervisor can manage
                </p>
              </Field>
            )}

          </FieldGroup>
    </FormDialogShell>
  )
}
