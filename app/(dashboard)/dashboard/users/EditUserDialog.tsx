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
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"admin" | "user">(user.role)
  const [location, setLocation] = useState<string[]>(user.location ?? [])
  const [rights, setRights] = useState<Right[]>(
    (user.rights?.filter((r) => RIGHTS_LIST.includes(r as Right)) ?? []) as Right[]
  )
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
        fetch(`/api/users/${user.id}`).then((res) => res.ok ? res.json() : { user: {} }),
      ]).then(([locationData, roleData, userData]) => {
        const locOpts = (locationData.categories ?? []).map((c: { id: string; name: string }) => ({
          value: c.name,
          label: c.name,
        }))
        setLocationOptions(locOpts)
        setAllRoles(roleData.categories ?? [])
        setManagedRoles(userData.user?.managedRoles ?? [])
      }).catch(() => {
        setLocationOptions([])
        setAllRoles([])
      })
    }
  }, [open, user.id])

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
      setPassword("")
      setRole(user.role)
      setLocation(user.location ?? [])
      setRights(
        (user.rights?.filter((r) => RIGHTS_LIST.includes(r as Right)) ?? []) as Right[]
      )
      setManagedRoles(user.managedRoles ?? [])
      setError(null)
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body = isSelf
        ? {
            username: username.trim().toLowerCase(),
            ...(password ? { password } : {}),
          }
        : {
            name: name.trim() || username.trim(),
            username: username.trim().toLowerCase(),
            ...(password ? { password } : {}),
            role,
            location,
            rights,
            managedRoles,
          }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to update user")
        return
      }
      onOpenChange(false)
      onSuccess()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

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
            {!isSelf && (
              <Field>
                <FieldLabel htmlFor="edit-name">Name</FieldLabel>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="edit-username">Username *</FieldLabel>
              <Input
                id="edit-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-password">
                {isSelf ? "New Password" : "Password"}
              </FieldLabel>
              <Input
                id="edit-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSelf ? "Leave blank to keep current" : "Leave blank to keep current"}
                minLength={password ? 6 : undefined}
              />
            </Field>
            {!isSelf && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-role">Role</FieldLabel>
                  <select
                    id="edit-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "user")}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-location">Locations *</FieldLabel>
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
                  <FieldLabel htmlFor="edit-managed-roles">Managed Roles (Supervisor)</FieldLabel>
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
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
