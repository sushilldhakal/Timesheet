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
  const [employmentType, setEmploymentType] = useState<string>("")
  const [standardHours, setStandardHours] = useState<number | null>(null)
  const [awardId, setAwardId] = useState<string>("")
  const [awardLevel, setAwardLevel] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([])
  const [employerOptions, setEmployerOptions] = useState<{ value: string; label: string }[]>([])
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([])
  const [awardOptions, setAwardOptions] = useState<{ value: string; label: string; levels: string[] }[]>([])
  const [availableLevels, setAvailableLevels] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch(`/api/categories?type=${CATEGORY_TYPES.ROLE}`).then((r) => (r.ok ? r.json() : { categories: [] })),
        fetch(`/api/categories?type=${CATEGORY_TYPES.EMPLOYER}`).then((r) => (r.ok ? r.json() : { categories: [] })),
        fetch(`/api/categories?type=${CATEGORY_TYPES.LOCATION}`).then((r) => (r.ok ? r.json() : { categories: [] })),
        fetch('/api/awards').then((r) => (r.ok ? r.json() : { awards: [] })),
      ]).then(([roleData, employerData, locationData, awardsData]) => {
        setRoleOptions((roleData.categories ?? []).map((c: { name: string }) => ({ value: c.name, label: c.name })))
        setEmployerOptions((employerData.categories ?? []).map((c: { name: string }) => ({ value: c.name, label: c.name })))
        setLocationOptions((locationData.categories ?? []).map((c: { name: string }) => ({ value: c.name, label: c.name })))
        setAwardOptions((awardsData.awards ?? []).map((a: any) => ({
          value: a._id,
          label: a.name,
          levels: a.levels?.map((l: any) => l.label) || []
        })))
      })
    }
  }, [open])

  // Update available levels when award changes
  useEffect(() => {
    const selectedAward = awardOptions.find(a => a.value === awardId)
    setAvailableLevels(selectedAward?.levels || [])
    setAwardLevel("") // Reset level when award changes
  }, [awardId, awardOptions])

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
    setEmploymentType("")
    setStandardHours(null)
    setAwardId("")
    setAwardLevel("")
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
    if (digits.length >= 4) {
      // Try last 4 digits first
      setPin(digits.slice(-4))
    }
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

  // Function to find available PIN from phone number
  const findAvailablePin = async (phoneDigits: string): Promise<string | null> => {
    if (phoneDigits.length < 4) return null
    
    // Try different 4-digit combinations from the phone number
    const attempts = []
    
    // Last 4 digits
    if (phoneDigits.length >= 4) {
      attempts.push(phoneDigits.slice(-4))
    }
    
    // Second-to-last 4 digits (skip last digit)
    if (phoneDigits.length >= 5) {
      attempts.push(phoneDigits.slice(-5, -1))
    }
    
    // Third attempt (skip last 2 digits)
    if (phoneDigits.length >= 6) {
      attempts.push(phoneDigits.slice(-6, -2))
    }
    
    // Fourth attempt (skip last 3 digits)
    if (phoneDigits.length >= 7) {
      attempts.push(phoneDigits.slice(-7, -3))
    }
    
    // Try each PIN
    for (const testPin of attempts) {
      try {
        const res = await fetch(`/api/employees/check-pin?pin=${testPin}`)
        const data = await res.json()
        if (data.available) {
          return testPin
        }
      } catch {
        // Continue to next attempt
      }
    }
    
    return null
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
    let finalPin = getEffectivePin()
    
    if (finalPin.length < 4) {
      setError("Enter phone (last 4 digits used as PIN) or click Generate")
      return
    }
    
    setError(null)
    setLoading(true)
    
    try {
      // If using phone-derived PIN, check if it's available and find alternative if needed
      const phoneDigits = phone.replace(/\D/g, "")
      if (phoneDigits.length >= 4 && finalPin === phoneDigits.slice(-4)) {
        const availablePin = await findAvailablePin(phoneDigits)
        if (availablePin) {
          finalPin = availablePin
          setPin(availablePin) // Update the displayed PIN
        } else {
          // If no phone-based PIN available, generate a random one
          try {
            const res = await fetch("/api/employees/generate-pin")
            const data = await res.json()
            if (res.ok && data.pin) {
              finalPin = data.pin
              setPin(data.pin)
            }
          } catch {
            setError("Could not find available PIN from phone number. Please use Generate button.")
            setLoading(false)
            return
          }
        }
      }
      
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
          employmentType: employmentType || undefined,
          standardHoursPerWeek: standardHours,
          awardId: awardId || undefined,
          awardLevel: awardLevel || undefined,
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] rounded-lg"  onInteractOutside={(e) => {
          e.preventDefault();
        }}>
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
                <FieldLabel htmlFor="add-emp-employment-type">Employment Type</FieldLabel>
                <select
                  id="add-emp-employment-type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select type...</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Casual">Casual</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="add-emp-hours">Standard Hours per Week</FieldLabel>
                <Input
                  id="add-emp-hours"
                  type="number"
                  min={0}
                  max={168}
                  step={0.5}
                  value={standardHours ?? ""}
                  onChange={(e) => setStandardHours(e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 38"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Target working hours (used in roster generation)
                </p>
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
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="add-emp-award">Award</FieldLabel>
                <select
                  id="add-emp-award"
                  value={awardId}
                  onChange={(e) => setAwardId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select award...</option>
                  {awardOptions.map((award) => (
                    <option key={award.value} value={award.value}>
                      {award.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="add-emp-award-level">Award Level</FieldLabel>
                <select
                  id="add-emp-award-level"
                  value={awardLevel}
                  onChange={(e) => setAwardLevel(e.target.value)}
                  disabled={!awardId || availableLevels.length === 0}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">Select level...</option>
                  {availableLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
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
