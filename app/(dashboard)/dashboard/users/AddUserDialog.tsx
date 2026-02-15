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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    if (open) {
      fetch(`/api/categories?type=${CATEGORY_TYPES.LOCATION}`)
        .then((res) => res.ok ? res.json() : { categories: [] })
        .then((data) => {
          const opts = (data.categories ?? []).map((c: { id: string; name: string }) => ({
            value: c.name,
            label: c.name,
          }))
          setLocationOptions(opts)
        })
        .catch(() => setLocationOptions([]))
    }
  }, [open])

  const reset = () => {
    setName("")
    setUsername("")
    setPassword("")
    setRole("user")
    setLocation([])
    setRights([])
    setError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const toggleRight = (r: Right) => {
    setRights((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || username.trim(),
          username: username.trim().toLowerCase(),
          password,
          role,
          location,
          rights,
        }),
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
              <FieldLabel htmlFor="add-location">Locations</FieldLabel>
              <MultiSelect
                options={locationOptions}
                defaultValue={location}
                onValueChange={setLocation}
                placeholder="Select locations..."
                variant="secondary"
                resetOnDefaultValueChange
              />
            </Field>
            <Field>
              <FieldLabel>Rights</FieldLabel>
              <div className="flex flex-wrap gap-4 pt-2">
                {RIGHTS_LIST.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={rights.includes(r)}
                      onCheckedChange={() => toggleRight(r)}
                    />
                    <span className="text-sm">{RIGHT_LABELS[r]}</span>
                  </label>
                ))}
              </div>
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
