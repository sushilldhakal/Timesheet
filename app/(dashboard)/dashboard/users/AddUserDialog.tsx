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
import { Checkbox } from "@/components/ui/checkbox"
import { MultiSelect } from "@/components/ui/MultiSelect"
import { RIGHTS_LIST, RIGHT_LABELS, type Right } from "@/lib/config/rights"
import { CATEGORY_TYPES } from "@/lib/config/category-types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddUserDialog({ open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"admin" | "user">("user")
  const [location, setLocation] = useState<string[]>([])
  const [rights, setRights] = useState<Right[]>([])
  const [managedRoles, setManagedRoles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([])
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([])
  const [allRoles, setAllRoles] = useState<Array<{ id: string; name: string; locations?: string[] }>>([])

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch(`/api/categories?type=${CATEGORY_TYPES.LOCATION}`).then((res) => res.ok ? res.json() : { categories: [] }),
        fetch(`/api/categories?type=${CATEGORY_TYPES.ROLE}`).then((res) => res.ok ? res.json() : { categories: [] }),
      ]).then(([locationData, roleData]) => {
        const locOpts = (locationData.categories ?? []).map((c: { id: string; name: string }) => ({
          value: c.name,
          label: c.name,
        }))
        setLocationOptions(locOpts)
        setAllRoles(roleData.categories ?? [])
      }).catch(() => {
        setLocationOptions([])
        setAllRoles([])
      })
    }
  }, [open])

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
    setName("")
    setUsername("")
    setPassword("")
    setRole("user")
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
      password,
      role,
      location,
      rights,
      managedRoles,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="add-name">Name</FieldLabel>
              <Input
                id="add-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
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
            <Field>
              <FieldLabel htmlFor="add-role">Role</FieldLabel>
              <select
                id="add-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "user")}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="user">User</option>
              </select>
            </Field>
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
                Select locations to enable role selection
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
                User can manage timesheets and rosters for staff in these roles
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
