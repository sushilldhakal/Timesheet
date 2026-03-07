const baseUrl = "/api/roles"

export async function getRolesAvailability(params?: {
  locationId?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.locationId) searchParams.set("locationId", params.locationId)

  const url = searchParams.toString() ? `${baseUrl}/availability?${searchParams}` : `${baseUrl}/availability`
  const response = await fetch(url, {
    credentials: "include",
  })
  return response.json()
}