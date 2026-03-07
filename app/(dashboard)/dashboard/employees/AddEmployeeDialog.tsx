"use client"

import { useState, useEffect, useRef, useMemo } from "react"
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
import { useCategoriesByType } from "@/lib/queries/categories"
import { useAwards } from "@/lib/queries/awards"
import { useCreateEmployee, useGeneratePin, useCheckPin } from "@/lib/queries/employees"
import { useUploadImage } from "@/lib/queries/upload"

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
  const [homeAddress, setHomeAddress] = useState("")
  const [dob, setDob] = useState("")
  const [comment, setComment] = useState("")
  const [img, setImg] = useState("")
  const [employmentType, setEmploymentType] = useState<string>("")
  const [standardHours, setStandardHours] = useState<number | null>(null)
  const [awardId, setAwardId] = useState<string>("")
  const [awardLevel, setAwardLevel] = useState<string>("")
  const [password, setPassword] = useState("")
  const [sendSetupEmail, setSendSetupEmail] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableLevels, setAvailableLevels] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const rolesQuery = useCategoriesByType("role")
  const employersQuery = useCategoriesByType("employer")
  const locationsQuery = useCategoriesByType("location")
  const awardsQuery = useAwards()
  const createEmployeeMutation = useCreateEmployee()
  const generatePinMutation = useGeneratePin()
  const checkPinMutation = useCheckPin()
  const uploadImageMutation = useUploadImage()

  const roleOptions = useMemo(() => 
    rolesQuery.data?.categories?.map((c) => ({ value: c.name, label: c.name })) || []
  , [rolesQuery.data?.categories])
  
  const employerOptions = useMemo(() => 
    employersQuery.data?.categories?.map((c) => ({ value: c.name, label: c.name })) || []
  , [employersQuery.data?.categories])
  
  const locationOptions = useMemo(() => 
    locationsQuery.data?.categories?.map((c) => ({ value: c.name, label: c.name })) || []
  , [locationsQuery.data?.categories])
  const awardOptions = useMemo(() => 
    awardsQuery.data?.awards?.map((a) => ({
      value: a._id,
      label: a.name,
      levels: a.levels?.map((l) => l.label) || []
    })) || []
  , [awardsQuery.data?.awards])

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
    setHomeAddress("")
    setDob("")
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

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleGeneratePin = async () => {
    setError(null)
    try {
      const data = await generatePinMutation.mutateAsync()
      setPin(data.pin)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PIN")
    }
  }

  // Function to find available PIN from phone number
  const findAvailablePin = async (phoneDigits: string): Promise<string | null> => {
    if (phoneDigits.length < 4) return null

    // Try different 4-digit combinations from the phone number
    const attempts = [
      phoneDigits.slice(-4), // Last 4 digits
      phoneDigits.slice(0, 4), // First 4 digits
      phoneDigits.slice(-5, -1), // 4 digits before the last
      phoneDigits.slice(1, 5), // 4 digits starting from second
    ].filter((pin, index, arr) => arr.indexOf(pin) === index) // Remove duplicates

    for (const testPin of attempts) {
      try {
        const data = await checkPinMutation.mutateAsync(testPin)
        if (data.available) {
          return testPin
        }
      } catch {
        // Continue to next attempt
      }
    }
    return null
  }

  // When phone has 4+ digits, use last 4 as PIN
  useEffect(() => {
    if (phone.length >= 4 && !pin) {
      const phoneDigits = phone.replace(/\D/g, '')
      if (phoneDigits.length >= 4) {
        findAvailablePin(phoneDigits).then(availablePin => {
          if (availablePin) {
            setPin(availablePin)
          }
        })
      }
    }
  }, [phone, pin])

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const data = await uploadImageMutation.mutateAsync(file)
      setImg(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      // If no PIN provided and phone available, try to generate one
      let finalPin = pin
      if (!finalPin && phone) {
        const phoneDigits = phone.replace(/\D/g, '')
        if (phoneDigits.length >= 4) {
          finalPin = await findAvailablePin(phoneDigits) || ""
        }

        // If still no PIN available, generate a random one
        if (!finalPin) {
          try {
            const data = await generatePinMutation.mutateAsync()
            finalPin = data.pin
          } catch {
            setError("Failed to generate PIN")
            return
          }
        }
      }

      await createEmployeeMutation.mutateAsync({
        name: name.trim(),
        pin: finalPin,
        role: role.length > 0 ? role.join(", ") : undefined,
        employer: employer.length > 0 ? employer.join(", ") : undefined,
        location: location.length > 0 ? location.join(", ") : undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        profileImage: img || undefined,
      })

      handleOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const loading = createEmployeeMutation.isPending || generatePinMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="add-employee-name">Name *</FieldLabel>
              <Input
                id="add-employee-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="add-employee-pin">PIN *</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="add-employee-pin"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="4-digit PIN"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGeneratePin}
                    disabled={generatePinMutation.isPending}
                    title="Generate random PIN"
                  >
                    <RefreshCw className={`h-4 w-4 ${generatePinMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="add-employee-phone">Phone</FieldLabel>
                <Input
                  id="add-employee-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0412 345 678"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PIN will auto-fill from phone digits
                </p>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="add-employee-email">Email</FieldLabel>
              <Input
                id="add-employee-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@company.com"
              />
            </Field>

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
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
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
                    {uploading ? "Uploading..." : "Upload Image"}
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
              onClick={() => handleOpenChange(false)}
            >
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
