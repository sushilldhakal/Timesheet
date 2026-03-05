"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Location = {
  _id: string
  id: string
  name: string
  address?: string
}

export function DeviceRegistrationDialog() {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL LOGIC
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Fix hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Define fetchLocations with useCallback to avoid dependency issues
  const fetchLocations = useCallback(async (isRetry = false) => {
    setLoadingLocations(true)
    if (!isRetry) {
      setError("") // Clear any previous errors only on initial load
    }
    
    try {
      // Add timeout for mobile devices
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      // Use public endpoint that doesn't require authentication
      const response = await fetch("/api/public/locations", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add cache control for mobile devices
        cache: "no-cache",
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        const locationList = data.locations || []
        setLocations(locationList)
        setRetryCount(0) // Reset retry count on success
        
        // If no locations found, show a helpful message
        if (locationList.length === 0) {
          setError("No work locations found. Please create locations in the admin dashboard first.")
        }
      } else {
        // Handle different HTTP status codes
        if (response.status === 404) {
          setError("Work locations service not found. Please contact support.")
        } else {
          setError(`Failed to load work locations (Error ${response.status}). Please try again.`)
        }
      }
    } catch (err) {
      console.error("[DeviceRegistrationDialog] Location fetch error:", err)
      
      // More specific error messages based on error type
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out while loading work locations. Please check your connection and try again.")
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Network error while loading work locations. Please check your internet connection and try again.")
      } else {
        setError("Unable to load work locations. Please refresh the page and try again.")
      }
    } finally {
      setLoadingLocations(false)
    }
  }, [])

  const handleRetryLocations = useCallback(() => {
    setRetryCount(prev => prev + 1)
    fetchLocations(true)
  }, [fetchLocations])

  // Fetch locations when dialog opens using public endpoint
  useEffect(() => {
    if (!mounted) return // Don't run until mounted
    
    const isRevoked = searchParams?.get("revoked") === "true"
    const showRegister = searchParams?.get("register") === "true"
    
    if (showRegister || isRevoked) {
      // Add a small delay to avoid conflicts with PIN page location requests
      const timer = setTimeout(() => {
        fetchLocations()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [mounted, searchParams, fetchLocations]) // Include dependencies

  // NOW we can do conditional logic after all hooks are defined
  const isRevoked = searchParams?.get("revoked") === "true"
  const isDisabled = searchParams?.get("disabled") === "true"
  const showRegister = searchParams?.get("register") === "true"

  // Only show on pin page (/pin) and clock page (/clock)
  const allowedPaths = ["/pin", "/clock"]
  const isAllowedPath = pathname ? allowedPaths.includes(pathname) : false

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null
  }

  // Don't render if:
  // 1. None of the query params are present, OR
  // 2. Current path is not in the allowed paths (dashboard, login, etc.)
  if (!isAllowedPath || (!showRegister && !isRevoked && !isDisabled)) {
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const selectedLocationId = formData.get("locationId") as string
    
    if (!selectedLocationId) {
      setError("Please select a location from the dropdown.")
      return
    }
    
    // Find the selected location to get its name
    const selectedLocation = locations.find(loc => (loc._id || loc.id) === selectedLocationId)
    const locationName = selectedLocation?.name || ""
    
    if (!locationName) {
      setError("Invalid location selection. Please try again.")
      return
    }
    
    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
      locationName,
      locationAddress: "", // No address for basic location info
    }

    try {
      const res = await fetch("/api/device/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Registration failed")
      }

      // Success - show success toast and redirect
      toast.success("Device registered successfully!")
      
      // Small delay to show the toast before redirect
      setTimeout(() => {
        window.location.href = pathname || "/pin"
      }, 1000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed"
      setError(errorMessage)
      
      // Also show toast for better visibility
      if (errorMessage.includes("admin")) {
        toast.error("Admin Access Required", {
          description: "Only administrators can register devices. Please use an admin account.",
          duration: 5000,
        })
      } else if (errorMessage.includes("credentials")) {
        toast.error("Invalid Credentials", {
          description: "Please check your email and password.",
          duration: 4000,
        })
      } else {
        toast.error("Registration Failed", {
          description: errorMessage,
          duration: 4000,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {isRevoked
            ? "Device Re-registration Required"
            : isDisabled
            ? "Device Disabled"
            : "Register Device"}
        </h2>

        {isDisabled ? (
          <div className="space-y-4">
            <p className="text-red-600 dark:text-red-400">
              This device has been disabled by an administrator. Please contact
              support for assistance.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Info note */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Administrator access required.</strong> Use your admin account credentials to register this device.
                  </p>
                  {(showRegister || isRevoked) && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Note: This is separate from GPS location access. We're loading work locations from the database.
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Admin Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Admin Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
                className={cn(
                  "w-full border rounded-md px-3 py-2",
                  "bg-white dark:bg-gray-700",
                  "border-gray-300 dark:border-gray-600",
                  "text-gray-900 dark:text-white",
                  "placeholder-gray-400 dark:placeholder-gray-500",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
              />
            </div>

            {/* Admin Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Admin Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className={cn(
                  "w-full border rounded-md px-3 py-2",
                  "bg-white dark:bg-gray-700",
                  "border-gray-300 dark:border-gray-600",
                  "text-gray-900 dark:text-white",
                  "placeholder-gray-400 dark:placeholder-gray-500",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
              />
            </div>

            {/* Location Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="locationId"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Work Location <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (Not GPS location)
                </span>
              </div>
              
              {loadingLocations ? (
                <div className="w-full border rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading locations...
                </div>
              ) : locations.length > 0 ? (
                <select
                  id="locationId"
                  name="locationId"
                  required
                  className={cn(
                    "w-full border rounded-md px-3 py-2",
                    "bg-white dark:bg-gray-700",
                    "border-gray-300 dark:border-gray-600",
                    "text-gray-900 dark:text-white",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                >
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location._id || location.id} value={location._id || location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  <div className="w-full border rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    No locations available
                  </div>
                  {error.includes("load") && (
                    <button
                      type="button"
                      onClick={handleRetryLocations}
                      disabled={loadingLocations}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry loading locations {retryCount > 0 && `(${retryCount})`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className={cn(
                "p-4 rounded-md border",
                error.includes("admin") 
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              )}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {error.includes("admin") ? (
                      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={cn(
                      "text-sm font-medium",
                      error.includes("admin")
                        ? "text-amber-800 dark:text-amber-200"
                        : "text-red-800 dark:text-red-200"
                    )}>
                      {error.includes("admin") 
                        ? "Admin Access Required" 
                        : error.includes("credentials")
                        ? "Invalid Credentials"
                        : "Registration Failed"
                      }
                    </h3>
                    <p className={cn(
                      "mt-1 text-sm",
                      error.includes("admin")
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-red-700 dark:text-red-300"
                    )}>
                      {error}
                    </p>
                    {error.includes("admin") && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        💡 Tip: Make sure you're using an administrator account, not a regular user or employee account.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || loadingLocations}
              className={cn(
                "w-full py-2 px-4 rounded-md font-medium",
                "bg-blue-600 hover:bg-blue-700",
                "text-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              {loading ? "Registering..." : "Register Device"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
