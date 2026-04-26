"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils/cn"
import {
  Loader2,
  TabletSmartphone,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

interface DeviceActivationProps {
  onActivate: (code: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  error: string | null
  deviceId: string
}

export function DeviceActivation({
  onActivate,
  isLoading,
  error,
  deviceId,
}: DeviceActivationProps) {
  const [activationCode, setActivationCode] = useState("")
  const [localError, setLocalError] = useState("")
  const [copied, setCopied] = useState(false)
  const [activated, setActivated] = useState(false)
  const [activatedDeviceName, setActivatedDeviceName] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError("")

    if (activationCode.trim().length < 6) {
      setLocalError("Please enter the full 6-character code")
      return
    }

    const result = await onActivate(activationCode.trim().toUpperCase())
    if (!result.success) {
      setLocalError(result.error || "Activation failed")
    } else {
      setActivated(true)
    }
  }

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(deviceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const displayError = error || localError
  const isComplete = activationCode.length === 6
  const shortDeviceId =
    deviceId.length > 18
      ? `${deviceId.slice(0, 8)}…${deviceId.slice(-6)}`
      : deviceId

  if (activated) {
    return (
      <main className="min-h-screen bg-stone-50 text-stone-950 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Brand panel — same as activation */}
        <aside className="relative hidden overflow-hidden bg-stone-950 lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl"
          />
          <div className="relative flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-50 text-stone-950">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-stone-50">
              Clockwise
            </span>
          </div>
          <div className="relative max-w-sm">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-700/60 bg-emerald-900/40 px-3 py-1 text-xs font-medium text-emerald-300 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Device activated
            </div>
            <h2 className="text-pretty text-3xl font-semibold leading-tight text-stone-50">
              You&apos;re all set. This tablet is ready for your team.
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-stone-400">
              Staff can now clock in and out from this device. It&apos;s linked
              to your workspace and ready to go.
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-4 border-t border-stone-800 pt-6">
            {[
              { label: "End-to-end", value: "Encrypted" },
              { label: "Setup time", value: "< 1 min" },
              { label: "Devices", value: "Unlimited" },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs uppercase tracking-wider text-stone-500">
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-medium text-stone-100">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Success panel */}
        <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-16 lg:py-12">
          <header className="flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-950 text-stone-50">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                Clockwise
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <Check className="h-3 w-3" />
              Activated
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center py-10 lg:py-0">
            <div className="w-full max-w-md text-center">
              {/* Success icon */}
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>

              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Device activated!
              </h1>
              <p className="mt-3 text-pretty text-base leading-relaxed text-stone-600">
                This tablet is now linked to your workspace and ready for
                staff clock-ins.
              </p>

              {/* Device ID chip */}
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs">
                <span className="text-stone-500">Device ID</span>
                <span className="font-mono text-stone-900">{shortDeviceId}</span>
                <span className="flex h-4 w-4 items-center justify-center text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
              </div>

              {/* Info card */}
              <div className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-left">
                <p className="text-sm font-medium text-emerald-900">
                  What happens next?
                </p>
                <ul className="mt-3 space-y-2 text-sm text-emerald-800">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    The clock-in screen will load automatically in a moment.
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    Staff can use their PIN to clock in and out.
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    This device stays linked for 7 days before re-verification.
                  </li>
                </ul>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-stone-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading clock-in screen…
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-stone-950 lg:flex lg:flex-col lg:justify-between lg:p-10">
        {/* Decorative grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl"
        />

        {/* Top: logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-50 text-stone-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-stone-50">
            Clockwise
          </span>
        </div>

        {/* Middle: hero copy */}
        <div className="relative max-w-sm">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-700/60 bg-stone-900/60 px-3 py-1 text-xs font-medium text-stone-300 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Awaiting activation
          </div>
          <h2 className="text-pretty text-3xl font-semibold leading-tight text-stone-50">
            Set up this tablet for your team in under a minute.
          </h2>
          <p className="mt-4 text-pretty text-sm leading-relaxed text-stone-400">
            Once activated, this device becomes a dedicated clock-in station for
            your staff — secure, simple, and always on.
          </p>
        </div>

        {/* Bottom: feature row */}
        <div className="relative grid grid-cols-3 gap-4 border-t border-stone-800 pt-6">
          {[
            { label: "End-to-end", value: "Encrypted" },
            { label: "Setup time", value: "< 1 min" },
            { label: "Devices", value: "Unlimited" },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-xs uppercase tracking-wider text-stone-500">
                {item.label}
              </div>
              <div className="mt-1 text-sm font-medium text-stone-100">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-16 lg:py-12">
        {/* Mobile brand row */}
        <header className="flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-950 text-stone-50">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Clockwise
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Awaiting activation
          </div>
        </header>

        {/* Card */}
        <div className="flex flex-1 items-center justify-center py-10 lg:py-0">
          <div className="w-full max-w-md">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm">
              <TabletSmartphone className="h-6 w-6 text-stone-900" />
            </div>

            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Activate this device
            </h1>
            <p className="mt-3 text-pretty text-base leading-relaxed text-stone-600">
              Enter the 6-character code from your admin dashboard to pair this
              tablet with your workspace.
            </p>

            {/* Device ID chip */}
            <button
              type="button"
              onClick={handleCopyId}
              className={cn(
                "mt-6 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs transition-colors",
                "border-stone-200 hover:border-stone-300"
              )}
              aria-label="Copy device ID"
            >
              <span className="text-stone-500">Device ID</span>
              <span className="font-mono text-stone-900">{shortDeviceId}</span>
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center text-stone-400 transition-colors",
                  copied && "text-emerald-600"
                )}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </span>
            </button>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-8">
              <label
                htmlFor="activationCode"
                className="mb-3 block text-sm font-medium text-stone-900"
              >
                Activation code
              </label>

              <InputOTP
                id="activationCode"
                maxLength={6}
                value={activationCode}
                onChange={(value) => {
                  setActivationCode(value.toUpperCase())
                  setLocalError("")
                }}
                disabled={isLoading}
                pattern="^[A-Za-z0-9]+$"
                autoFocus
                containerClassName="justify-between gap-2 sm:gap-3"
              >
                <InputOTPGroup className="contents">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className={cn(
                        "h-14 w-full flex-1 rounded-xl border-stone-200 bg-white text-xl font-semibold uppercase",
                        "first:rounded-l-xl last:rounded-r-xl",
                        "data-[active=true]:border-stone-950 data-[active=true]:ring-2 data-[active=true]:ring-stone-950/10",
                        displayError &&
                          "border-red-300 data-[active=true]:border-red-500 data-[active=true]:ring-red-500/15"
                      )}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {/* Error */}
              {displayError ? (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <span>{displayError}</span>
                </div>
              ) : (
                <p className="mt-3 text-xs text-stone-500">
                  The code is case-insensitive. Letters and numbers only.
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading || !isComplete}
                className={cn(
                  "mt-6 h-12 w-full rounded-xl text-base font-semibold",
                  "bg-stone-950 text-stone-50 hover:bg-stone-800",
                  "disabled:bg-stone-200 disabled:text-stone-400"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Activating device…
                  </>
                ) : (
                  <>
                    Activate device
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer help */}
            <div className="mt-8 rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-medium text-stone-900">
                Don&apos;t have a code?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                Ask your administrator to generate one from{" "}
                <span className="font-medium text-stone-900">
                  Settings → Devices → Add tablet
                </span>
                .
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-stone-500">
              Having trouble?{" "}
              <a
                href="#"
                className="font-medium text-stone-900 underline-offset-4 hover:underline"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
