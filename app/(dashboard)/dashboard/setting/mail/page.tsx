"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Save, Loader2, AlertTriangle, ArrowLeft, Send, ExternalLink, Calendar as CalendarLog, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  useMailSettings,
  useUpdateMailSettings,
  useTestMailSettings,
  useActivityLogs,
  useCreateActivityLog,
} from "@/lib/queries/settings"

type MailSettings = {
  fromEmail: string
  fromName: string
  apiKey: string
  hasApiKey: boolean
}

type ActivityLog = {
  id: string
  action: string
  timestamp: Date
  details: string
  status: "success" | "error" | "warning"
}

export default function MailSettingsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<MailSettings>({
    fromEmail: "",
    fromName: "",
    apiKey: "",
    hasApiKey: false,
  })
  const [testEmail, setTestEmail] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityLogsPage, setActivityLogsPage] = useState(1)
  const [totalLogsPages, setTotalLogsPages] = useState(1)

  const isAdmin = isAdminOrSuperAdmin(user?.role ?? null)

  // TanStack Query hooks
  const mailSettingsQuery = useMailSettings()
  const updateMailSettingsMutation = useUpdateMailSettings()
  const testMailSettingsMutation = useTestMailSettings()
  const activityLogsQuery = useActivityLogs('mail', activityLogsPage)
  const createActivityLogMutation = useCreateActivityLog()

  useEffect(() => {
    if (mailSettingsQuery.data?.settings) {
      setSettings({
        ...mailSettingsQuery.data.settings,
        apiKey: "",
      })
    }
  }, [mailSettingsQuery.data])

  useEffect(() => {
    if (activityLogsQuery.data) {
      const newLogs = activityLogsQuery.data.logs.map((log: any) => ({
        id: log._id,
        action: log.action,
        timestamp: new Date(log.createdAt),
        details: log.details,
        status: log.status,
      }))
      setActivityLogs(newLogs)
      setTotalLogsPages(Math.ceil((activityLogsQuery.data.total || 0) / 10))
    }
  }, [activityLogsQuery.data])

  const addLog = (action: string, details: string, status: ActivityLog["status"]) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      action,
      timestamp: new Date(),
      details,
      status,
    }
    setActivityLogs((prev) => [newLog, ...prev].slice(0, 10))
    createActivityLogMutation.mutate({ action, details, status, category: "mail" })
  }

  const handleSave = async () => {
    try {
      if (!settings.fromEmail) {
        toast.error("Please fill in from email")
        return
      }

      if (!settings.hasApiKey && !settings.apiKey) {
        toast.error("Please enter Maileroo API key")
        return
      }

      const body: any = {
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
      }

      if (settings.apiKey) {
        body.apiKey = settings.apiKey
      }

      await updateMailSettingsMutation.mutateAsync(body)
      toast.success("Mail settings saved successfully!")
      addLog("Settings Saved", "Mail settings updated successfully", "success")
      setHasUnsavedChanges(false)
    } catch (error: any) {
      toast.error("Failed to save settings")
      addLog("Save Failed", error?.message || "Failed to save mail settings", "error")
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }

    try {
      const result = await testMailSettingsMutation.mutateAsync({ testEmail })
      const message = result.success ? (result.data as any).message : "Test email sent successfully!"
      toast.success(message)
      addLog("Test Email Sent", `Test email sent to ${testEmail}`, "success")
    } catch (error: any) {
      toast.error("Test failed")
      addLog("Test Email Failed", error?.message || `Failed to send test email to ${testEmail}`, "error")
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
      <div className="flex flex-col space-y-4 p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only administrators can access settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      {/* Header with Back Button */}
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/setting")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Button>
        <h1 className="text-2xl font-semibold">Mail Settings</h1>
        <p className="text-muted-foreground">Configure Maileroo API for email notifications.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Settings Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Maileroo Configuration</CardTitle>
                  <CardDescription>Configure email delivery service for notifications</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Unsaved Changes Warning */}
              {hasUnsavedChanges && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">Unsaved Changes</p>
                    <p className="text-sm text-yellow-700">Remember to save your changes.</p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Get your Maileroo credentials:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-2">
                    <li>Sign up at <a href="https://maileroo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">maileroo.com <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Dashboard → API Keys → Create New Key</li>
                    <li>Copy the API key and paste below</li>
                    <li>Set your verified sender email address</li>
                  </ol>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">
                    Maileroo API Key
                    {settings.hasApiKey && (
                      <span className="ml-2 text-xs text-green-600 font-normal">✓ Saved</span>
                    )}
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => {
                      setSettings({ ...settings, apiKey: e.target.value })
                      setHasUnsavedChanges(true)
                    }}
                    placeholder={settings.hasApiKey ? "••••••••" : "Enter API key"}
                  />
                  {settings.hasApiKey && (
                    <p className="text-xs text-muted-foreground">Leave empty to keep existing</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={settings.fromEmail}
                    onChange={(e) => {
                      setSettings({ ...settings, fromEmail: e.target.value })
                      setHasUnsavedChanges(true)
                    }}
                    placeholder="noreply@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name (Optional)</Label>
                  <Input
                    id="fromName"
                    value={settings.fromName}
                    onChange={(e) => {
                      setSettings({ ...settings, fromName: e.target.value })
                      setHasUnsavedChanges(true)
                    }}
                    placeholder="Your Company Name"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={updateMailSettingsMutation.isPending || !hasUnsavedChanges}
                >
                  {updateMailSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {hasUnsavedChanges ? "Save Changes" : "No Changes"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Email Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Test Email</CardTitle>
                  <CardDescription>Send a test email to verify your configuration</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>

              <Button
                onClick={handleTestEmail}
                disabled={testMailSettingsMutation.isPending || !settings.hasApiKey}
                variant="outline"
              >
                {testMailSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>

              {!settings.hasApiKey && (
                <p className="text-xs text-muted-foreground">
                  Save your API key first before testing
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* Activity Logs Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarLog className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Activity Logs</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {activityLogsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                  ) : (
                    <>
                      {activityLogs.map((log) => (
                        <div
                          key={log.id}
                          className={cn(
                            "p-3 rounded-lg border text-sm",
                            log.status === "success" && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900",
                            log.status === "error" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
                            log.status === "warning" && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900"
                          )}
                        >
                          <div className="flex items-start gap-2 mb-1">
                            <span className="font-medium flex-1">{log.action}</span>
                            <span
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full",
                                log.status === "success" && "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-100",
                                log.status === "error" && "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-100",
                                log.status === "warning" && "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                              )}
                            >
                              {log.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{log.details}</p>
                          <p className="text-xs text-muted-foreground">{log.timestamp.toLocaleString()}</p>
                        </div>
                      ))}

                      {totalLogsPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActivityLogsPage((p) => p - 1)}
                            disabled={activityLogsPage === 1 || activityLogsQuery.isLoading}
                            className="h-8"
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                          </Button>

                          <span className="text-xs text-muted-foreground">
                            Page {activityLogsPage} of {totalLogsPages}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActivityLogsPage((p) => p + 1)}
                            disabled={activityLogsPage === totalLogsPages || activityLogsQuery.isLoading}
                            className="h-8"
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
