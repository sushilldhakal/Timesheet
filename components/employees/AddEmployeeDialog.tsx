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
import { MultiSelect } from "@/components/ui/multi-select"
import { MultiStepForm } from "@/components/ui/multi-step-form"
import { UserCircle, Upload, X, RefreshCw, User, Briefcase, Award, Zap } from "lucide-react"
import { useLocations, useLocationTeams } from "@/lib/queries/locations"
import { useTeams } from "@/lib/queries/teams"
import { useEmployers } from "@/lib/queries/employers"
import { useAwards } from "@/lib/queries/awards"
import { useCreateEmployee, useGeneratePin } from "@/lib/queries/employees"
import { useUploadImage } from "@/lib/queries/upload"

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
    description: "Teams & locations",
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
  const [team, setTeam] = useState<string[]>([])
  const [employer, setEmployer] = useState<string[]>([])
  const [location, setLocation] = useState<string[]>([])
  const [locationTeamAssignments, setLocationTeamAssignments] = useState<Array<{ location: string; team: string }>>([])
  
  // Employment Details
  const [standardHours, setStandardHours] = useState<number | null>(null)
  const [employmentType, setEmploymentType] = useState<string>("")
  const [awardId, setAwardId] = useState<string>("")
  const [awardLevel, setAwardLevel] = useState<string>("")
  
  // Compliance
  const [requiresCompliance, setRequiresCompliance] = useState(false)
  
  // Certifications (structured)
  const [certifications, setCertifications] = useState<Array<{
    type: 'wwcc' | 'police_check' | 'food_safety' | 'rsa' | 'other'
    label?: string
    required: boolean
  }>>([])
  const [otherCertLabel, setOtherCertLabel] = useState("")
  
  // Password setup
  const [password, setPassword] = useState("")
  const [sendSetupEmail, setSendSetupEmail] = useState(true)
  
  const [error, setError] = useState<string | null>(null)
  const [availableLevels, setAvailableLevels] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [generatingPin, setGeneratingPin] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const teamsQuery = useTeams()
  const employersQuery = useEmployers()
  const locationsQuery = useLocations()
  const awardsQuery = useAwards()
  const createEmployeeMutation = useCreateEmployee()
  const generatePinMutation = useGeneratePin()
  const uploadImageMutation = useUploadImage()
  
  // Get enabled Teams for the first selected location
  const firstLocationId = useMemo(() => {
    if (location.length === 0) return null
    const firstLoc = locationsQuery.data?.locations?.find(c => c.name === location[0])
    return firstLoc?.id || null
  }, [location, locationsQuery.data?.locations])
  
  const locationTeamsQuery = useLocationTeams(firstLocationId)

  const teamOptions = useMemo(() => {
    const allTeams = teamsQuery.data?.teams?.map((c: any) => ({ value: c.name, label: c.name, id: c.id || c._id })) || []
    
    if (location.length === 0) return allTeams
    
    const enabledTeamIds = locationTeamsQuery.data?.teams?.map((t) => t.teamId) || []
    if (enabledTeamIds.length === 0) return allTeams
    
    return allTeams.filter((team) => enabledTeamIds.includes(team.id))
  }, [teamsQuery.data?.teams, location, locationTeamsQuery.data])
  
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
  
  // Initialize locationTeamAssignments when locations change
  useEffect(() => {
    if (location.length > 1) {
      // Multi-location: initialize per-location assignments
      setLocationTeamAssignments(
        location.map((loc) => {
          const existing = locationTeamAssignments.find((a) => a.location === loc)
          return existing || { location: loc, team: "" }
        })
      )
    } else {
      // Single location: clear per-location assignments
      setLocationTeamAssignments([])
    }
  }, [location])
  
  useEffect(() => {
    if (employerOptions.length === 1 && employer.length === 0) {
      setEmployer([employerOptions[0].value])
    }
  }, [employerOptions])
  
  useEffect(() => {
    if (location.length > 0 && locationTeamsQuery.data?.teams) {
      const enabledTeamIds = locationTeamsQuery.data.teams.map((t) => t.teamId)
      
      setTeam((prev) => {
        const validTeams = prev.filter((teamName) => {
          const teamData = teamsQuery.data?.teams?.find((c: any) => c.name === teamName) as any
          return teamData && enabledTeamIds.includes(teamData.id || teamData._id)
        })
        return validTeams
      })
    }
  }, [location, locationTeamsQuery.data, teamsQuery.data])
  
  const awardOptions = useMemo(() => 
    awardsQuery.data?.awards?.map((a: any) => ({
      value: a._id,
      label: a.name,
      // Derive unique levels from levelRates (no dependency on legacy a.levels)
      levels: [...new Set((a.levelRates || []).map((r: any) => r.level))] as string[]
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
    setEmail("")
    setPhone("")
    setComment("")
    setImg("")
    setTeam([])
    setEmployer([])
    setLocation([])
    setLocationTeamAssignments([])
    setStandardHours(null)
    setEmploymentType("")
    setAwardId("")
    setAwardLevel("")
    setCertifications([])
    setOtherCertLabel("")
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

  const handleSubmit = async (_quickCreate: boolean = false) => {
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
        team: location.length === 1 ? team : undefined, // Only for single location
        employer: employer.length > 0 ? employer : undefined,
        location: location.length > 0 ? location : undefined,
        locationTeamAssignments: location.length > 1 ? locationTeamAssignments.filter(a => a.team) : undefined,
        employmentType: employmentType || undefined,
        standardHoursPerWeek: standardHours,
        awardId: awardId || undefined,
        awardLevel: awardLevel || undefined,
        certifications: certifications.length > 0
            ? certifications.map(c => ({ type: c.type, label: c.label, required: c.required, provided: false }))
            : undefined,
        profileImage: img || undefined,
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
  // Required: name, email, teams, location, awards, employer
  const canQuickCreate = () => {
    return (
      name.trim().length > 0 &&
      email.trim().length > 0 &&
      team.length > 0 &&
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
                <div className="relative h-32 w-32 rounded-full overflow-hidden bg-background flex items-center justify-center shrink-0 border-4 border-background shadow-lg">
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
                  src="/male.svg"
                  alt="Employee"
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
                  Select location first to filter available teams
                </p>
              </Field>

              {location.length === 1 ? (
                // Single location: show team multi-select
                <Field>
                  <FieldLabel>Teams</FieldLabel>
                  <MultiSelect
                    options={teamOptions}
                    onValueChange={setTeam}
                    defaultValue={team}
                    placeholder="Select teams..."
                    disabled={loading}
                  />
                  {location.length > 0 && teamOptions.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No teams enabled for this location. Please enable teams in Location settings.
                    </p>
                  )}
                </Field>
              ) : location.length > 1 ? (
                // Multiple locations: show per-location team table
                <Field>
                  <FieldLabel>Team per Location *</FieldLabel>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Location</th>
                          <th className="text-left p-3 font-medium">Team</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locationTeamAssignments.map((assignment, index) => (
                          <tr key={assignment.location} className="border-t">
                            <td className="p-3">{assignment.location}</td>
                            <td className="p-3">
                              <select
                                value={assignment.team}
                                onChange={(e) => {
                                  const updated = [...locationTeamAssignments]
                                  updated[index].team = e.target.value
                                  setLocationTeamAssignments(updated)
                                }}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                disabled={loading}
                              >
                                <option value="">Select team...</option>
                                {teamOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assign a team for each location. This allows different roles at different sites.
                  </p>
                </Field>
              ) : null}

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

              {/* Compliance Certifications */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-3">Required Compliance Certifications</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Select which certifications this employee must provide during onboarding
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cert-wwcc"
                      checked={certifications.some(c => c.type === 'wwcc')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCertifications([...certifications, { type: 'wwcc', required: true }])
                        } else {
                          setCertifications(certifications.filter(c => c.type !== 'wwcc'))
                        }
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <FieldLabel htmlFor="cert-wwcc" className="mb-0 cursor-pointer">
                      Working with Children Check (WWCC)
                    </FieldLabel>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cert-police"
                      checked={certifications.some(c => c.type === 'police_check')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCertifications([...certifications, { type: 'police_check', required: true }])
                        } else {
                          setCertifications(certifications.filter(c => c.type !== 'police_check'))
                        }
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <FieldLabel htmlFor="cert-police" className="mb-0 cursor-pointer">
                      Police Clearance
                    </FieldLabel>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cert-food"
                      checked={certifications.some(c => c.type === 'food_safety')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCertifications([...certifications, { type: 'food_safety', required: true }])
                        } else {
                          setCertifications(certifications.filter(c => c.type !== 'food_safety'))
                        }
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <FieldLabel htmlFor="cert-food" className="mb-0 cursor-pointer">
                      Food Handling Certificate
                    </FieldLabel>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cert-rsa"
                      checked={certifications.some(c => c.type === 'rsa')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCertifications([...certifications, { type: 'rsa', required: true }])
                        } else {
                          setCertifications(certifications.filter(c => c.type !== 'rsa'))
                        }
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <FieldLabel htmlFor="cert-rsa" className="mb-0 cursor-pointer">
                      RSA — Responsible Service of Alcohol
                    </FieldLabel>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="cert-other"
                        checked={certifications.some(c => c.type === 'other')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCertifications([...certifications, { type: 'other', label: otherCertLabel || 'Other certification', required: true }])
                          } else {
                            setCertifications(certifications.filter(c => c.type !== 'other'))
                            setOtherCertLabel("")
                          }
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <FieldLabel htmlFor="cert-other" className="mb-0 cursor-pointer">
                        Other (specify)
                      </FieldLabel>
                    </div>
                    {certifications.some(c => c.type === 'other') && (
                      <Input
                        id="cert-other-label"
                        value={otherCertLabel}
                        onChange={(e) => {
                          setOtherCertLabel(e.target.value)
                          setCertifications(certifications.map(c => 
                            c.type === 'other' ? { ...c, label: e.target.value || 'Other certification' } : c
                          ))
                        }}
                        placeholder="e.g. First Aid Certificate"
                        className="ml-6"
                      />
                    )}
                  </div>
                </div>
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
                        Required: Name, Email, Teams, Locations, Employers, and Award
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
