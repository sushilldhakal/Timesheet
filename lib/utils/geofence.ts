function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Haversine formula — distance in metres between two lat/lng points.
 */
export function distanceMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Check if user position is within the geofence (circle).
 */
export function isWithinGeofence(
  userLat: number,
  userLng: number,
  locationLat: number,
  locationLng: number,
  radiusMetres: number
): boolean {
  const dist = distanceMetres(userLat, userLng, locationLat, locationLng)
  return dist <= radiusMetres
}
