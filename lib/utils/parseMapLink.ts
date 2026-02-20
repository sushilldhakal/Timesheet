/**
 * Parse coordinates from a Google Maps (or similar) URL.
 * Does not resolve shortened links (maps.app.goo.gl) — those need server-side fetch.
 */
export function parseCoordsFromMapLink(url: string): { lat: number; lng: number } | null {
  if (!url || typeof url !== "string") return null
  const trimmed = url.trim()
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // /@lat,lng or /@lat,lng,zoom
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?q=lat,lng
    /ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ll=lat,lng
  ]
  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    }
  }
  return null
}
