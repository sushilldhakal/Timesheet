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
import { useLocations } from "@/lib/queries/locations"
import { useTeams } from "@/lib/queries/teams"
import { useEmployers } from "@/lib/queries/employers"
import { useAwards } from "@/lib/queries/awards"
import { useUpdateEmployee } from "@/lib/queries/employees"
import { useUploadImage } from "@/lib/queries/upload"
import { useLocationTeams } from "@/lib/queries/locations"
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
  const [team, setTeam] = useState<string[]>([])
  const [employer, setEmployer] = useState<string[]>([])
  const [location, setLocation] = useState<string[]>([])
  
  // Compute current team assignments per location (read-only display)
  const currentLocationTeamAssignments = useMemo(() => {
    if (!employee.teams || location.length <= 1) return []
    
    // Group by location
    const assignmentsByLocation = new Map<string, string[]>()
    employee.teams.forEach((teamAssignment: any) => {
      const locName = teamAssignment.location?.name
      const teamName = teamAssignment.team?.name
      if (locName && teamName) {
        if (!assignmentsByLocation.has(locName)) {
          assignmentsByLocation.set(locName, [])
        }
        assignmentsByLocation.get(locName)!.push(teamName)
      }
    })
    
    // Convert to array format, only for selected locations
    return location.map(loc => ({
      location: loc,
      teams: assignmentsByLocation.get(loc) || []
    }))
  }, [employee.teams, location])
  
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const teamsQuery = useTeams()
  const employersQuery = useEmployers()
  const locationsQuery = useLocations()
  const awardsQuery = useAwards()
  const updateEmployeeMutation = useUpdateEmployee()
  const uploadImageMutation = useUploadImage()
  
  // Get enabled teams for the first selected location
  const firstLocationId = useMemo(() => {
    if (location.length === 0) return null
    const firstLoc = locationsQuery.data?.locations?.find(c => c.name === location[0])
    return firstLoc?.id || null
  }, [location, locationsQuery.data?.locations])
  
  const locationTeamsQuery = useLocationTeams(firstLocationId)

  const teamOptions = useMemo(() => {
    const allTeams = teamsQuery.data?.teams?.map((c: any, index) => ({
      value: c.name,
      label: c.name,
      id: c.id || c._id || `team-${index}`
    })) || []
    
    // If no location selected, return all teams
    if (location.length === 0) return allTeams
    
    const enabledTeamIds = locationTeamsQuery.data?.teams?.map((t) => t.teamId) || []
    if (enabledTeamIds.length === 0) return allTeams
    
    return allTeams.filter((team) => enabledTeamIds.includes(team.id))
  }, [teamsQuery.data?.teams, location, locationTeamsQuery.data])

  const employerOptions = useMemo(() => 
    employersQuery.data?.employers?.map((c: any, index) => ({
      value: c.name,
      label: c.name,
      id: c._id || c.id || `employer-${index}`
    })) || []
  , [employersQuery.data?.employers])

  const locationOptions = useMemo(() => 
    locationsQuery.data?.locations?.map((c: any, index) => ({
      value: c.name,
      label: c.name,
      id: c._id || c.id || `location-${index}`
    })) || []
  , [locationsQuery.data?.locations])

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
      
      setTeam(unique(employee.teams?.map((r: any) => r.team.name)))
      setEmployer(unique(employee.employers?.map(e => e.name)))
      setLocation(unique(employee.locations?.map(l => l.name)))
      
      setStandardHours(employee.standardHoursPerWeek ?? null)
      setEmploymentType(employee.employmentType ?? "")
      setAwardId(employee.award?.id ?? "")
      setAwardLevel(employee.award?.level ?? "")
      
      // Reset password fields
      setPassword("")
      setSendSetupEmail(true)
      
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
    if (teamOptions.length > 0) {
      const teamValues = new Set(teamOptions.map(o => o.value))
      setTeam(prev => {
        const filtered = prev.filter(r => teamValues.has(r))
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
  }, [teamOptions, employerOptions, locationOptions])
  
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
          team: team.length > 0 ? team : undefined,
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
          password: password.trim() || undefined,
          sendSetupEmail: !password.trim() && sendSetupEmail,
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
                  Select location first to filter available teams
                </p>
              </Field>

              {location.length === 1 ? (
                // Single location: show team multi-select (disabled - read-only)
                <Field>
                  <FieldLabel>Teams (Read-only)</FieldLabel>
                  <MultiSelect
                    options={teamOptions}
                    onValueChange={setTeam}
                    defaultValue={team}
                    placeholder="Select teams..."
                    disabled={true}
                  />
                  <p className="text-xs text-amber-600 mt-1">
                    Team assignments cannot be changed here. Use the employee detail page &quot;Team Assignments&quot; section to modify teams.
                  </p>
                </Field>
              ) : location.length > 1 ? (
                // Multiple locations: show per-location team table (read-only)
                <Field>
                  <FieldLabel>Team per Location (Read-only)</FieldLabel>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Location</th>
                          <th className="text-left p-3 font-medium">Teams</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentLocationTeamAssignments.map((assignment) => (
                          <tr key={assignment.location} className="border-t">
                            <td className="p-3">{assignment.location}</td>
                            <td className="p-3">
                              <div className="text-sm text-muted-foreground">
                                {assignment.teams.length > 0 
                                  ? assignment.teams.join(", ") 
                                  : "No teams assigned"}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Team assignments cannot be changed here. Use the employee detail page &quot;Team Assignments&quot; section to modify teams.
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

              {/* Web Access Setup */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-3">Web Access Setup</h3>
                <div className="space-y-4">
                  <Field>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-emp-send-setup"
                        checked={sendSetupEmail}
                        onChange={(e) => {
                          setSendSetupEmail(e.target.checked)
                          if (e.target.checked) setPassword("")
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <FieldLabel htmlFor="edit-emp-send-setup" className="mb-0 cursor-pointer">
                        Send password setup email
                      </FieldLabel>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      Employee will receive an email with a link to set their own password (expires in 24 hours)
                    </p>
                  </Field>

                  {!sendSetupEmail && (
                    <Field>
                      <FieldLabel htmlFor="edit-emp-password">New Password</FieldLabel>
                      <Input
                        id="edit-emp-password"
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

          {error && <FieldError>{error}</FieldError>}
        </MultiStepForm>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
