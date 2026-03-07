"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { MultiStepForm } from "@/components/ui/multi-step-form"
import { UserCircle, Upload, X, User, Briefcase, Award } from "lucide-react"
import { useCategoriesByType } from "@/lib/queries/categories"
import { useAwards } from "@/lib/queries/awards"
import { useUpdateEmployee } from "@/lib/queries/employees"
import { useUploadImage } from "@/lib/queries/upload"
import { useLocationRoles } from "@/lib/queries/locations"
import type { Employee } from "@/lib/api/employees"

type EmployeeRow = Employee

type Props = {
  employee: EmployeeRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const STEPS = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Personal details",
    icon: <User className="size-4" />,
  },
  {
    id: "work",
    title: "Work Assignment",
    description: "Roles & locations",
    icon: <Briefcase className="size-4" />,
  },
  {
    id: "employment",
    title: "Employment Details",
    description: "Awards & hours",
    icon: <Award className="size-4" />,
  },
]

export function EditEmployeeDialog({ employee, open, onOpenChange, onSuccess }: Props) {
  const unique = (values: string[] | undefined | null) =>
    Array.from(new Set(values ?? []))

  const [currentStep, setCurrentStep] = useState(0)
  
  // Basic Information
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [homeAddress, setHomeAddress] = useState("")
  const [gender, setGender] = useState("")
  const [comment, setComment] = useState("")
  const [img, setImg] = useState("")
  
  // Work Assignment
  const [role, setRole] = useState<string[]>([])
  const [employer, setEmployer] = useState<string[]>([])
  const [location, setLocation] = useState<string[]>([])
  
  // Employment Details
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
  
  // Get enabled roles for the first selected location
  const firstLocationId = useMemo(() => {
    if (location.length === 0) return null
    const firstLoc = locationsQuery.data?.categories?.find(c => c.name === location[0])
    return firstLoc?.id || null
  }, [location, locationsQuery.data?.categories])
  
  const locationRolesQuery = useLocationRoles(firstLocationId)

  const roleOptions = useMemo(() => {
    const allRoles = rolesQuery.data?.categories?.map((c: any, index) => ({
      value: c.name,
      label: c.name,
      id: c.id || c._id || `role-${index}`
    })) || []
    
    // If no location selected, return all roles
    if (location.length === 0) return allRoles
    
    // If location selected, filter by enabled roles
    const enabledRoleIds = locationRolesQuery.data?.data?.roles?.map(r => r.roleId) || []
    if (enabledRoleIds.length === 0) return allRoles // Fallback to all if no data yet
    
    return allRoles.filter(role => enabledRoleIds.includes(role.id))
  }, [rolesQuery.data?.categories, location, locationRolesQuery.data])

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
    awardsQuery.data?.awards?.map((a: any) => ({
      value: a._id || a.id,
      label: a.name,
      levels: a.levels?.map((l: any) => typeof l === 'string' ? l : l.label) || []
    })) || []
  , [awardsQuery.data?.awards])

  const displayPin = employee.pin ?? ""

  console.log("this is edit dialog", employee)

  // Initialize all fields from employee data when dialog opens or employee changes
  useEffect(() => {
    if (open && employee) {
      console.log('[EditEmployeeDialog] Loading employee data:', {
        homeAddress: employee.homeAddress,
        gender: employee.gender,
        awardId: employee.award?.id,
        awardLevel: employee.award?.level,
        employmentType: employee.employmentType,
        standardHours: employee.standardHoursPerWeek
      })
      
      setName(employee.name)
      setEmail(employee.email ?? "")
      setPhone(employee.phone ?? "")
      setDob(employee.dob ?? "")
      setHomeAddress(employee.homeAddress ?? "")
      setGender(employee.gender ?? "")
      setComment(employee.comment ?? "")
      setImg(employee.img ?? "")
      
      setRole(unique(employee.roles?.map(r => r.role.name)))
      setEmployer(unique(employee.employers?.map(e => e.name)))
      setLocation(unique(employee.locations?.map(l => l.name)))
      
      setStandardHours(employee.standardHoursPerWeek ?? null)
      setEmploymentType(employee.employmentType ?? "")
      setAwardId(employee.award?.id ?? "")
      setAwardLevel(employee.award?.level ?? "")
      
      console.log('[EditEmployeeDialog] State set:', {
        homeAddress: employee.homeAddress ?? "",
        gender: employee.gender ?? "",
        awardId: employee.award?.id ?? "",
        awardLevel: employee.award?.level ?? "",
        employmentType: employee.employmentType ?? "",
        standardHours: employee.standardHoursPerWeek ?? null
      })
    }
  }, [open, employee.id]) // Use employee.id instead of employee to avoid reference issues

  // Stabilize options to prevent infinite loops
  useEffect(() => {
    if (roleOptions.length > 0) {
      const roleValues = new Set(roleOptions.map(o => o.value))
      setRole(prev => {
        const filtered = prev.filter(r => roleValues.has(r))
        // Only update if values actually changed
        if (filtered.length !== prev.length || !filtered.every((v, i) => v === prev[i])) {
          return filtered
        }
        return prev
      })
    }
    if (employerOptions.length > 0) {
      const employerValues = new Set(employerOptions.map(o => o.value))
      setEmployer(prev => {
        const filtered = prev.filter(e => employerValues.has(e))
        if (filtered.length !== prev.length || !filtered.every((v, i) => v === prev[i])) {
          return filtered
        }
        return prev
      })
    }
    if (locationOptions.length > 0) {
      const locationValues = new Set(locationOptions.map(o => o.value))
      setLocation(prev => {
        const filtered = prev.filter(l => locationValues.has(l))
        if (filtered.length !== prev.length || !filtered.every((v, i) => v === prev[i])) {
          return filtered
        }
        return prev
      })
    }
  }, [roleOptions, employerOptions, locationOptions])
  
  // Clear roles when location changes and filter by enabled roles
  useEffect(() => {
    if (location.length > 0 && locationRolesQuery.data) {
      const enabledRoleIds = locationRolesQuery.data.data.roles.map(r => r.roleId)
      
      // Filter out roles that are not enabled for the selected location
      setRole(prev => {
        const validRoles = prev.filter(roleName => {
          const roleData = rolesQuery.data?.categories?.find((c: any) => c.name === roleName) as any
          return roleData && enabledRoleIds.includes(roleData.id || roleData._id)
        })
        return validRoles
      })
    }
  }, [location, locationRolesQuery.data, rolesQuery.data])

  // Update available levels when award changes
  useEffect(() => {
    const selectedAward = awardOptions.find(a => a.value === awardId)
    setAvailableLevels(selectedAward?.levels || [])
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

  const handleSubmit = async () => {
    setError(null)

    try {
      await updateEmployeeMutation.mutateAsync({
        id: employee.id,
        data: {
          name: name.trim(),
          role: role.length > 0 ? role : undefined,
          employer: employer.length > 0 ? employer : undefined,
          location: location.length > 0 ? location : undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          dob: dob || undefined,
          homeAddress: homeAddress.trim() || undefined,
          gender: gender.trim(),
          comment: comment.trim() || undefined,
          profileImage: img || undefined,
          employmentType: employmentType || undefined,
          standardHoursPerWeek: standardHours,
          awardId: awardId || undefined,
          awardLevel: awardLevel || undefined,
        }
      })

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const loading = updateEmployeeMutation.isPending

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canGoNext = () => {
    if (currentStep === 0) {
      return name.trim().length > 0
    }
    return true
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>
        <div className="flex h-full">
          {/* Left Column - Illustration */}
          <div className="hidden lg:flex lg:w-1/4 bg-muted flex-col items-center justify-start p-6 space-y-6">
            {/* Profile Photo Upload - Always visible */}
            <div className="w-full">
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-32 w-32 rounded-full overflow-hidden bg-background flex items-center justify-center flex-shrink-0 border-4 border-background shadow-lg">
                  {img ? (
                    <>
                      <img src={img} alt="Preview" className="h-full w-full object-cover" decoding="async" />
                      <button
                        type="button"
                        onClick={() => setImg("")}
                        className="absolute top-0 right-0 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <UserCircle className="h-20 w-20 text-muted-foreground" />
                  )}
                </div>
                <div className="w-full">
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
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Change Photo"}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* SVG Illustration or Employee Info */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-4 flex justify-center">
                <img
                  src={gender === "Female" ? "/female.svg" : "/male.svg"}
                  alt={gender === "Female" ? "Female" : "Male"}
                  className="h-64 w-auto"
                />
              </div>
              <h3 className="text-lg font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground mt-1">PIN: {displayPin}</p>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="flex-1 lg:w-3/4 overflow-y-auto p-6 flex items-center">
            <div className="w-full">
            <MultiStepForm
              steps={STEPS}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSubmit={handleSubmit}
              canGoNext={canGoNext()}
              canGoPrevious={true}
              isLastStep={currentStep === STEPS.length - 1}
              isSubmitting={loading}
            >
          {/* Step 1: Basic Information */}
          {currentStep === 0 && (
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="edit-employee-name">Name *</FieldLabel>
                  <Input
                    id="edit-employee-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Full name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-employee-email">Email</FieldLabel>
                  <Input
                    id="edit-employee-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-employee-phone">Phone</FieldLabel>
                  <Input
                    id="edit-employee-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0412 345 678"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-employee-dob">Date of Birth</FieldLabel>
                  <Input
                    id="edit-employee-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-employee-home-address">Home Address</FieldLabel>
                  <Input
                    id="edit-employee-home-address"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="123 Main Street, Melbourne VIC 3000"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-employee-gender">Gender</FieldLabel>
                  <select
                    id="edit-employee-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="edit-employee-comment">Comments / Notes</FieldLabel>
                  <textarea
                    id="edit-employee-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Notes about employee..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    rows={3}
                  />
                </Field>
              </div>
            </FieldGroup>
          )}

          {/* Step 2: Work Assignment */}
          {currentStep === 1 && (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Locations *</FieldLabel>
                <MultiSelect
                  options={locationOptions}
                  onValueChange={setLocation}
                  defaultValue={location}
                  placeholder="Select locations..."
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select location first to filter available roles
                </p>
              </Field>

              <Field>
                <FieldLabel>Roles</FieldLabel>
                <MultiSelect
                  options={roleOptions}
                  onValueChange={setRole}
                  defaultValue={role}
                  placeholder={location.length === 0 ? "Select location first..." : "Select roles..."}
                  disabled={loading || location.length === 0}
                />
                {location.length > 0 && roleOptions.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No roles enabled for this location. Please enable roles in Location settings.
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel>Employers</FieldLabel>
                <MultiSelect
                  options={employerOptions}
                  onValueChange={setEmployer}
                  defaultValue={employer}
                  placeholder="Select employers..."
                  disabled={loading}
                />
              </Field>
            </FieldGroup>
          )}

          {/* Step 3: Employment Details */}
          {currentStep === 2 && (
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="edit-employee-award">Award</FieldLabel>
                  <select
                    id="edit-employee-award"
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
                  <FieldLabel htmlFor="edit-employee-award-level">Award Level</FieldLabel>
                  <select
                    id="edit-employee-award-level"
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

                <Field>
                  <FieldLabel htmlFor="edit-employee-employment-type">Employment Type</FieldLabel>
                  <select
                    id="edit-employee-employment-type"
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

                <Field>
                  <FieldLabel htmlFor="edit-employee-hours">Standard Hours per Week</FieldLabel>
                  <Input
                    id="edit-employee-hours"
                    type="number"
                    min={0}
                    max={168}
                    step={0.5}
                    value={standardHours ?? ""}
                    onChange={(e) => setStandardHours(e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 38"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Target working hours (used in roster generation)</p>
                </Field>
              </div>
            </FieldGroup>
          )}

          {error && <FieldError>{error}</FieldError>}
        </MultiStepForm>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
