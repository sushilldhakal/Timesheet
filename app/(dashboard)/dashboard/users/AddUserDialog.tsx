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
  const [loading, setLoading] = useState(false)
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([])
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([])
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string; email: string; name: string; roles: any[]; locations: any[] }[]>([])
  const [allRoles, setAllRoles] = useState<Array<{ id: string; name: string; locations?: string[] }>>([])

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch(`/api/categories?type=${CATEGORY_TYPES.LOCATION}`).then((res) => res.ok ? res.json() : { categories: [] }),
        fetch(`/api/categories?type=${CATEGORY_TYPES.ROLE}`).then((res) => res.ok ? res.json() : { categories: [] }),
        fetch('/api/employees?limit=1000').then((res) => res.ok ? res.json() : { employees: [] }),
      ]).then(([locationData, roleData, employeeData]) => {
        const locOpts = (locationData.categories ?? []).map((c: { id: string; name: string }) => ({
          value: c.name,
          label: c.name,
        }))
        setLocationOptions(locOpts)
        setAllRoles(roleData.categories ?? [])
        
        // Filter employees who don't already have user accounts and include their roles/locations
        const empOpts = (employeeData.employees ?? [])
          .filter((emp: any) => emp.email) // Only employees with email
          .map((emp: any) => ({
            value: emp.id,
            label: `${emp.name} (${emp.email})`,
            email: emp.email,
            name: emp.name,
            roles: emp.roles || [],
            locations: emp.locations || [],
          }))
        setEmployeeOptions(empOpts)
      }).catch(() => {
        setLocationOptions([])
        setAllRoles([])
        setEmployeeOptions([])
      })
    }
  }, [open])

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
    setLoading(true)
    
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
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to create user")
        return
      }
      handleOpenChange(false)
      onSuccess()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

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
                  <span className="text-sm">Promote from Staff</span>
                </label>
              </div>
            </Field>

            {creationType === "from-staff" && (
              <Field>
                <FieldLabel htmlFor="select-employee">Select Employee *</FieldLabel>
                <select
                  id="select-employee"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                  required
                >
                  <option value="">Choose an employee...</option>
                  {employeeOptions.map((emp) => (
                    <option key={emp.value} value={emp.value}>
                      {emp.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select an existing employee to promote to user
                </p>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="add-name">Name</FieldLabel>
              <Input
                id="add-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                disabled={creationType === "from-staff" && selectedEmployee !== ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-email">Email *</FieldLabel>
              <Input
                id="add-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={creationType === "from-staff" && selectedEmployee !== ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-username">Username *</FieldLabel>
              <Input
                id="add-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
              />
            </Field>
            {creationType === "manual" && (
              <Field>
                <FieldLabel htmlFor="add-password">Password *</FieldLabel>
                <Input
                  id="add-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
              </Field>
            )}
            {creationType === "from-staff" && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Employee's existing password will be copied to the user account
                </p>
              </div>
            )}
            <Field>
              <FieldLabel htmlFor="add-location">Locations *</FieldLabel>
              <MultiSelect
                options={locationOptions}
                defaultValue={location}
                onValueChange={setLocation}
                placeholder="Select locations..."
                variant="secondary"
                resetOnDefaultValueChange
              />
              <p className="text-xs text-muted-foreground mt-1">
                {creationType === "from-staff" && selectedEmployee 
                  ? "Pre-populated from employee's current locations" 
                  : "Select locations to enable role selection"}
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="add-managed-roles">Managed Roles (Supervisor)</FieldLabel>
              {location.length === 0 ? (
                <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground items-center">
                  Please select locations first
                </div>
              ) : (
                <MultiSelect
                  options={roleOptions}
                  defaultValue={managedRoles}
                  onValueChange={setManagedRoles}
                  placeholder="Select roles to supervise..."
                  variant="secondary"
                  resetOnDefaultValueChange
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {creationType === "from-staff" && selectedEmployee 
                  ? "Pre-populated from employee's current roles. User can manage timesheets and rosters for staff in these roles." 
                  : "User can manage timesheets and rosters for staff in these roles"}
              </p>
            </Field>
            <Field>
              <FieldLabel>Rights</FieldLabel>
              <MultiSelect
                options={RIGHTS_LIST.map(r => ({ value: r, label: RIGHT_LABELS[r] }))}
                defaultValue={rights}
                onValueChange={(values) => setRights(values as Right[])}
                placeholder="Select rights..."
                variant="secondary"
                resetOnDefaultValueChange
              />
            </Field>
            {error && (
              <FieldError>{error}</FieldError>
            )}
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
