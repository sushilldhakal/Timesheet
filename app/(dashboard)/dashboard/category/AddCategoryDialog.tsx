"use client"

import { useState } from "react"
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
import { CATEGORY_TYPE_LABELS, type CategoryType } from "@/lib/config/category-types"
import { parseCoordsFromMapLink } from "@/lib/utils/parseMapLink"

type Props = {
  type: CategoryType
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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setName("")
    setMapLink("")
    setLat(undefined)
    setLng(undefined)
    setRadius(100)
    setGeofenceMode("hard")
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
    setLoading(true)
    try {
      const body: Record<string, unknown> = { name: name.trim(), type }
      if (type === "location") {
        if (lat != null && lng != null) {
          body.lat = lat
          body.lng = lng
        }
        body.radius = radius
        body.geofenceMode = geofenceMode
      }
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to create")
        return
      }
      handleOpenChange(false)
      onSuccess()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const typeLabel = CATEGORY_TYPE_LABELS[type]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {typeLabel}</DialogTitle>
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
