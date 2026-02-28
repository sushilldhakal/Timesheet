"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SingleDayPicker } from "@/components/ui/single-day-picker"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/lib/utils/toast"
import { CheckCircle2, MapPin, Briefcase, Loader2 } from "lucide-react"

// Validation schema
const assignmentSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  roleId: z.string().min(1, "Role is required"),
  validFrom: z.date({
    required_error: "Valid from date is required",
  }),
  validTo: z.date().nullable().optional(),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
}).refine(
  (data) => {
    if (data.validTo && data.validFrom) {
      return data.validTo >= data.validFrom
    }
    return true
  },
  {
    message: "Valid to date must be after or equal to valid from date",
    path: ["validTo"],
  }
)

type AssignmentFormData = z.infer<typeof assignmentSchema>

interface Location {
  _id: string
  id?: string
  name: string
}

interface Role {
  roleId: string
  roleName: string
  roleColor?: string
  employeeCount: number
  isEnabled: boolean
}

interface EmployeeRoleAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  employeeName: string
  onSuccess?: () => void
}

export function EmployeeRoleAssignmentDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onSuccess,
}: EmployeeRoleAssignmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      locationId: "",
      roleId: "",
      validFrom: new Date(),
      validTo: null,
      notes: "",
    },
  })

  const selectedLocationId = form.watch("locationId")
  const selectedRoleId = form.watch("roleId")

  // Fetch all locations
  useEffect(() => {
    if (open) {
      fetchLocations()
    }
  }, [open])

  // Fetch roles when location changes
  useEffect(() => {
    if (selectedLocationId) {
      fetchRoles(selectedLocationId)
      // Reset role selection when location changes
      form.setValue("roleId", "")
    } else {
      setRoles([])
    }
  }, [selectedLocationId])

  const fetchLocations = async () => {
    setLoadingLocations(true)
    try {
      const response = await fetch("/api/categories?type=location")
      if (response.ok) {
        const data = await response.json()
        setLocations(data.categories || [])
      } else {
        toast.error({
          title: "Failed to Load Locations",
          description: "Could not fetch available locations.",
        })
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
      toast.error({
        title: "Network Error",
        description: "Failed to connect to the server.",
      })
    } finally {
      setLoadingLocations(false)
    }
  }

  const fetchRoles = async (locationId: string) => {
    setLoadingRoles(true)
    setValidationError(null)
    try {
      const response = await fetch(
        `/api/roles/availability?locationId=${locationId}`
      )
      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      } else {
        toast.error({
          title: "Failed to Load Roles",
          description: "Could not fetch available roles for this location.",
        })
      }
    } catch (error) {
      console.error("Error fetching roles:", error)
      toast.error({
        title: "Network Error",
        description: "Failed to connect to the server.",
      })
    } finally {
      setLoadingRoles(false)
    }
  }

  const onSubmit = async (data: AssignmentFormData) => {
    setLoading(true)
    setValidationError(null)
    
    try {
      const response = await fetch(`/api/employees/${employeeId}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId: data.roleId,
          locationId: data.locationId,
          validFrom: data.validFrom.toISOString(),
          validTo: data.validTo?.toISOString() || null,
          notes: data.notes || "",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (result.code === "ROLE_NOT_ENABLED") {
          setValidationError(
            "This role is not enabled at the selected location. Please enable the role first."
          )
        } else if (result.code === "OVERLAPPING_ASSIGNMENT") {
          setValidationError(
            "This employee already has an overlapping assignment for this role at this location."
          )
        } else if (result.code === "VALIDATION_ERROR") {
          setValidationError(
            result.message || "Validation failed. Please check your inputs."
          )
        } else {
          toast.error({
            title: "Failed to Assign Role",
            description: result.message || "An error occurred while assigning the role.",
          })
        }
        return
      }

      // Show success state
      setShowSuccess(true)
      
      // Wait a moment to show the success message
      setTimeout(() => {
        setShowSuccess(false)
        form.reset()
        onOpenChange(false)
        onSuccess?.()
        
        const selectedLocation = locations.find(
          (l) => (l._id || l.id) === data.locationId
        )
        const selectedRole = roles.find((r) => r.roleId === data.roleId)
        
        toast.success({
          title: "Role Assigned",
          description: `${employeeName} has been assigned to ${selectedRole?.roleName || "role"} at ${selectedLocation?.name || "location"}.`,
        })
      }, 1500)
    } catch (error) {
      console.error("Error assigning role:", error)
      toast.error({
        title: "Network Error",
        description: "Failed to connect to the server. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading && !showSuccess) {
      form.reset()
      setValidationError(null)
      onOpenChange(false)
    }
  }

  const selectedLocation = locations.find(
    (l) => (l._id || l.id) === selectedLocationId
  )
  const selectedRole = roles.find((r) => r.roleId === selectedRoleId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        {showSuccess ? (
          // Success confirmation view
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Role Assigned Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                {employeeName} can now work as {selectedRole?.roleName} at{" "}
                {selectedLocation?.name}
              </p>
            </div>
          </div>
        ) : (
          // Form view
          <>
            <DialogHeader>
              <DialogTitle>Assign Role to Employee</DialogTitle>
              <DialogDescription>
                Assign <span className="font-medium text-foreground">{employeeName}</span> to
                a role at a specific location
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  {/* Validation Error Display */}
                  {validationError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive">{validationError}</p>
                    </div>
                  )}

                  {/* Location Dropdown */}
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Location *</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={loadingLocations}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={
                                loadingLocations
                                  ? "Loading locations..."
                                  : "Select a location"
                              }>
                                {field.value && selectedLocation && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedLocation.name}</span>
                                  </div>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {locations.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  No locations available
                                </div>
                              ) : (
                                locations.map((location) => (
                                  <SelectItem
                                    key={location._id || location.id}
                                    value={location._id || location.id || ""}
                                  >
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span>{location.name}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Select the location where the employee will work
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Role Dropdown (filtered by location) */}
                  <FormField
                    control={form.control}
                    name="roleId"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Role *</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!selectedLocationId || loadingRoles}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={
                                !selectedLocationId
                                  ? "Select a location first"
                                  : loadingRoles
                                  ? "Loading roles..."
                                  : "Select a role"
                              }>
                                {field.value && selectedRole && (
                                  <div className="flex items-center gap-2">
                                    {selectedRole.roleColor && (
                                      <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: selectedRole.roleColor }}
                                      />
                                    )}
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedRole.roleName}</span>
                                  </div>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {loadingRoles ? (
                                <div className="p-2 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading roles...
                                </div>
                              ) : roles.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  No roles enabled at this location
                                </div>
                              ) : (
                                roles.map((role) => (
                                  <SelectItem key={role.roleId} value={role.roleId}>
                                    <div className="flex items-center gap-2">
                                      {role.roleColor && (
                                        <div
                                          className="w-3 h-3 rounded-full shrink-0"
                                          style={{ backgroundColor: role.roleColor }}
                                        />
                                      )}
                                      <span>{role.roleName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({role.employeeCount} assigned)
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Only roles enabled at the selected location are shown
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Valid From Date */}
                  <FormField
                    control={form.control}
                    name="validFrom"
                    render={({ field }: any) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Valid From *</FormLabel>
                        <FormControl>
                          <SingleDayPicker
                            value={field.value}
                            onSelect={field.onChange}
                            placeholder="Select start date"
                            labelVariant="PP"
                          />
                        </FormControl>
                        <FormDescription>
                          The date when this assignment becomes active
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Valid To Date */}
                  <FormField
                    control={form.control}
                    name="validTo"
                    render={({ field }: any) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Valid To (Optional)</FormLabel>
                        <FormControl>
                          <SingleDayPicker
                            value={field.value || undefined}
                            onSelect={field.onChange}
                            placeholder="Select end date (leave empty for indefinite)"
                            labelVariant="PP"
                          />
                        </FormControl>
                        <FormDescription>
                          Leave empty for indefinite assignment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes Field */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Add any notes about this assignment (e.g., training completed, certifications)"
                            className="resize-none"
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          {field.value?.length || 0} / 500 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !selectedLocationId || !selectedRoleId}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      "Assign Role"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
