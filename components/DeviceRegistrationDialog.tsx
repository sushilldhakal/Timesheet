"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

type AuthMethod = "email" | "pin"

export function DeviceRegistrationDialog() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [method, setMethod] = useState<AuthMethod>("email")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isRevoked = searchParams.get("revoked") === "true"
  const isDisabled = searchParams.get("disabled") === "true"
  const showRegister = searchParams.get("register") === "true"

  // Don't render if none of the query params are present
  if (!showRegister && !isRevoked && !isDisabled) {
    return null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const payload = {
      email: method === "email" ? formData.get("email") : null,
      password: method === "email" ? formData.get("password") : null,
      adminPin: method === "pin" ? formData.get("adminPin") : null,
      locationName: formData.get("locationName"),
      locationAddress: formData.get("locationAddress") || "",
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

      // Success - redirect to home page (removes ?register=true param)
      window.location.href = "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
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
            {/* Method selection */}
            <div>
              <label
                htmlFor="method"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Authentication Method
              </label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as AuthMethod)}
                className={cn(
                  "w-full border rounded-md px-3 py-2",
                  "bg-white dark:bg-gray-700",
                  "border-gray-300 dark:border-gray-600",
                  "text-gray-900 dark:text-white",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
              >
                <option value="email">Username & Password</option>
                <option value="pin">Admin PIN</option>
              </select>
            </div>

            {/* Conditional fields based on method */}
            {method === "email" ? (
              <>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Admin Username
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    placeholder="admin"
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
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Password
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
              </>
            ) : (
              <div>
                <label
                  htmlFor="adminPin"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Admin PIN
                </label>
                <input
                  id="adminPin"
                  name="adminPin"
                  type="password"
                  placeholder="Enter admin PIN"
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
            )}

            {/* Location fields */}
            <div>
              <label
                htmlFor="locationName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                id="locationName"
                name="locationName"
                type="text"
                placeholder="Main Office"
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

            <div>
              <label
                htmlFor="locationAddress"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Address (optional)
              </label>
              <input
                id="locationAddress"
                name="locationAddress"
                type="text"
                placeholder="123 Main St, City, State"
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

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
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
