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
import { MultiSelect } from "@/components/ui/MultiSelect"
import { useLocations } from "@/lib/queries/locations"
import { useTeams } from "@/lib/queries/teams"
import { useEmployees } from "@/lib/queries/employees"
import { useCreateUser } from "@/lib/queries/users"
import { UserRole, canCreateUser, getRoleName } from "@/lib/config/roles"
import type { CreateUserRequest } from "@/lib/types/user"
import { AlertCircle } from "lucide-react"
import { FormDialogShell } from "@/components/shared/forms"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  currentUserRole: string | null
}

export function AddUserDialog({ open, onOpenChange, onSuccess, currentUserRole }: Props) {
  const [creationType, setCreationType] = useState<"manual" | "from-staff">("manual")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<CreateUserRequest["role"] | "">("")
  const [location, setLocation] = useState<string[]>([])
  const [managedRoles, setManagedRoles] = useState<string[]>([])

  const locationsQuery = useLocations()
  const teamsQuery = useTeams()
  const employeesQuery = useEmployees(1000)
  const createUserMutation = useCreateUser()

  const locationOptions = locationsQuery.data?.locations?.map((c) => ({
    value: c.name,
    label: c.name,
  })) || []

  const allRoles = teamsQuery.data?.teams || []

  // All available roles to show in dropdown
  const allRoleOptions = useMemo(() => {
    return [
      { value: UserRole.ADMIN, label: "Admin" },
      { value: UserRole.MANAGER, label: "Manager" },
      { value: UserRole.SUPERVISOR, label: "Supervisor" },
      { value: UserRole.ACCOUNTS, label: "Accounts" },
    ]
  }, [])

  // Check if current user can create the selected role
  const canCreateSelectedRole = useMemo(() => {
    if (!selectedRole) return true
    return canCreateUser(currentUserRole, selectedRole)
  }, [currentUserRole, selectedRole])

  // Compute role options based on selected locations (for managed roles)
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
    if (!selectedRole) return true
    // Hide for global scope roles
    return ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTS].includes(selectedRole as UserRole)
  }, [selectedRole])

  // Determine if we should show managed roles field
  const showManagedRolesField = useMemo(() => {
    return selectedRole === UserRole.SUPERVISOR
  }, [selectedRole])

  const employeeOptions = useMemo(() => 
    employeesQuery.data?.employees
      ?.filter((emp) => emp.email) // Only employees with email
      ?.map((emp) => ({
        value: emp.id,
        label: `${emp.name} (${emp.email})`,
        email: emp.email,
        name: emp.name,
        roles: emp.roles || [],
        locations: emp.locations || [],
      })) || []
  , [employeesQuery.data?.employees])

  // Auto-fill data when employee is selected
  useEffect(() => {
    if (selectedEmployee && creationType === "from-staff") {
      const employee = employeeOptions.find(emp => emp.value === selectedEmployee)
      if (employee) {
        setName(employee.name)
        setEmail(employee.email)

        // Pre-populate locations from employee data
        const employeeLocationNames = employee.locations.map((loc: any) => loc.name)
        setLocation(employeeLocationNames)

        // Pre-populate managed roles from employee's current roles
        const employeeRoleNames = employee.roles.map((role: any) => role.role.name)
        setManagedRoles(employeeRoleNames)
      }
    } else if (creationType === "manual") {
      // Reset when switching back to manual
      setLocation([])
      setManagedRoles([])
    }
  }, [selectedEmployee, employeeOptions, creationType])

  // Clear managed roles when locations are cleared
  useEffect(() => {
    if (location.length === 0) {
      setManagedRoles([])
    }
  }, [location.length])

  const reset = () => {
    setCreationType("manual")
    setSelectedEmployee("")
    setName("")
    setEmail("")
    setPassword("")
    setSelectedRole("")
    setLocation([])
    setManagedRoles([])
  }

  const handleSubmit = async () => {
    if (!selectedRole) {
      throw new Error("Please select a role")
    }

    if (!canCreateSelectedRole) {
      throw new Error(`You don't have permission to create ${getRoleName(selectedRole)} users.`)
    }

    const payload: CreateUserRequest = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: selectedRole || undefined,
      ...(creationType === "manual" ? { password } : {}), // Only include password for manual creation
      location: showLocationField ? location : [],
      managedRoles: showManagedRolesField ? managedRoles : [],
      ...(creationType === "from-staff" && selectedEmployee ? { employeeId: selectedEmployee } : {}),
    }

    console.log('[AddUserDialog] Submitting payload:', payload)

    await createUserMutation.mutateAsync(payload)
    reset()
    onSuccess()
  }

  const isFormValid = useMemo(() => {
    return name.trim() && 
           email.trim() && 
           selectedRole && 
           canCreateSelectedRole &&
           (creationType === "manual" ? password.length >= 6 : true) &&
           (creationType === "from-staff" ? selectedEmployee : true)
  }, [name, email, selectedRole, canCreateSelectedRole, creationType, password, selectedEmployee])

  return (
    <FormDialogShell
      open={open}
      onOpenChange={(open) => {
        if (!open) reset()
        onOpenChange(open)
      }}
      title="Add User"
      onSubmit={handleSubmit}
      submitLabel="Create User"
      loading={createUserMutation.isPending}
      disabled={!isFormValid}
      size="lg"
    >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Creation Type</FieldLabel>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="manual"
                    checked={creationType === "manual"}
                    onChange={(e) => setCreationType(e.target.value as "manual" | "from-staff")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Create Manually</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="from-staff"
                    checked={creationType === "from-staff"}
                    onChange={(e) => setCreationType(e.target.value as "manual" | "from-staff")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">From Existing Employee</span>
                </label>
              </div>
            </Field>

            {creationType === "from-staff" && (
              <Field>
                <FieldLabel>Select Employee</FieldLabel>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Choose an employee...</option>
                  {employeeOptions.map((emp) => (
                    <option key={emp.value} value={emp.value}>
                      {emp.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="add-user-role">Role *</FieldLabel>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as CreateUserRequest["role"])} required>
                <SelectTrigger id="add-user-role">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {allRoleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole && !canCreateSelectedRole && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    You don't have permission to create {getRoleName(selectedRole)} users.
                  </p>
                </div>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="add-user-name">Name *</FieldLabel>
              <Input
                id="add-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={creationType === "from-staff" && !selectedEmployee}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="add-user-email">Email *</FieldLabel>
              <Input
                id="add-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={creationType === "from-staff" && !selectedEmployee}
                placeholder="user@example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email is used for login and must be unique
              </p>
            </Field>

            {creationType === "manual" && (
              <Field>
                <FieldLabel htmlFor="add-user-password">Password *</FieldLabel>
                <Input
                  id="add-user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </Field>
            )}

            {showLocationField && (
              <Field>
                <FieldLabel>Locations</FieldLabel>
                <MultiSelect
                  options={locationOptions}
                  onValueChange={setLocation}
                  defaultValue={location}
                  placeholder="Select locations..."
                  disabled={createUserMutation.isPending}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Assign locations this user can access
                </p>
              </Field>
            )}

            {showManagedRolesField && (
              <Field>
                <FieldLabel>Managed Roles</FieldLabel>
                <MultiSelect
                  options={roleOptions}
                  onValueChange={setManagedRoles}
                  defaultValue={managedRoles}
                  placeholder={location.length === 0 ? "Select locations first..." : "Select roles..."}
                  disabled={createUserMutation.isPending || location.length === 0}
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
