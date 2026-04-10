/**
 * Shared fetch wrapper for API calls with consistent error handling.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init })
  
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `Request failed (${response.status})`)
  }
  
  return response.json() as Promise<T>
}
