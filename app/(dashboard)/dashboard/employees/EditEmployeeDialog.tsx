"use client"

import { useState, useEffect, useRef } from "react"
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
import { CATEGORY_TYPES } from "@/lib/config/category-types"
import { UserCircle, Upload, X } from "lucide-react"
import type { EmployeeRow } from "./page"

type Props = {
  employee: EmployeeRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditEmployeeDialog({ employee, open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState(employee.name)
  const [role, setRole] = useState<string[]>(employee.role ?? [])
  const [employer, setEmployer] = useState<string[]>(employee.employer ?? [])
  const [location, setLocation] = useState<string[]>(employee.location ?? [])
  const [email, setEmail] = useState(employee.email ?? "")
  const [phone, setPhone] = useState(employee.phone ?? "")
  const [dob, setDob] = useState(employee.dob ?? "")
  const [comment, setComment] = useState(employee.comment ?? "")
  const [img, setImg] = useState(employee.img ?? "")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([])
  const [employerOptions, setEmployerOptions] = useState<{ value: string; label: string }[]>([])
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && employee) {
      setName(employee.name)
      setRole(employee.role ?? [])
      setEmployer(employee.employer ?? [])
      setLocation(employee.location ?? [])
      setEmail(employee.email ?? "")
      setPhone(employee.phone ?? "")
      setDob(employee.dob ?? "")
      setComment(employee.comment ?? "")
      setImg(employee.img ?? "")
    }
  }, [open, employee])

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch(`/api/categories?type=${CATEGORY_TYPES.ROLE}`).then((r) => (r.ok ? r.json() : { categories: [] })),
        fetch(`/api/categories?type=${CATEGORY_TYPES.EMPLOYER}`).then((r) => (r.ok ? r.json() : { categories: [] })),
        fetch(`/api/categories?type=${CATEGORY_TYPES.LOCATION}`).then((r) => (r.ok ? r.json() : { categories: [] })),
      ]).then(([roleData, employerData, locationData]) => {
        setRoleOptions((roleData.categories ?? []).map((c: { name: string }) => ({ value: c.name, label: c.name })))
        setEmployerOptions((employerData.categories ?? []).map((c: { name: string }) => ({ value: c.name, label: c.name })))
        setLocationOptions((locationData.categories ?? []).map((c: { name: string }) => ({ value: c.name, label: c.name })))
      })
    }
  }, [open])

  const [uploading, setUploading] = useState(false)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, etc.)")
      return
    }
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload/image", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      setImg(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  const displayPin = employee.pin ?? ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          employer,
          location,
          email: email.trim() || "",
          phone: phone.trim() || "",
          dob: dob.trim() || "",
          comment: comment.trim() || "",
          img: img || "",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to update employee")
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] rounded-lg">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Photo</FieldLabel>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    {img ? (
                      <>
                        <img src={img} alt="Preview" className="h-full w-full object-cover" decoding="async" />
                        <button
                          type="button"
                          onClick={() => setImg("")}
                          className="absolute top-0 right-0 p-1 bg-destructive text-destructive-foreground rounded-bl"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <UserCircle className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-emp-pin">PIN (for clock-in)</FieldLabel>
                <Input
                  id="edit-emp-pin"
                  value={displayPin}
                  readOnly
                  disabled
                  className="bg-muted opacity-70"
                />
                <p className="text-xs text-muted-foreground mt-1">PIN cannot be changed</p>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="edit-emp-name">Name *</FieldLabel>
                <Input
                  id="edit-emp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-emp-phone">Phone</FieldLabel>
                <Input
                  id="edit-emp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Roles</FieldLabel>
                <MultiSelect
                  options={roleOptions}
                  defaultValue={role}
                  onValueChange={setRole}
                  placeholder="Select roles..."
                  variant="secondary"
                  resetOnDefaultValueChange
                />
              </Field>
              <Field>
                <FieldLabel>Employers</FieldLabel>
                <MultiSelect
                  options={employerOptions}
                  defaultValue={employer}
                  onValueChange={setEmployer}
                  placeholder="Select employers..."
                  variant="secondary"
                  resetOnDefaultValueChange
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Locations</FieldLabel>
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
                <FieldLabel htmlFor="edit-emp-email">Email</FieldLabel>
                <Input
                  id="edit-emp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="edit-emp-dob">Date of Birth</FieldLabel>
                <Input
                  id="edit-emp-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-emp-comment">Comment</FieldLabel>
                <textarea
                  id="edit-emp-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Notes about employee..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  rows={3}
                />
              </Field>
            </div>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
