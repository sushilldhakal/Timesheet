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
import { UserCircle, Upload, X, RefreshCw } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddEmployeeDialog({ open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [pin, setPin] = useState("")
  const [role, setRole] = useState<string[]>([])
  const [employer, setEmployer] = useState<string[]>([])
  const [location, setLocation] = useState<string[]>([])
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [comment, setComment] = useState("")
  const [img, setImg] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([])
  const [employerOptions, setEmployerOptions] = useState<{ value: string; label: string }[]>([])
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const reset = () => {
    setName("")
    setPin("")
    setRole([])
    setEmployer([])
    setLocation([])
    setEmail("")
    setPhone("")
    setDob("")
    setComment("")
    setImg("")
    setError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const [uploading, setUploading] = useState(false)
  const [generatingPin, setGeneratingPin] = useState(false)

  // When phone has 4+ digits, use last 4 as PIN
  useEffect(() => {
    const digits = phone.replace(/\D/g, "")
    if (digits.length >= 4) setPin(digits.slice(-4))
  }, [phone])

  const handleGeneratePin = async () => {
    setGeneratingPin(true)
    setError(null)
    try {
      const res = await fetch("/api/employees/generate-pin")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate PIN")
      setPin(data.pin)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PIN")
    } finally {
      setGeneratingPin(false)
    }
  }

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

  const getEffectivePin = () =>
    phone.replace(/\D/g, "").length >= 4
      ? phone.replace(/\D/g, "").slice(-4)
      : pin

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalPin = getEffectivePin()
    if (finalPin.length < 4) {
      setError("Enter phone (last 4 digits used as PIN) or click Generate")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          pin: finalPin,
          role,
          employer,
          location,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          dob: dob.trim() || undefined,
          comment: comment.trim() || undefined,
          img: img || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to create employee")
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

  const effectivePin = getEffectivePin()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] rounded-lg">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
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
                <div className="flex items-center justify-between gap-2 relative">
                  <FieldLabel htmlFor="add-emp-pin">PIN (for clock-in) *</FieldLabel>
                  {phone.replace(/\D/g, "").length >= 4 ? (
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground absolute right-1 top-9">
                      From phone
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      disabled={generatingPin}
                      onClick={handleGeneratePin}
                      className="h-7 absolute right-1 top-8"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generatingPin ? "animate-spin" : ""}`} />
                      {generatingPin ? "Generating..." : "Generate"}
                    </Button>
                  )}
                </div>
                <Input
                  id="add-emp-pin"
                  value={effectivePin}
                  readOnly
                  placeholder={phone.replace(/\D/g, "").length >= 4 ? "" : "Click Generate above"}
                  className="bg-muted mt-1"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="add-emp-name">Name *</FieldLabel>
                <Input
                  id="add-emp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-emp-phone">Phone</FieldLabel>
                <Input
                  id="add-emp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number (last 4 digits → PIN)"
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
                <FieldLabel htmlFor="add-emp-email">Email</FieldLabel>
                <Input
                  id="add-emp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="add-emp-dob">Date of Birth</FieldLabel>
                <Input
                  id="add-emp-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-emp-comment">Comment</FieldLabel>
                <textarea
                  id="add-emp-comment"
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
