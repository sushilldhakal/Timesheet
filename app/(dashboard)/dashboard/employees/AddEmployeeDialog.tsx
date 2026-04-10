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
import { UserCircle, Upload, X, RefreshCw, User, Briefcase, Award, Zap } from "lucide-react"
import { useLocations } from "@/lib/queries/locations"
import { useRoles } from "@/lib/queries/roles"
import { useEmployers } from "@/lib/queries/employers"
import { useAwards } from "@/lib/queries/awards"
import { useCreateEmployee, useGeneratePin, useCheckPin } from "@/lib/queries/employees"
import { useUploadImage } from "@/lib/queries/upload"
import { useLocationRoles } from "@/lib/queries/locations"

type Props = {
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

export function AddEmployeeDialog({ open, onOpenChange, onSuccess }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  
  // Basic Information
  const [name, setName] = useState("")
  const [pin, setPin] = useState("")
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
  
  // Password setup
  const [password, setPassword] = useState("")
  const [sendSetupEmail, setSendSetupEmail] = useState(true)
  
  const [error, setError] = useState<string | null>(null)
  const [availableLevels, setAvailableLevels] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [generatingPin, setGeneratingPin] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const rolesQuery = useRoles()
  const employersQuery = useEmployers()
  const locationsQuery = useLocations()
  const awardsQuery = useAwards()
  const createEmployeeMutation = useCreateEmployee()
  const generatePinMutation = useGeneratePin()
  const uploadImageMutation = useUploadImage()
  
  // Get enabled roles for the first selected location
  const firstLocationId = useMemo(() => {
    if (location.length === 0) return null
    const firstLoc = locationsQuery.data?.locations?.find(c => c.name === location[0])
    return firstLoc?.id || null
  }, [location, locationsQuery.data?.locations])
  
  const locationRolesQuery = useLocationRoles(firstLocationId)

  const roleOptions = useMemo(() => {
    const allRoles = rolesQuery.data?.roles?.map((c: any) => ({ value: c.name, label: c.name, id: c.id || c._id })) || []
    
    // If no location selected, return all roles
    if (location.length === 0) return allRoles
    
    // If location selected, filter by enabled roles
    const enabledRoleIds = locationRolesQuery.data?.data?.roles?.map(r => r.roleId) || []
    if (enabledRoleIds.length === 0) return allRoles // Fallback to all if no data yet
    
    return allRoles.filter(role => enabledRoleIds.includes(role.id))
  }, [rolesQuery.data?.roles, location, locationRolesQuery.data])
  
  const employerOptions = useMemo(() => 
    employersQuery.data?.employers?.map((c: any) => ({ value: c.name, label: c.name })) || []
  , [employersQuery.data?.employers])
  
  const locationOptions = useMemo(() => 
    locationsQuery.data?.locations?.map((c: any) => ({ value: c.name, label: c.name, id: c._id })) || []
  , [locationsQuery.data?.locations])
  
  // Auto-assign if only one option available
  useEffect(() => {
    if (locationOptions.length === 1 && location.length === 0) {
      setLocation([locationOptions[0].value])
    }
  }, [locationOptions])
  
  useEffect(() => {
    if (employerOptions.length === 1 && employer.length === 0) {
      setEmployer([employerOptions[0].value])
    }
  }, [employerOptions])
  
  // Clear roles when location changes
  useEffect(() => {
    if (location.length > 0 && locationRolesQuery.data?.data?.roles) {
      const enabledRoleIds = locationRolesQuery.data.data.roles.map(r => r.roleId)
      
      // Filter out roles that are not enabled for the selected location
      setRole(prev => {
        const validRoles = prev.filter(roleName => {
          const roleData = rolesQuery.data?.roles?.find((c: any) => c.name === roleName) as any
          return roleData && enabledRoleIds.includes(roleData.id || roleData._id)
        })
        return validRoles
      })
    }
  }, [location, locationRolesQuery.data, rolesQuery.data])
  
  const awardOptions = useMemo(() => 
    awardsQuery.data?.awards?.map((a: any) => ({
      value: a._id,
      label: a.name,
      levels: a.levels?.map((l: any) => l.label) || []
    })) || []
  , [awardsQuery.data?.awards])

  // Update available levels when award changes
  useEffect(() => {
    const selectedAward = awardOptions.find(a => a.value === awardId)
    setAvailableLevels(selectedAward?.levels || [])
    setAwardLevel("") // Reset level when award changes
  }, [awardId, awardOptions])

  // When phone has 4+ digits, use last 4 as PIN
  useEffect(() => {
    const digits = phone.replace(/\D/g, "")
    if (digits.length >= 4) {
      setPin(digits.slice(-4))
    }
  }, [phone])

  const handleGeneratePin = async () => {
    setGeneratingPin(true)
    setError(null)
    try {
      const data = await generatePinMutation.mutateAsync()
      setPin(data.pin)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PIN")
    } finally {
      setGeneratingPin(false)
    }
  }

  const getEffectivePin = () =>
    phone.replace(/\D/g, "").length >= 4
      ? phone.replace(/\D/g, "").slice(-4)
      : pin

  const reset = () => {
    setCurrentStep(0)
    setName("")
    setPin("")
    setRole([])
    setEmployer([])
    setLocation([])
    setEmail("")
    setPhone("")
    setHomeAddress("")
    setDob("")
    setGender("")
    setComment("")
    setImg("")
    setEmploymentType("")
    setStandardHours(null)
    setAwardId("")
    setAwardLevel("")
    setPassword("")
    setSendSetupEmail(true)
    setError(null)
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
      const data = await uploadImageMutation.mutateAsync(file)
      setImg(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (quickCreate: boolean = false) => {
    setError(null)

    const finalPin = getEffectivePin()
    if (finalPin.length < 4) {
      setError("Enter phone (last 4 digits used as PIN) or click Generate")
      return
    }

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    try {
      await createEmployeeMutation.mutateAsync({
        name: name.trim(),
        pin: finalPin,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        homeAddress: homeAddress.trim() || undefined,
        dob: dob || undefined,
        gender: gender.trim(),
        comment: comment.trim() || undefined,
        role: role.length > 0 ? role : undefined,
        employer: employer.length > 0 ? employer : undefined,
        location: location.length > 0 ? location : undefined,
        employmentType: employmentType || undefined,
        standardHoursPerWeek: standardHours,
        awardId: awardId || undefined,
        awardLevel: awardLevel || undefined,
        profileImage: img || undefined,
        password: password.trim() || undefined,
        sendSetupEmail: !password.trim() && sendSetupEmail,
      })

      reset()
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee")
    }
  }

  const loading = createEmployeeMutation.isPending

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
      return name.trim().length > 0 && pin.length > 0
    }
    return true
  }

  // Check if Quick Create is enabled
  // Required: name, email, roles, location, awards, employer
  const canQuickCreate = () => {
    return (
      name.trim().length > 0 &&
      email.trim().length > 0 &&
      role.length > 0 &&
      location.length > 0 &&
      employer.length > 0 &&
      awardId.length > 0
    )
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) reset()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Add Employee</DialogTitle>
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
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* SVG Illustration */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-4 flex justify-center">
                <img
                  src={gender === "Female" ? "/female.svg" : "/male.svg"}
                  alt={gender === "Female" ? "Female" : "Male"}
                  className="h-64 w-auto"
                />
              </div>
              <h3 className="text-lg font-semibold">Add Employee</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Fill in the details to create a new employee profile
              </p>
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
              onSubmit={() => handleSubmit(false)}
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
                  <FieldLabel htmlFor="add-employee-name">Name *</FieldLabel>
                  <Input
                    id="add-employee-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Full name"
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="add-employee-pin">PIN (for clock-in) * {phone.replace(/\D/g, "").length >= 4 
                      ? "Using last 4 digits of phone number" 
                      : "Used for clock-in/out"}</FieldLabel>
                    {phone.replace(/\D/g, "").length >= 4 ? (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-primary text-primary-foreground">
                        From phone
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="add-employee-pin"
                      value={getEffectivePin()}
                      readOnly
                      placeholder={phone.replace(/\D/g, "").length >= 4 ? "" : "Click Generate"}
                      className="flex-1 bg-muted"
                    />
                    {phone.replace(/\D/g, "").length < 4 && (
                      <Button
                        type="button"
                        variant="default"
                        size="icon"
                        onClick={handleGeneratePin}
                        disabled={generatingPin}
                      >
                        <RefreshCw className={`h-4 w-4 ${generatingPin ? "animate-spin" : ""}`} />
                      </Button>
                    )}
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="add-employee-email">Email</FieldLabel>
                  <Input
                    id="add-employee-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="add-employee-phone">Phone</FieldLabel>
                  <Input
                    id="add-employee-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0412 345 678"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="add-employee-dob">Date of Birth</FieldLabel>
                  <Input
                    id="add-employee-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </Field>

                <Field> 
                  <FieldLabel htmlFor="add-employee-home-address">Gender</FieldLabel>
                  <select
                    id="add-employee-gender"
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
                  <FieldLabel htmlFor="add-employee-home-address">Home Address</FieldLabel>
                  <Input
                    id="add-employee-home-address"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="123 Main Street, Melbourne VIC 3000"
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="add-employee-comment">Comments / Notes</FieldLabel>
                  <textarea
                    id="add-employee-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Notes about employee..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    rows={2}
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

              {/* Web Access Setup */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-3">Web Access Setup</h3>
                <div className="space-y-4">
                  <Field>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="add-emp-send-setup"
                        checked={sendSetupEmail}
                        onChange={(e) => {
                          setSendSetupEmail(e.target.checked)
                          if (e.target.checked) setPassword("")
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <FieldLabel htmlFor="add-emp-send-setup" className="mb-0 cursor-pointer">
                        Send password setup email
                      </FieldLabel>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      Employee will receive an email with a link to set their own password (expires in 24 hours)
                    </p>
                  </Field>

                  {!sendSetupEmail && (
                    <Field>
                      <FieldLabel htmlFor="add-emp-password">Initial Password</FieldLabel>
                      <Input
                        id="add-emp-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        minLength={8}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Employee will be required to change this password on first login
                      </p>
                    </Field>
                  )}
                </div>
              </div>
            </FieldGroup>
          )}

          {/* Step 3: Employment Details */}
          {currentStep === 2 && (
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="add-employee-award">Award</FieldLabel>
                  <select
                    id="add-employee-award"
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
                  <FieldLabel htmlFor="add-employee-award-level">Award Level</FieldLabel>
                  <select
                    id="add-employee-award-level"
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
                  <FieldLabel htmlFor="add-employee-employment-type">Employment Type</FieldLabel>
                  <select
                    id="add-employee-employment-type"
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
                  <FieldLabel htmlFor="add-employee-hours">Standard Hours per Week</FieldLabel>
                  <Input
                    id="add-employee-hours"
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

              {/* Quick Create Button */}
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Quick Create</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Save with minimal information and send an email invite to the employee to complete their profile later.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleSubmit(true)}
                      disabled={!canQuickCreate() || loading}
                      className="w-full sm:w-auto"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {loading ? "Creating..." : "Quick Create & Send Invite"}
                    </Button>
                    {!canQuickCreate() && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Required: Name, Email, Roles, Locations, Employers, and Award
                      </p>
                    )}
                  </div>
                </div>
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
