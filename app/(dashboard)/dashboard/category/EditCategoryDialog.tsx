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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && category) {
      setName(category.name)
      setMapLink("")
      setLat(category.lat)
      setLng(category.lng)
      setRadius(category.radius ?? 100)
      setGeofenceMode(category.geofenceMode ?? "hard")
      setError(null)
    }
  }, [open, category])

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
      <DialogContent className="sm:max-w-md">
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
