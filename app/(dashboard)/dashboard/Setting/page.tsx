"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useAuth } from "@/lib/hooks/useAuth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Image, Database, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

export default function SettingPage() {
  const { user, isHydrated } = useAuth()
  const [cloudinaryDate, setCloudinaryDate] = useState<Date | undefined>(undefined)
  const [timesheetDate, setTimesheetDate] = useState<Date | undefined>(undefined)
  const [cloudinaryOpen, setCloudinaryOpen] = useState(false)
  const [timesheetOpen, setTimesheetOpen] = useState(false)
  const [confirmCloudinary, setConfirmCloudinary] = useState(false)
  const [confirmTimesheet, setConfirmTimesheet] = useState(false)
  const [cloudinaryLoading, setCloudinaryLoading] = useState(false)
  const [timesheetLoading, setTimesheetLoading] = useState(false)
  const [cloudinaryResult, setCloudinaryResult] = useState<string | null>(null)
  const [timesheetResult, setTimesheetResult] = useState<string | null>(null)

  const isAdmin = isAdminOrSuperAdmin(user?.role ?? null)

  const handleCloudinarySubmit = () => {
    if (!cloudinaryDate) return
    setConfirmCloudinary(true)
  }

  const handleCloudinaryConfirm = async () => {
    if (!cloudinaryDate) return
    setCloudinaryLoading(true)
    setCloudinaryResult(null)
    try {
      const res = await fetch("/api/admin/cleanup/cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beforeDate: format(cloudinaryDate, "yyyy-MM-dd"),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCloudinaryResult(
          `Deleted ${data.deleted ?? 0} image(s).${(data.errors ?? 0) > 0 ? ` ${data.errors} errors.` : ""}`
        )
        setCloudinaryDate(undefined)
        setConfirmCloudinary(false)
      } else {
        setCloudinaryResult(data.error ?? "Failed to delete images")
      }
    } catch {
      setCloudinaryResult("Network error")
    } finally {
      setCloudinaryLoading(false)
    }
  }

  const handleTimesheetSubmit = () => {
    if (!timesheetDate) return
    setConfirmTimesheet(true)
  }

  const handleTimesheetConfirm = async () => {
    if (!timesheetDate) return
    setTimesheetLoading(true)
    setTimesheetResult(null)
    try {
      const res = await fetch("/api/admin/cleanup/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beforeDate: format(timesheetDate, "yyyy-MM-dd"),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTimesheetResult(
          `Deleted ${data.deleted ?? 0} timesheet record(s).`
        )
        setTimesheetDate(undefined)
        setConfirmTimesheet(false)
      } else {
        setTimesheetResult(data.error ?? "Failed to delete timesheets")
      }
    } catch {
      setTimesheetResult("Network error")
    } finally {
      setTimesheetLoading(false)
    }
  }

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            Only administrators can access settings and cleanup.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Admin-only cleanup and data management.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              <CardTitle>Delete Cloudinary Images</CardTitle>
            </div>
            <CardDescription>
              Remove punch photos (timesheet folder) uploaded before the selected date from Cloudinary. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Popover open={cloudinaryOpen} onOpenChange={setCloudinaryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !cloudinaryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {cloudinaryDate
                    ? format(cloudinaryDate, "d MMM yyyy")
                    : "Pick cutoff date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={cloudinaryDate}
                  onSelect={(d) => {
                    setCloudinaryDate(d)
                    setCloudinaryOpen(false)
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="destructive"
              onClick={handleCloudinarySubmit}
              disabled={!cloudinaryDate}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete images older than date
            </Button>
            {cloudinaryResult && (
              <p
                className={cn(
                  "text-sm",
                  cloudinaryResult.startsWith("Deleted")
                    ? "text-green-600"
                    : "text-destructive"
                )}
              >
                {cloudinaryResult}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Delete Timesheet Data</CardTitle>
            </div>
            <CardDescription>
              Remove timesheet records with date before the selected date from the database. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Popover open={timesheetOpen} onOpenChange={setTimesheetOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !timesheetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {timesheetDate
                    ? format(timesheetDate, "d MMM yyyy")
                    : "Pick cutoff date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={timesheetDate}
                  onSelect={(d) => {
                    setTimesheetDate(d)
                    setTimesheetOpen(false)
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="destructive"
              onClick={handleTimesheetSubmit}
              disabled={!timesheetDate}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete data older than date
            </Button>
            {timesheetResult && (
              <p
                className={cn(
                  "text-sm",
                  timesheetResult.startsWith("Deleted")
                    ? "text-green-600"
                    : "text-destructive"
                )}
              >
                {timesheetResult}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmCloudinary} onOpenChange={setConfirmCloudinary}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cloudinary images?</AlertDialogTitle>
            <AlertDialogDescription>
              All punch photos in Cloudinary uploaded before{" "}
              <strong>{cloudinaryDate ? format(cloudinaryDate, "d MMM yyyy") : ""}</strong>{" "}
              will be permanently deleted. This cannot be undone and may leave orphaned image URLs in timesheet records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cloudinaryLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleCloudinaryConfirm()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cloudinaryLoading}
            >
              {cloudinaryLoading ? "Deleting..." : "Delete images"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmTimesheet} onOpenChange={setConfirmTimesheet}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete timesheet data?</AlertDialogTitle>
            <AlertDialogDescription>
              All timesheet records with date before{" "}
              <strong>{timesheetDate ? format(timesheetDate, "d MMM yyyy") : ""}</strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={timesheetLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleTimesheetConfirm()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={timesheetLoading}
            >
              {timesheetLoading ? "Deleting..." : "Delete data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
