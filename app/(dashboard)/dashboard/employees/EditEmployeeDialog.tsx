"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { useCategoriesByType } from "@/lib/queries/categories"
import { useAwards } from "@/lib/queries/awards"
import { useUpdateEmployee } from "@/lib/queries/employees"
import { useUploadImage } from "@/lib/queries/upload"
import type { Employee } from "@/lib/api/employees"

type EmployeeRow = Employee

type Props = {
  employee: EmployeeRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditEmployeeDialog({ employee, open, onOpenChange, onSuccess }: Props) {
  const unique = (values: string[] | undefined | null) =>
    Array.from(new Set(values ?? []))

  const [name, setName] = useState(employee.name)
  // Extract role names from roles array
  const [role, setRole] = useState<string[]>(
    unique(employee.roles?.map(r => r.role.name))
  )
  // Extract employer names from employers array
  const [employer, setEmployer] = useState<string[]>(
    unique(employee.employers?.map(e => e.name))
  )
  // Extract location names from locations array
  const [location, setLocation] = useState<string[]>(
    unique(employee.locations?.map(l => l.name))
  )
  const [email, setEmail] = useState(employee.email ?? "")
  const [phone, setPhone] = useState(employee.phone ?? "")
  const [dob, setDob] = useState(employee.dob ?? "")
  const [comment, setComment] = useState(employee.comment ?? "")
  const [img, setImg] = useState(employee.img ?? "")
  const [standardHours, setStandardHours] = useState<number | null>(null)
  const [employmentType, setEmploymentType] = useState<string>("")
  const [awardId, setAwardId] = useState<string>("")
  const [awardLevel, setAwardLevel] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [availableLevels, setAvailableLevels] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const rolesQuery = useCategoriesByType("role")
  const employersQuery = useCategoriesByType("employer")
  const locationsQuery = useCategoriesByType("location")
  const awardsQuery = useAwards()
  const updateEmployeeMutation = useUpdateEmployee()
  const uploadImageMutation = useUploadImage()

  const roleOptions = useMemo(() => 
    rolesQuery.data?.categories?.map((c: any, index) => ({
      value: c.name,
      label: c.name,
      id: c._id || c.id || `role-${index}` // Use _id if available, otherwise fallback to index
    })) || []
  , [rolesQuery.data?.categories])

  const employerOptions = useMemo(() => 
    employersQuery.data?.categories?.map((c: any, index) => ({
      value: c.name,
      label: c.name,
      id: c._id || c.id || `employer-${index}`
    })) || []
  , [employersQuery.data?.categories])

  const locationOptions = useMemo(() => 
    locationsQuery.data?.categories?.map((c: any, index) => ({
      value: c.name,
      label: c.name,
      id: c._id || c.id || `location-${index}`
    })) || []
  , [locationsQuery.data?.categories])

  const awardOptions = useMemo(() => 
    awardsQuery.data?.awards?.map((a) => ({
      value: a._id,
      label: a.name,
      levels: a.levels?.map((l) => l.label) || []
    })) || []
  , [awardsQuery.data?.awards])

  useEffect(() => {
    if (open && employee) {
      setName(employee.name)
      // Extract names from the new structure
      setRole(unique(employee.roles?.map(r => r.role.name)))
      setEmployer(unique(employee.employers?.map(e => e.name)))
      setLocation(unique(employee.locations?.map(l => l.name)))
      setEmail(employee.email ?? "")
      setPhone(employee.phone ?? "")
      setDob(employee.dob ?? "")
      setComment(employee.comment ?? "")
      setImg(employee.img ?? "")

      // Fetch employee's full details - this will be replaced with a proper hook later
      fetch(`/api/employees/${employee.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.employee) {
            setStandardHours(data.employee.standardHoursPerWeek ?? null)
            setEmploymentType(data.employee.employmentType ?? "")
            setAwardId(data.employee.award?.id ?? "")
            setAwardLevel(data.employee.award?.level ?? "")
          }
        })
        .catch(() => {})
    }
  }, [open, employee])

  // Filter options based on available data
  useEffect(() => {
    if (roleOptions.length > 0) {
      const roleValues = new Set(roleOptions.map(o => o.value))
      setRole(prev => prev.filter(r => roleValues.has(r)))
    }
    if (employerOptions.length > 0) {
      const employerValues = new Set(employerOptions.map(o => o.value))
      setEmployer(prev => prev.filter(e => employerValues.has(e)))
    }
    if (locationOptions.length > 0) {
      const locationValues = new Set(locationOptions.map(o => o.value))
      setLocation(prev => prev.filter(l => locationValues.has(l)))
    }
  }, [roleOptions, employerOptions, locationOptions])

  // Update available levels when award changes
  useEffect(() => {
    const selectedAward = awardOptions.find(a => a.value === awardId)
    setAvailableLevels(selectedAward?.levels || [])
    // Don't reset level when award changes in edit mode - keep existing level if valid
  }, [awardId, awardOptions])

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
      const data = await uploadImageMutation.mutateAsync(file)
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

    try {
      await updateEmployeeMutation.mutateAsync({
        id: employee.id,
        data: {
          name: name.trim(),
          role: role.length > 0 ? role.join(", ") : undefined,
          employer: employer.length > 0 ? employer.join(", ") : undefined,
          location: location.length > 0 ? location.join(", ") : undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          profileImage: img || undefined,
        }
      })

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const loading = updateEmployeeMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update employee details. PIN: <strong>{displayPin}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="edit-employee-name">Name *</FieldLabel>
              <Input
                id="edit-employee-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="edit-employee-email">Email</FieldLabel>
                <Input
                  id="edit-employee-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@company.com"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-employee-phone">Phone</FieldLabel>
                <Input
                  id="edit-employee-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0412 345 678"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Role</FieldLabel>
              <MultiSelect
                options={roleOptions}
                onValueChange={setRole}
                defaultValue={role}
                placeholder="Select roles..."
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel>Employer</FieldLabel>
              <MultiSelect
                options={employerOptions}
                onValueChange={setEmployer}
                defaultValue={employer}
                placeholder="Select employers..."
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel>Location</FieldLabel>
              <MultiSelect
                options={locationOptions}
                onValueChange={setLocation}
                defaultValue={location}
                placeholder="Select locations..."
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel>Profile Image</FieldLabel>
              <div className="flex items-center gap-4">
                {img ? (
                  <div className="relative">
                    <img
                      src={img}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setImg("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                    <UserCircle className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Change Image"}
                  </Button>
                </div>
              </div>
            </Field>

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
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
