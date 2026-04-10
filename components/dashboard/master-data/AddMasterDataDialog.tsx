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
import { useCreateLocation, useEnableLocationTeam } from "@/lib/queries/locations"
import { useCreateTeam, useTeams } from "@/lib/queries/teams"
import { useCreateEmployer } from "@/lib/queries/employers"
import { useAwards } from "@/lib/queries/awards"
import { useTeamGroups, useCreateTeamGroup } from "@/lib/queries/team-groups"
import type { EntityType } from "./types"

const TYPE_LABELS: Record<EntityType, string> = {
  team: "Team",
  employer: "Employer",
  location: "Location",
}

type Props = {
  type: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function AddMasterDataDialog({ type, open, onOpenChange, onSuccess }: Props) {
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
  const [shiftDescription, setShiftDescription] = useState("Standard business hours")
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [abn, setAbn] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [defaultAwardId, setDefaultAwardId] = useState<string>("")
  const [groupId, setGroupId] = useState<string>("")
  const [showNewGroupForm, setShowNewGroupForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupColor, setNewGroupColor] = useState(getRandomTailwindColor())
  const [error, setError] = useState<string | null>(null)

  const teamsQuery = useTeams()
  const awardsQuery = useAwards()
  const teamGroupsQuery = useTeamGroups()
  const createLocationMutation = useCreateLocation()
  const createTeamMutation = useCreateTeam()
  const createEmployerMutation = useCreateEmployer()
  const enableLocationTeamMutation = useEnableLocationTeam()
  const createTeamGroupMutation = useCreateTeamGroup()

  const allTeams = teamsQuery.data?.teams ?? []
  const awards = awardsQuery.data?.awards ?? []

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
    setShiftDescription("Standard business hours")
    setSelectedTeamIds([])
    setAbn("")
    setContactEmail("")
    setDefaultAwardId("")
    setGroupId("")
    setShowNewGroupForm(false)
    setNewGroupName("")
    setNewGroupColor(getRandomTailwindColor())
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

    if (type === "employer" && contactEmail.trim() && !isValidEmail(contactEmail)) {
      setError("Please enter a valid contact email.")
      return
    }

    try {
      if (type === "location") {
        const body: Record<string, unknown> = { name: name.trim() }
        if (lat != null && lng != null) {
          body.lat = lat
          body.lng = lng
        }
        body.radius = radius
        body.geofenceMode = geofenceMode
        body.openingHour = openingHour
        body.closingHour = closingHour
        const result = await createLocationMutation.mutateAsync(body as any)
        if (selectedTeamIds.length > 0 && result.location?.id) {
          await Promise.all(
            selectedTeamIds.map((teamId) =>
              enableLocationTeamMutation.mutateAsync({
                locationId: result.location!.id,
                data: { teamId, effectiveFrom: new Date().toISOString(), effectiveTo: null },
              })
            )
          )
        }
      } else if (type === "team") {
        // Create new group if needed
        let finalGroupId = groupId
        if (showNewGroupForm && newGroupName.trim()) {
          const newGroup = await createTeamGroupMutation.mutateAsync({
            name: newGroupName.trim(),
            color: newGroupColor,
          })
          finalGroupId = newGroup.teamGroup.id
        }

        await createTeamMutation.mutateAsync({
          name: name.trim(),
          color,
          groupId: finalGroupId || undefined,
          defaultScheduleTemplate: {
            standardHoursPerWeek: standardHours,
            shiftPattern: {
              dayOfWeek: shiftDays,
              startHour: shiftStartHour,
              endHour: shiftEndHour,
              description: shiftDescription,
            },
          },
        })
      } else {
        await createEmployerMutation.mutateAsync({
          name: name.trim(),
          color,
          abn: abn.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          defaultAwardId: defaultAwardId || undefined,
        })
      }

      handleOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const typeLabel = TYPE_LABELS[type]
  const loading =
    createLocationMutation.isPending ||
    createTeamMutation.isPending ||
    createEmployerMutation.isPending ||
    enableLocationTeamMutation.isPending ||
    createTeamGroupMutation.isPending

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
              <FieldLabel htmlFor="add-master-name">Name *</FieldLabel>
              <Input
                id="add-master-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${type === "team" ? "Driver" : type === "employer" ? "Acme Corp" : "Site A"}`}
                required
              />
            </Field>
            {(type === "team" || type === "employer") && (
              <>
                <Field>
                  <FieldLabel htmlFor="add-color">Color</FieldLabel>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger id="add-color" className="w-full">
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
                {type === "employer" && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="add-abn">ABN</FieldLabel>
                      <Input
                        id="add-abn"
                        value={abn}
                        onChange={(e) => setAbn(e.target.value)}
                        placeholder="Optional"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="add-contact-email">Contact email</FieldLabel>
                      <Input
                        id="add-contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="Optional"
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
                {type === "team" && (
                  <>
                    <Field>
                      <FieldLabel>Team Group (Optional)</FieldLabel>
                      {!showNewGroupForm ? (
                        <div className="flex gap-2">
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
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewGroupForm(true)}
                          >
                            + New
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 p-3 border rounded bg-slate-50 dark:bg-slate-900">
                          <Field>
                            <FieldLabel htmlFor="new-group-name">Group Name</FieldLabel>
                            <Input
                              id="new-group-name"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              placeholder="e.g. Kitchen Group 11"
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="new-group-color">Group Color</FieldLabel>
                            <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                              <SelectTrigger id="new-group-color">
                                <SelectValue>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-5 w-5 rounded border-2 border-gray-300"
                                      style={{ backgroundColor: newGroupColor }}
                                    />
                                    <span>
                                      {TAILWIND_COLORS.find((c) => c.value === newGroupColor)?.name || "Select color"}
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
                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowNewGroupForm(false)
                                setNewGroupName("")
                                setNewGroupColor(getRandomTailwindColor())
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!newGroupName.trim() || createTeamGroupMutation.isPending}
                              onClick={async () => {
                                if (!newGroupName.trim()) return
                                try {
                                  const result = await createTeamGroupMutation.mutateAsync({
                                    name: newGroupName.trim(),
                                    color: newGroupColor,
                                  })
                                  // Set the groupId to the newly created group
                                  setGroupId(result.teamGroup.id)
                                  // Close the form and reset
                                  setShowNewGroupForm(false)
                                  setNewGroupName("")
                                  setNewGroupColor(getRandomTailwindColor())
                                } catch (err) {
                                  // Error will be shown in the main form error state
                                  console.error("Failed to create group:", err)
                                }
                              }}
                            >
                              {createTeamGroupMutation.isPending ? "Creating..." : "Create Group"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Field>

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
                    <p className="mt-1 text-sm text-green-600">
                      Detected: {lat.toFixed(5)}, {lng.toFixed(5)}
                    </p>
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
