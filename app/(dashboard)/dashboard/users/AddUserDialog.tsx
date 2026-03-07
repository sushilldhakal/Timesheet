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
import { RIGHTS_LIST, RIGHT_LABELS, type Right } from "@/lib/config/rights"
import { CATEGORY_TYPES } from "@/lib/config/category-types"
import { useCategoriesByType } from "@/lib/queries/categories"
import { useEmployees } from "@/lib/queries/employees"
import { useCreateUser } from "@/lib/queries/users"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddUserDialog({ open, onOpenChange, onSuccess }: Props) {
  const [creationType, setCreationType] = useState<"manual" | "from-staff">("manual")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [location, setLocation] = useState<string[]>([])
  const [rights, setRights] = useState<Right[]>([])
  const [managedRoles, setManagedRoles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([])

  const locationsQuery = useCategoriesByType("location")
  const rolesQuery = useCategoriesByType("role")
  const employeesQuery = useEmployees(1000)
  const createUserMutation = useCreateUser()

  const locationOptions = locationsQuery.data?.categories?.map((c) => ({
    value: c.name,
    label: c.name,
  })) || []

  const allRoles = rolesQuery.data?.categories || []

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
        setUsername(employee.email.split('@')[0]) // Use email prefix as username

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

  // Filter roles based on selected locations
  useEffect(() => {
    if (location.length === 0) {
      setRoleOptions([])
      setManagedRoles([])
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

  const reset = () => {
    setCreationType("manual")
    setSelectedEmployee("")
    setName("")
    setUsername("")
    setEmail("")
    setPassword("")
    setLocation([])
    setRights([])
    setManagedRoles([])
    setError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payload = {
      name: name.trim() || username.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      ...(creationType === "manual" ? { password } : {}), // Only include password for manual creation
      location,
      rights,
      managedRoles,
      ...(creationType === "from-staff" && selectedEmployee ? { employeeId: selectedEmployee } : {}),
    }

    console.log('[AddUserDialog] Submitting payload:', payload)

    try {
      await createUserMutation.mutateAsync(payload)
      handleOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const loading = createUserMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
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
              <FieldLabel htmlFor="add-user-username">Username *</FieldLabel>
              <Input
                id="add-user-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
              />
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

            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
