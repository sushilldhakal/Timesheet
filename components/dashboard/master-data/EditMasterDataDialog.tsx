"use client"

import { useState, useEffect } from "react"
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
import { TAILWIND_COLORS } from "@/lib/utils/format/colors"
import { MultiSelect } from "@/components/ui/MultiSelect"
import {
  useUpdateLocation,
  useLocationTeams,
  useEnableLocationTeam,
  useDisableLocationTeam,
} from "@/lib/queries/locations"
import { useTeams, useUpdateTeam } from "@/lib/queries/teams"
import { useUpdateEmployer } from "@/lib/queries/employers"
import { useAwards } from "@/lib/queries/awards"
import { useTeamGroups } from "@/lib/queries/team-groups"
import type { CategoryRow } from "./types"

const TYPE_LABELS: Record<"team" | "employer" | "location", string> = {
  team: "Team",
  employer: "Employer",
  location: "Location",
}

type Props = {
  category: CategoryRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function EditMasterDataDialog({ category, open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState(category.name)
  const [mapLink, setMapLink] = useState("")
  const [lat, setLat] = useState<number | undefined>(category.lat)
  const [lng, setLng] = useState<number | undefined>(category.lng)
  const [radius, setRadius] = useState(category.radius ?? 100)
  const [geofenceMode, setGeofenceMode] = useState<"hard" | "soft">(category.geofenceMode ?? "hard")
  const [openingHour, setOpeningHour] = useState<number>(category.openingHour ?? 8)
  const [closingHour, setClosingHour] = useState<number>(category.closingHour ?? 18)
  const [color, setColor] = useState<string>(category.color ?? "#3b82f6")
  const [standardHours, setStandardHours] = useState<number>(
    category.defaultScheduleTemplate?.standardHoursPerWeek ?? 38
  )
  const [shiftDays, setShiftDays] = useState<number[]>(
    category.defaultScheduleTemplate?.shiftPattern?.dayOfWeek ?? [1, 2, 3, 4, 5]
  )
  const [shiftStartHour, setShiftStartHour] = useState<number>(
    category.defaultScheduleTemplate?.shiftPattern?.startHour ?? 9
  )
  const [shiftEndHour, setShiftEndHour] = useState<number>(
    category.defaultScheduleTemplate?.shiftPattern?.endHour ?? 17
  )
  const [shiftDescription, setShiftDescription] = useState<string>(
    category.defaultScheduleTemplate?.shiftPattern?.description ?? "Standard business hours"
  )
  const [abn, setAbn] = useState(category.abn ?? "")
  const [contactEmail, setContactEmail] = useState(category.contactEmail ?? "")
  const [defaultAwardId, setDefaultAwardId] = useState<string>(category.defaultAwardId ?? "")
  const [groupId, setGroupId] = useState<string>(category.groupId ?? "")
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const teamsQuery = useTeams()
  const awardsQuery = useAwards()
  const teamGroupsQuery = useTeamGroups()
  const updateLocationMutation = useUpdateLocation()
  const updateTeamMutation = useUpdateTeam()
  const updateEmployerMutation = useUpdateEmployer()
  const locationTeamsQuery = useLocationTeams(category.id)
  const enableLocationTeamMutation = useEnableLocationTeam()
  const disableLocationTeamMutation = useDisableLocationTeam()

  const allTeams = teamsQuery.data?.teams ?? []
  const awards = awardsQuery.data?.awards ?? []

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
      setShiftDescription(
        category.defaultScheduleTemplate?.shiftPattern?.description ?? "Standard business hours"
      )
      setAbn(category.abn ?? "")
      setContactEmail(category.contactEmail ?? "")
      setDefaultAwardId(category.defaultAwardId ?? "")
      setGroupId(category.groupId ?? "")
      setError(null)

      if (category.type === "location" && locationTeamsQuery.data?.teams) {
        setSelectedTeamIds(locationTeamsQuery.data.teams.map((t) => t.teamId))
      }
    }
  }, [open, category, locationTeamsQuery.data])

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

    if (category.type === "employer" && contactEmail.trim() && !isValidEmail(contactEmail)) {
      setError("Please enter a valid contact email.")
      return
    }

    try {
      if (category.type === "location") {
        const body: Record<string, unknown> = { name: name.trim() }
        if (lat != null) body.lat = lat
        if (lng != null) body.lng = lng
        body.radius = radius
        body.geofenceMode = geofenceMode
        body.openingHour = openingHour
        body.closingHour = closingHour
        await updateLocationMutation.mutateAsync({ id: category.id, data: body as any })
      } else if (category.type === "team") {
        await updateTeamMutation.mutateAsync({
          id: category.id,
          data: {
            name: name.trim(),
            color,
            groupId: groupId || undefined,
            defaultScheduleTemplate: {
              standardHoursPerWeek: standardHours,
              shiftPattern: {
                dayOfWeek: shiftDays,
                startHour: shiftStartHour,
                endHour: shiftEndHour,
                description: shiftDescription,
              },
            },
          },
        })
      } else {
        await updateEmployerMutation.mutateAsync({
          id: category.id,
          data: {
            name: name.trim(),
            color,
            abn: abn.trim() || undefined,
            contactEmail: contactEmail.trim() || undefined,
            defaultAwardId: defaultAwardId || undefined,
          },
        })
      }

      if (category.type === "location" && locationTeamsQuery.data?.teams) {
        const currentTeamIds = locationTeamsQuery.data.teams.map((t) => t.teamId)

        const teamsToEnable = selectedTeamIds.filter((id) => !currentTeamIds.includes(id))
        const teamsToDisable = currentTeamIds.filter((id: string) => !selectedTeamIds.includes(id))

        await Promise.all(
          teamsToEnable.map((teamId) =>
            enableLocationTeamMutation.mutateAsync({
              locationId: category.id,
              data: {
                teamId,
                effectiveFrom: new Date().toISOString(),
                effectiveTo: null,
              },
            })
          )
        )

        await Promise.all(
          teamsToDisable.map((teamId: string) =>
            disableLocationTeamMutation.mutateAsync({
              locationId: category.id,
              teamId,
            })
          )
        )
      }

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const typeLabel = TYPE_LABELS[category.type]
  const loading =
    updateLocationMutation.isPending ||
    updateTeamMutation.isPending ||
    updateEmployerMutation.isPending ||
    enableLocationTeamMutation.isPending ||
    disableLocationTeamMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {typeLabel}</DialogTitle>
          <DialogDescription>
            Update the details for this {typeLabel.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="edit-master-name">Name *</FieldLabel>
              <Input
                id="edit-master-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            {(category.type === "team" || category.type === "employer") && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-color">Color</FieldLabel>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger id="edit-color" className="w-full">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-5 w-5 rounded border-2 border-gray-300"
                            style={{ backgroundColor: color }}
                          />
                          <span>
                            {TAILWIND_COLORS.find((c) => c.value === color)?.name || "Select color"}
                          </span>
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
                {category.type === "employer" && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="edit-abn">ABN</FieldLabel>
                      <Input id="edit-abn" value={abn} onChange={(e) => setAbn(e.target.value)} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-contact-email">Contact email</FieldLabel>
                      <Input
                        id="edit-contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Default award</FieldLabel>
                      <Select
                        value={defaultAwardId || "__none__"}
                        onValueChange={(v) => setDefaultAwardId(v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {awards.map((a) => (
                            <SelectItem key={a._id} value={a._id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                )}
                {category.type === "team" && (
                  <>
                    <Field>
                      <FieldLabel>Team Group (Optional)</FieldLabel>
                      <Select value={groupId || "__none__"} onValueChange={(v) => setGroupId(v === "__none__" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="No group assigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No group assigned</SelectItem>
                          {(teamGroupsQuery.data?.teamGroups ?? []).map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              <div className="flex items-center gap-2">
                                {g.color && (
                                  <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: g.color }}
                                  />
                                )}
                                {g.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

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
                        Default working hours for this team (used in roster generation)
                      </p>
                    </Field>

                    <Field>
                      <FieldLabel>Working Days</FieldLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[
                          { value: 0, label: "Sun" },
                          { value: 1, label: "Mon" },
                          { value: 2, label: "Tue" },
                          { value: 3, label: "Wed" },
                          { value: 4, label: "Thu" },
                          { value: 5, label: "Fri" },
                          { value: 6, label: "Sat" },
                        ].map((day) => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={shiftDays.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            className="w-14"
                            onClick={() => {
                              if (shiftDays.includes(day.value)) {
                                setShiftDays(shiftDays.filter((d) => d !== day.value))
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
                        Select the days this team typically works
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
                                {i === 0
                                  ? "12 AM"
                                  : i < 12
                                    ? `${i} AM`
                                    : i === 12
                                      ? "12 PM"
                                      : `${i - 12} PM`}
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
                                {i === 0
                                  ? "12 AM"
                                  : i < 12
                                    ? `${i} AM`
                                    : i === 12
                                      ? "12 PM"
                                      : i === 24
                                        ? "12 AM (next day)"
                                        : `${i - 12} PM`}
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
                            {i === 0
                              ? "12 AM"
                              : i < 12
                                ? `${i} AM`
                                : i === 12
                                  ? "12 PM"
                                  : `${i - 12} PM`}
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
                            {i === 0
                              ? "12 AM"
                              : i < 12
                                ? `${i} AM`
                                : i === 12
                                  ? "12 PM"
                                  : i === 24
                                    ? "12 AM (next day)"
                                    : `${i - 12} PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Enabled teams</FieldLabel>
                  <MultiSelect
                    options={allTeams.map((team) => ({
                      label: team.name,
                      value: team.id,
                      style: team.color ? { badgeColor: team.color } : undefined,
                    }))}
                    onValueChange={setSelectedTeamIds}
                    defaultValue={selectedTeamIds}
                    placeholder="Select teams for this location..."
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which teams are available at this location
                  </p>
                </Field>
              </>
            )}
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
