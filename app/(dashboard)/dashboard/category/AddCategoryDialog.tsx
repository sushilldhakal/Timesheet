"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { parseCoordsFromMapLink } from "@/lib/utils/location/parseMapLink"
import { getRandomTailwindColor, TAILWIND_COLORS } from "@/lib/utils/format/colors"
import { MultiSelect } from "@/components/ui/MultiSelect"
import { useCreateLocation, useEnableLocationRole } from "@/lib/queries/locations"
import { useCreateRole, useRoles } from "@/lib/queries/roles"
import { useCreateEmployer } from "@/lib/queries/employers"
import type { EntityType } from "./page"

const TYPE_LABELS: Record<EntityType, string> = {
  role: "Role",
  employer: "Employer",
  location: "Location",
}

type Props = {
  type: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddCategoryDialog({
  type,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [name, setName] = useState("")
  const [mapLink, setMapLink] = useState("")
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [radius, setRadius] = useState(100)
  const [geofenceMode, setGeofenceMode] = useState<"hard" | "soft">("hard")
  const [openingHour, setOpeningHour] = useState(8)
  const [closingHour, setClosingHour] = useState(18)
  const [color, setColor] = useState(getRandomTailwindColor())
  const [standardHours, setStandardHours] = useState(38)
  const [shiftDays, setShiftDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [shiftStartHour, setShiftStartHour] = useState(9)
  const [shiftEndHour, setShiftEndHour] = useState(17)
  const [shiftDescription, setShiftDescription] = useState('Standard business hours')
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const rolesQuery = useRoles()
  const createLocationMutation = useCreateLocation()
  const createRoleMutation = useCreateRole()
  const createEmployerMutation = useCreateEmployer()
  const enableLocationRoleMutation = useEnableLocationRole()

  const allRoles = rolesQuery.data?.roles ?? []

  const reset = () => {
    setName("")
    setMapLink("")
    setLat(undefined)
    setLng(undefined)
    setRadius(100)
    setGeofenceMode("hard")
    setOpeningHour(8)
    setClosingHour(18)
    setColor(getRandomTailwindColor())
    setStandardHours(38)
    setShiftDays([1, 2, 3, 4, 5])
    setShiftStartHour(9)
    setShiftEndHour(17)
    setShiftDescription('Standard business hours')
    setSelectedRoleIds([])
    setError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
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

    try {
      if (type === "location") {
        const body: Record<string, unknown> = { name: name.trim() }
        if (lat != null && lng != null) { body.lat = lat; body.lng = lng }
        body.radius = radius
        body.geofenceMode = geofenceMode
        body.openingHour = openingHour
        body.closingHour = closingHour
        const result = await createLocationMutation.mutateAsync(body as any)
        if (selectedRoleIds.length > 0 && result.location?.id) {
          await Promise.all(
            selectedRoleIds.map((roleId) =>
              enableLocationRoleMutation.mutateAsync({
                locationId: result.location!.id,
                data: { roleId, effectiveFrom: new Date().toISOString(), effectiveTo: null },
              })
            )
          )
        }
      } else if (type === "role") {
        await createRoleMutation.mutateAsync({
          name: name.trim(),
          color,
          defaultScheduleTemplate: {
            standardHoursPerWeek: standardHours,
            shiftPattern: { dayOfWeek: shiftDays, startHour: shiftStartHour, endHour: shiftEndHour, description: shiftDescription },
          },
        })
      } else {
        await createEmployerMutation.mutateAsync({ name: name.trim(), color })
      }

      handleOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const typeLabel = TYPE_LABELS[type]
  const loading = createLocationMutation.isPending || createRoleMutation.isPending || createEmployerMutation.isPending || enableLocationRoleMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {typeLabel}</DialogTitle>
          <DialogDescription>
            Create a new {typeLabel.toLowerCase()} for your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="add-category-name">Name *</FieldLabel>
              <Input
                id="add-category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${type === "role" ? "Driver" : type === "employer" ? "Acme Corp" : "Site A"}`}
                required
              />
            </Field>
            {(type === "role" || type === "employer") && (
              <>
                <Field>
                  <FieldLabel htmlFor="add-color">Color</FieldLabel>
                  <Select
                    value={color}
                    onValueChange={setColor}
                  >
                    <SelectTrigger id="add-color" className="w-full">
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
                {type === "role" && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="add-standard-hours">Standard Hours per Week</FieldLabel>
                      <Input
                        id="add-standard-hours"
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
                        <FieldLabel htmlFor="add-shift-start">Shift Start Time</FieldLabel>
                        <Select
                          value={String(shiftStartHour)}
                          onValueChange={(v) => setShiftStartHour(Number(v))}
                        >
                          <SelectTrigger id="add-shift-start">
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
                        <FieldLabel htmlFor="add-shift-end">Shift End Time</FieldLabel>
                        <Select
                          value={String(shiftEndHour)}
                          onValueChange={(v) => setShiftEndHour(Number(v))}
                        >
                          <SelectTrigger id="add-shift-end">
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
                      <FieldLabel htmlFor="add-shift-description">Shift Description</FieldLabel>
                      <Input
                        id="add-shift-description"
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
            {type === "location" && (
              <>
                <Field>
                  <FieldLabel htmlFor="add-map-link">Paste Google Maps link</FieldLabel>
                  <Input
                    id="add-map-link"
                    value={mapLink}
                    onChange={(e) => handleMapLinkChange(e.target.value)}
                    placeholder="https://maps.google.com/?q=-37.8317,144.9244"
                  />
                  {lat != null && lng != null && (
                    <p className="mt-1 text-sm text-green-600">Detected: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="add-radius">Range (metres)</FieldLabel>
                  <Input
                    id="add-radius"
                    type="number"
                    min={10}
                    max={5000}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value) || 100)}
                    placeholder="e.g. 100"
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
                    <FieldLabel htmlFor="add-starting-hour">Starting Hour</FieldLabel>
                    <Select
                      value={String(openingHour)}
                      onValueChange={(v) => setOpeningHour(Number(v))}
                    >
                      <SelectTrigger id="add-starting-hour">
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
                    <FieldLabel htmlFor="add-ending-hour">Ending Hour</FieldLabel>
                    <Select
                      value={String(closingHour)}
                      onValueChange={(v) => setClosingHour(Number(v))}
                    >
                      <SelectTrigger id="add-ending-hour">
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
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
