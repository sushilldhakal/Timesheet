"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { FormDialogShell } from "@/components/shared/forms"
import { toast } from "@/lib/utils/toast"
import { CheckCircle2, MapPin, Briefcase, Loader2 } from "lucide-react"
import { useLocations } from "@/lib/queries/locations"
import { useTeamsAvailability } from "@/lib/queries/teams"
import { useCreateEmployeeRole } from "@/lib/queries/employees"
import { roleAssignmentFormSchema } from "@/lib/validations/employee-roles"

// Import schema from validations
type AssignmentFormData = z.infer<typeof roleAssignmentFormSchema>

interface Location {
  _id: string
  id?: string
  name: string
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
  const [showSuccess, setShowSuccess] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(roleAssignmentFormSchema),
    defaultValues: {
      locationId: "",
      roleId: "",
      validFrom: new Date(),
      validTo: null,
      notes: "",
    },
  })

  // TanStack Query hooks
  const { data: locationsData, isLoading: loadingLocations } = useLocations()
  const selectedLocationId = form.watch("locationId")
  const { data: teamsData, isLoading: loadingRoles } = useTeamsAvailability({ 
    locationId: selectedLocationId 
  })
  const createRoleMutation = useCreateEmployeeRole()

  const locations = locationsData?.locations || []
  const teams = (teamsData as { teams?: Array<{ teamId: string; teamName: string; teamColor?: string }> })?.teams || []

  const selectedRoleId = form.watch("roleId")

  // Reset role selection when location changes
  const handleLocationChange = (locationId: string) => {
    form.setValue("locationId", locationId)
    form.setValue("roleId", "")
  }

  const onSubmit = async (data: AssignmentFormData) => {
    setValidationError(null)
    
    createRoleMutation.mutate(
      {
        employeeId: employeeId,
        data: {
          roleId: data.roleId,
          locationId: data.locationId,
          validFrom: data.validFrom.toISOString(),
          validTo: data.validTo?.toISOString() || null,
          notes: data.notes || "",
        },
      },
      {
        onSuccess: () => {
          // Show success state
          setShowSuccess(true)
          
          // Wait a moment to show the success message
          setTimeout(() => {
            setShowSuccess(false)
            form.reset()
            onOpenChange(false)
            onSuccess?.()
            
            const selectedLocation = locations.find(
              (l: any) => (l._id || l.id) === data.locationId
            )
            const selectedRole = teams.find((t: { teamId: string }) => t.teamId === data.roleId)
            
            toast.success({
              title: "Team assigned",
              description: `${employeeName} has been assigned to ${(selectedRole as { teamName?: string })?.teamName || "team"} at ${selectedLocation?.name || "location"}.`,
            })
          }, 1500)
        },
        onError: (error: any) => {
          const result = error.response?.data || error
          
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
              title: "Failed to assign team",
              description: result.message || "An error occurred while assigning the team.",
            })
          }
        },
      }
    )
  }

  const handleClose = () => {
    if (!createRoleMutation.isPending && !showSuccess) {
      form.reset()
      setValidationError(null)
      onOpenChange(false)
    }
  }

  const selectedLocation = locations.find(
    (l: any) => (l._id || l.id) === selectedLocationId
  )
  const selectedRole = teams.find((t: { teamId: string }) => t.teamId === selectedRoleId)

  return (
    <>
      <FormDialogShell
      open={open && !showSuccess}
      onOpenChange={handleClose}
      title="Assign team to employee"
      description={`Assign ${employeeName} to a team at a specific location`}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={createRoleMutation.isPending ? "Assigning..." : "Assign team"}
      loading={createRoleMutation.isPending}
      error={validationError}
      disabled={!selectedLocationId || !selectedRoleId}
      size="lg"
    >
      <Form {...form}>
        <div className="space-y-4">
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
                    onValueChange={handleLocationChange}
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
                        locations.map((location: any) => (
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

          {/* Team dropdown (filtered by location) */}
          <FormField
            control={form.control}
            name="roleId"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Team *</FormLabel>
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
                          ? "Loading teams..."
                          : "Select a team"
                      }>
                        {field.value && selectedRole && (
                          <div className="flex items-center gap-2">
                            {(selectedRole as { teamColor?: string }).teamColor && (
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: (selectedRole as { teamColor?: string }).teamColor }}
                              />
                            )}
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span>{(selectedRole as { teamName?: string }).teamName}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {loadingRoles ? (
                        <div className="p-2 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading teams...
                        </div>
                      ) : teams.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No teams enabled at this location
                        </div>
                      ) : (
                        teams.map((team: { teamId: string; teamName: string; teamColor?: string; employeeCount?: number }) => (
                          <SelectItem key={team.teamId} value={team.teamId}>
                            <div className="flex items-center gap-2">
                              {team.teamColor && (
                                <div
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: team.teamColor }}
                                />
                              )}
                              <span>{team.teamName}</span>
                              <span className="text-xs text-muted-foreground">
                                ({team.employeeCount} assigned)
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  Only teams enabled at the selected location are shown
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
      </Form>
    </FormDialogShell>

    {/* Success Dialog */}
    {showSuccess && (
      <FormDialogShell
        open={showSuccess}
        onOpenChange={() => {}}
        title="Team assigned successfully"
        footer={null}
      >
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {employeeName} can now work as {(selectedRole as { teamName?: string })?.teamName} at{" "}
              {selectedLocation?.name}
            </p>
          </div>
        </div>
      </FormDialogShell>
    )}
    </>
  )
}
