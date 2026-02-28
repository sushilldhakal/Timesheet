"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_TYPE_LABELS } from "@/lib/config/category-types"
import { parseCoordsFromMapLink } from "@/lib/utils/parseMapLink"
import { TAILWIND_COLORS } from "@/lib/utils/colors"
import { MultiSelect } from "@/components/ui/MultiSelect"
import type { CategoryRow } from "./page"

type Props = {
  category: CategoryRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditCategoryDialog({
  category,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [name, setName] = useState(category.name)
  const [mapLink, setMapLink] = useState("")
  const [lat, setLat] = useState<number | undefined>(category.lat)
  const [lng, setLng] = useState<number | undefined>(category.lng)
  const [radius, setRadius] = useState(category.radius ?? 100)
  const [geofenceMode, setGeofenceMode] = useState<"hard" | "soft">(category.geofenceMode ?? "hard")
  const [openingHour, setOpeningHour] = useState<number>(category.openingHour ?? 8)
  const [closingHour, setClosingHour] = useState<number>(category.closingHour ?? 18)
  const [color, setColor] = useState<string>(category.color ?? "#3b82f6")
  const [standardHours, setStandardHours] = useState<number>(category.defaultScheduleTemplate?.standardHoursPerWeek ?? 38)
  const [shiftDays, setShiftDays] = useState<number[]>(category.defaultScheduleTemplate?.shiftPattern?.dayOfWeek ?? [1, 2, 3, 4, 5])
  const [shiftStartHour, setShiftStartHour] = useState<number>(category.defaultScheduleTemplate?.shiftPattern?.startHour ?? 9)
  const [shiftEndHour, setShiftEndHour] = useState<number>(category.defaultScheduleTemplate?.shiftPattern?.endHour ?? 17)
  const [shiftDescription, setShiftDescription] = useState<string>(category.defaultScheduleTemplate?.shiftPattern?.description ?? 'Standard business hours')
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [allRoles, setAllRoles] = useState<Array<{ id: string; name: string; color?: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch all roles for the multi-select
    const fetchAllRoles = async () => {
      try {
        const res = await fetch("/api/categories?type=role")
        if (res.ok) {
          const data = await res.json()
          setAllRoles(data.categories || [])
        }
      } catch (err) {
        console.error("Failed to fetch all roles:", err)
      }
    }
    fetchAllRoles()
  }, [])

  useEffect(() => {
    if (open && category) {
      setName(category.name)
      setMapLink("")
      setLat(category.lat)
      setLng(category.lng)
      setRadius(category.radius ?? 100)
      setGeofenceMode(category.geofenceMode ?? "hard")
      setOpeningHour(category.openingHour ?? 8)
      setClosingHour(category.closingHour ?? 18)
      setColor(category.color ?? "#3b82f6")
      setStandardHours(category.defaultScheduleTemplate?.standardHoursPerWeek ?? 38)
      setShiftDays(category.defaultScheduleTemplate?.shiftPattern?.dayOfWeek ?? [1, 2, 3, 4, 5])
      setShiftStartHour(category.defaultScheduleTemplate?.shiftPattern?.startHour ?? 9)
      setShiftEndHour(category.defaultScheduleTemplate?.shiftPattern?.endHour ?? 17)
      setShiftDescription(category.defaultScheduleTemplate?.shiftPattern?.description ?? 'Standard business hours')
      setError(null)

      // Fetch enabled roles for locations
      if (category.type === "location") {
        fetchEnabledRoles()
      }
    }
  }, [open, category])

  const fetchEnabledRoles = async () => {
    try {
      const res = await fetch(`/api/locations/${category.id}/roles`)
      if (res.ok) {
        const response = await res.json()
        const enabledRoles = response.data?.roles || []
        setSelectedRoleIds(enabledRoles.map((r: any) => r.roleId))
      }
    } catch (err) {
      console.error("Failed to fetch enabled roles:", err)
    }
  }

  const handleMapLinkChange = (value: string) => {
    setMapLink(value)
    const coords = parseCoordsFromMapLink(value)
    if (coords) {
      setLat(coords.lat)
      setLng(coords.lng)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body: Record<string, unknown> = { name: name.trim() }
      if (category.type === "location") {
        if (lat != null) body.lat = lat
        if (lng != null) body.lng = lng
        body.radius = radius
        body.geofenceMode = geofenceMode
        body.openingHour = openingHour
        body.closingHour = closingHour
      }
      if (category.type === "role" || category.type === "employer") {
        body.color = color
      }
      if (category.type === "role") {
        // Update role template with standard hours and shift pattern
        body.defaultScheduleTemplate = {
          standardHoursPerWeek: standardHours,
          shiftPattern: {
            dayOfWeek: shiftDays,
            startHour: shiftStartHour,
            endHour: shiftEndHour,
            description: shiftDescription
          }
        }
      }
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to update")
        return
      }

      // If location, sync role enablements
      if (category.type === "location") {
        // Fetch current enabled roles
        const currentRes = await fetch(`/api/locations/${category.id}/roles`)
        const currentData = await currentRes.json()
        const currentRoleIds = (currentData.data?.roles || []).map((r: any) => r.roleId)

        // Determine roles to enable and disable
        const rolesToEnable = selectedRoleIds.filter((id) => !currentRoleIds.includes(id))
        const rolesToDisable = currentRoleIds.filter((id: string) => !selectedRoleIds.includes(id))

        // Enable new roles
        await Promise.all(
          rolesToEnable.map((roleId) =>
            fetch(`/api/locations/${category.id}/roles`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roleId,
                effectiveFrom: new Date().toISOString(),
                effectiveTo: null,
              }),
            })
          )
        )

        // Disable removed roles
        await Promise.all(
          rolesToDisable.map((roleId: string) =>
            fetch(`/api/locations/${category.id}/roles/${roleId}`, {
              method: "DELETE",
            })
          )
        )
      }

      onOpenChange(false)
      onSuccess()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const typeLabel = CATEGORY_TYPE_LABELS[category.type]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {typeLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="edit-category-name">Name *</FieldLabel>
              <Input
                id="edit-category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            {(category.type === "role" || category.type === "employer") && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-color">Color</FieldLabel>
                  <Select
                    value={color}
                    onValueChange={setColor}
                  >
                    <SelectTrigger id="edit-color" className="w-full">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-5 w-5 rounded border-2 border-gray-300"
                            style={{ backgroundColor: color }}
                          />
                          <span>{TAILWIND_COLORS.find(c => c.value === color)?.name || "Select color"}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TAILWIND_COLORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-5 w-5 rounded border-2 border-gray-300"
                              style={{ backgroundColor: c.value }}
                            />
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {category.type === "role" && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="edit-standard-hours">Standard Hours per Week</FieldLabel>
                      <Input
                        id="edit-standard-hours"
                        type="number"
                        min={0}
                        max={168}
                        step={0.5}
                        value={standardHours}
                        onChange={(e) => setStandardHours(Number(e.target.value) || 38)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Default working hours for this role (used in roster generation)
                      </p>
                    </Field>
                    
                    <Field>
                      <FieldLabel>Working Days</FieldLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[
                          { value: 0, label: 'Sun' },
                          { value: 1, label: 'Mon' },
                          { value: 2, label: 'Tue' },
                          { value: 3, label: 'Wed' },
                          { value: 4, label: 'Thu' },
                          { value: 5, label: 'Fri' },
                          { value: 6, label: 'Sat' },
                        ].map((day) => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={shiftDays.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            className="w-14"
                            onClick={() => {
                              if (shiftDays.includes(day.value)) {
                                setShiftDays(shiftDays.filter(d => d !== day.value))
                              } else {
                                setShiftDays([...shiftDays, day.value].sort())
                              }
                            }}
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select the days this role typically works
                      </p>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="edit-shift-start">Shift Start Time</FieldLabel>
                        <Select
                          value={String(shiftStartHour)}
                          onValueChange={(v) => setShiftStartHour(Number(v))}
                        >
                          <SelectTrigger id="edit-shift-start">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="edit-shift-end">Shift End Time</FieldLabel>
                        <Select
                          value={String(shiftEndHour)}
                          onValueChange={(v) => setShiftEndHour(Number(v))}
                        >
                          <SelectTrigger id="edit-shift-end">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 25 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : i === 24 ? '12 AM (next day)' : `${i - 12} PM`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="edit-shift-description">Shift Description</FieldLabel>
                      <Input
                        id="edit-shift-description"
                        value={shiftDescription}
                        onChange={(e) => setShiftDescription(e.target.value)}
                        placeholder="e.g., Morning shift, Evening service"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Brief description of this shift pattern
                      </p>
                    </Field>
                  </>
                )}
              </>
            )}
            {category.type === "location" && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-map-link">Paste Google Maps link</FieldLabel>
                  <Input
                    id="edit-map-link"
                    value={mapLink}
                    onChange={(e) => handleMapLinkChange(e.target.value)}
                    placeholder="https://maps.google.com/?q=-37.8317,144.9244"
                  />
                  {((lat != null && lng != null) || (category.lat != null && category.lng != null)) && (
                    <p className="mt-1 text-sm text-green-600">
                      {mapLink && lat != null && lng != null
                        ? `Detected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
                        : `Current: ${(category.lat ?? lat ?? 0).toFixed(5)}, ${(category.lng ?? lng ?? 0).toFixed(5)}`}
                    </p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-radius">Range (metres)</FieldLabel>
                  <Input
                    id="edit-radius"
                    type="number"
                    min={10}
                    max={5000}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value) || 100)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Geofence mode</FieldLabel>
                  <Select
                    value={geofenceMode}
                    onValueChange={(v) => setGeofenceMode(v as "hard" | "soft")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hard">Hard — reject clock-in outside</SelectItem>
                      <SelectItem value="soft">Soft — flag but allow</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="edit-starting-hour">Starting Hour</FieldLabel>
                    <Select
                      value={String(openingHour)}
                      onValueChange={(v) => setOpeningHour(Number(v))}
                    >
                      <SelectTrigger id="edit-starting-hour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-ending-hour">Ending Hour</FieldLabel>
                    <Select
                      value={String(closingHour)}
                      onValueChange={(v) => setClosingHour(Number(v))}
                    >
                      <SelectTrigger id="edit-ending-hour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 25 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : i === 24 ? '12 AM (next day)' : `${i - 12} PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Enabled Roles</FieldLabel>
                  <MultiSelect
                    options={allRoles.map(role => ({
                      label: role.name,
                      value: role.id,
                      style: role.color ? { badgeColor: role.color } : undefined
                    }))}
                    onValueChange={setSelectedRoleIds}
                    defaultValue={selectedRoleIds}
                    placeholder="Select roles for this location..."
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which roles are available at this location
                  </p>
                </Field>
              </>
            )}
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
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
