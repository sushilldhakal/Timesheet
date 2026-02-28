"use client"

import { useState } from "react"
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
import { toast } from "@/lib/utils/toast"
import { Calendar, CheckCircle2 } from "lucide-react"

// Validation schema
const enableRoleSchema = z.object({
  effectiveFrom: z.date({
    required_error: "Effective from date is required",
  }),
  effectiveTo: z.date().nullable().optional(),
}).refine(
  (data) => {
    if (data.effectiveTo && data.effectiveFrom) {
      return data.effectiveTo >= data.effectiveFrom
    }
    return true
  },
  {
    message: "Effective to date must be after or equal to effective from date",
    path: ["effectiveTo"],
  }
)

type EnableRoleFormData = z.infer<typeof enableRoleSchema>

interface EnableRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: string
  locationName: string
  roleId: string
  roleName: string
  roleColor?: string
  onSuccess?: () => void
}

export function EnableRoleDialog({
  open,
  onOpenChange,
  locationId,
  locationName,
  roleId,
  roleName,
  roleColor,
  onSuccess,
}: EnableRoleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const form = useForm<EnableRoleFormData>({
    resolver: zodResolver(enableRoleSchema),
    defaultValues: {
      effectiveFrom: new Date(),
      effectiveTo: null,
    },
  })

  const onSubmit = async (data: EnableRoleFormData) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/locations/${locationId}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId,
          effectiveFrom: data.effectiveFrom.toISOString(),
          effectiveTo: data.effectiveTo?.toISOString() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (result.code === "ALREADY_ENABLED") {
          toast.error({
            title: "Role Already Enabled",
            description: result.message || "This role is already enabled at this location with overlapping dates.",
          })
        } else {
          toast.error({
            title: "Failed to Enable Role",
            description: result.message || "An error occurred while enabling the role.",
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
        
        toast.success({
          title: "Role Enabled",
          description: `${roleName} has been enabled at ${locationName}.`,
        })
      }, 1500)
    } catch (error) {
      console.error("Error enabling role:", error)
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
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {showSuccess ? (
          // Success confirmation view
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Role Enabled Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                {roleName} is now enabled at {locationName}
              </p>
            </div>
          </div>
        ) : (
          // Form view
          <>
            <DialogHeader>
              <DialogTitle>Enable Role at Location</DialogTitle>
              <DialogDescription>
                Enable <span className="font-medium text-foreground">{roleName}</span> at{" "}
                <span className="font-medium text-foreground">{locationName}</span>
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  {/* Role indicator */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {roleColor && (
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: roleColor }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{roleName}</div>
                      <div className="text-xs text-muted-foreground">{locationName}</div>
                    </div>
                  </div>

                  {/* Effective From Date */}
                  <FormField
                    control={form.control}
                    name="effectiveFrom"
                    render={({ field }: any) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Effective From *</FormLabel>
                        <FormControl>
                          <SingleDayPicker
                            value={field.value}
                            onSelect={field.onChange}
                            placeholder="Select start date"
                            labelVariant="PP"
                          />
                        </FormControl>
                        <FormDescription>
                          The date when this role becomes available at the location
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Effective To Date */}
                  <FormField
                    control={form.control}
                    name="effectiveTo"
                    render={({ field }: any) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Effective To (Optional)</FormLabel>
                        <FormControl>
                          <SingleDayPicker
                            value={field.value || undefined}
                            onSelect={field.onChange}
                            placeholder="Select end date (leave empty for indefinite)"
                            labelVariant="PP"
                          />
                        </FormControl>
                        <FormDescription>
                          Leave empty for indefinite enablement
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
                  <Button type="submit" disabled={loading}>
                    {loading ? "Enabling..." : "Enable Role"}
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
