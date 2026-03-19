"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Save, Loader2, AlertTriangle, ArrowLeft, Send, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useMailSettings, useUpdateMailSettings, useTestMailSettings } from "@/lib/queries/settings"

type MailSettings = {
  fromEmail: string
  fromName: string
  apiKey: string
  hasApiKey: boolean
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

  const isAdmin = isAdminOrSuperAdmin(user?.role ?? null)

  // TanStack Query hooks
  const mailSettingsQuery = useMailSettings()
  const updateMailSettingsMutation = useUpdateMailSettings()
  const testMailSettingsMutation = useTestMailSettings()

  useEffect(() => {
    if (mailSettingsQuery.data?.settings) {
      setSettings({
        ...mailSettingsQuery.data.settings,
        apiKey: "", // Don't load API key
      })
    }
  }, [mailSettingsQuery.data])

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
      setHasUnsavedChanges(false)
    } catch (error) {
      toast.error("Failed to save settings")
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
    } catch (error) {
      toast.error("Test failed")
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

      <div className="max-w-3xl space-y-6">
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
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
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
    </div>
  )
}
