"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Cloud, Mail, Loader2, CheckCircle2, XCircle, Send, Settings2, Database, Shield } from "lucide-react"
import { toast } from "sonner"

export default function SystemSettingsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingR2, setTestingR2] = useState(false)
  const [testingMail, setTestingMail] = useState(false)

  // R2 Settings
  const [r2AccountId, setR2AccountId] = useState("")
  const [r2AccessKeyId, setR2AccessKeyId] = useState("")
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState("")
  const [r2BucketName, setR2BucketName] = useState("")
  const [r2PublicUrl, setR2PublicUrl] = useState("")

  // Maileroo Settings
  const [mailerooApiKey, setMailerooApiKey] = useState("")
  const [mailerooFromEmail, setMailerooFromEmail] = useState("")
  const [mailerooFromName, setMailerooFromName] = useState("")

  // Default Quotas
  const [defaultStorageQuotaGB, setDefaultStorageQuotaGB] = useState("2")
  const [defaultEmailQuotaMonthly, setDefaultEmailQuotaMonthly] = useState("500")

  // Test Email
  const [testEmail, setTestEmail] = useState("")

  const isSuperAdminUser = isSuperAdmin(user?.role ?? null)

  useEffect(() => {
    if (isHydrated && isSuperAdminUser) {
      fetchSettings()
    } else if (isHydrated && !isSuperAdminUser) {
      router.push("/dashboard")
    }
  }, [isHydrated, isSuperAdminUser, router])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/superadmin/system-settings")
      if (res.ok) {
        const data = await res.json()
        const settings = data.settings

        if (settings) {
          setR2AccountId(settings.r2AccountId || "")
          setR2AccessKeyId(settings.r2AccessKeyId || "")
          setR2BucketName(settings.r2BucketName || "")
          setR2PublicUrl(settings.r2PublicUrl || "")
          setMailerooFromEmail(settings.mailerooFromEmail || "")
          setMailerooFromName(settings.mailerooFromName || "")
          setDefaultStorageQuotaGB(((settings.defaultStorageQuotaBytes || 2147483648) / 1073741824).toString())
          setDefaultEmailQuotaMonthly((settings.defaultEmailQuotaMonthly || 500).toString())
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const body: any = {
        defaultStorageQuotaBytes: parseFloat(defaultStorageQuotaGB) * 1073741824,
        defaultEmailQuotaMonthly: parseInt(defaultEmailQuotaMonthly),
      }

      // R2 settings
      if (r2AccountId) body.r2AccountId = r2AccountId
      if (r2AccessKeyId) body.r2AccessKeyId = r2AccessKeyId
      if (r2SecretAccessKey) body.r2SecretAccessKey = r2SecretAccessKey
      if (r2BucketName) body.r2BucketName = r2BucketName
      if (r2PublicUrl) body.r2PublicUrl = r2PublicUrl

      // Maileroo settings
      if (mailerooApiKey) body.mailerooApiKey = mailerooApiKey
      if (mailerooFromEmail) body.mailerooFromEmail = mailerooFromEmail
      if (mailerooFromName) body.mailerooFromName = mailerooFromName

      const res = await fetch("/api/superadmin/system-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success("Settings saved successfully")
        setR2SecretAccessKey("") // Clear secrets after save
        setMailerooApiKey("")
        fetchSettings()
      } else {
        toast.error("Failed to save settings")
      }
    } catch (error) {
      toast.error("Error saving settings")
    } finally {
      setSaving(false)
    }
  }

  const handleTestR2 = async () => {
    try {
      setTestingR2(true)
      const res = await fetch("/api/superadmin/system-settings/test-r2", {
        method: "POST",
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "R2 connection successful")
      } else {
        toast.error(data.message || "R2 connection failed")
      }
    } catch (error) {
      toast.error("Error testing R2 connection")
    } finally {
      setTestingR2(false)
    }
  }

  const handleTestMail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }

    try {
      setTestingMail(true)
      const res = await fetch("/api/superadmin/system-settings/test-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Test email sent successfully")
      } else {
        toast.error(data.message || "Test email failed")
      }
    } catch (error) {
      toast.error("Error sending test email")
    } finally {
      setTestingMail(false)
    }
  }

  if (!isHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!isSuperAdminUser) {
    return null
  }

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start gap-4 pb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Settings2 className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure centralized storage and email infrastructure for all organizations
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* R2 Storage Configuration */}
        <Card elevation="elevated" className="overflow-hidden">
          <CardHeader className="bg-linear-to-br from-primary/5 via-primary/3 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Cloud className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Cloudflare R2 Storage</CardTitle>
                <CardDescription>Centralized file storage for all organizations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="r2AccountId" className="text-xs font-medium">
                  Account ID
                </Label>
                <Input
                  id="r2AccountId"
                  value={r2AccountId}
                  onChange={(e) => setR2AccountId(e.target.value)}
                  placeholder="abc123"
                  className="h-9 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="r2BucketName" className="text-xs font-medium">
                  Bucket Name
                </Label>
                <Input
                  id="r2BucketName"
                  value={r2BucketName}
                  onChange={(e) => setR2BucketName(e.target.value)}
                  placeholder="my-bucket"
                  className="h-9 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2AccessKeyId" className="text-xs font-medium">
                Access Key ID
              </Label>
              <Input
                id="r2AccessKeyId"
                value={r2AccessKeyId}
                onChange={(e) => setR2AccessKeyId(e.target.value)}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                className="h-9 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2SecretAccessKey" className="text-xs font-medium">
                Secret Access Key
              </Label>
              <Input
                id="r2SecretAccessKey"
                type="password"
                value={r2SecretAccessKey}
                onChange={(e) => setR2SecretAccessKey(e.target.value)}
                placeholder="Enter secret or leave empty to keep existing"
                className="h-9 font-mono transition-all focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep existing secret
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2PublicUrl" className="text-xs font-medium">
                Public URL <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="r2PublicUrl"
                value={r2PublicUrl}
                onChange={(e) => setR2PublicUrl(e.target.value)}
                placeholder="https://files.yourdomain.com"
                className="h-9 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Separator className="my-2" />

            <div className="flex items-center gap-3">
              <Button 
                onClick={handleTestR2} 
                disabled={testingR2} 
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {testingR2 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Test R2 Connection
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Verify credentials before saving
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Maileroo Configuration */}
        <Card elevation="elevated" className="overflow-hidden">
          <CardHeader className="bg-linear-to-br from-primary/5 via-primary/3 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Maileroo Email Service</CardTitle>
                <CardDescription>Centralized email delivery for all organizations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="mailerooApiKey" className="text-xs font-medium">
                Maileroo API Key
              </Label>
              <Input
                id="mailerooApiKey"
                type="password"
                value={mailerooApiKey}
                onChange={(e) => setMailerooApiKey(e.target.value)}
                placeholder="Enter API key or leave empty to keep existing"
                className="h-9 font-mono transition-all focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep existing API key
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mailerooFromEmail" className="text-xs font-medium">
                  From Email
                </Label>
                <Input
                  id="mailerooFromEmail"
                  type="email"
                  value={mailerooFromEmail}
                  onChange={(e) => setMailerooFromEmail(e.target.value)}
                  placeholder="noreply@example.com"
                  className="h-9 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mailerooFromName" className="text-xs font-medium">
                  From Name <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="mailerooFromName"
                  value={mailerooFromName}
                  onChange={(e) => setMailerooFromName(e.target.value)}
                  placeholder="Your Company"
                  className="h-9 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <Separator className="my-2" />

            <div className="space-y-3">
              <Label htmlFor="testEmail" className="text-xs font-medium">
                Test Email Configuration
              </Label>
              <div className="flex gap-2">
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 h-9 transition-all focus:ring-2 focus:ring-primary/20"
                />
                <Button 
                  onClick={handleTestMail} 
                  disabled={testingMail} 
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                >
                  {testingMail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send a test email to verify your configuration
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Default Quotas */}
        <Card elevation="elevated" className="overflow-hidden">
          <CardHeader className="bg-linear-to-br from-primary/5 via-primary/3 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Default Quotas</CardTitle>
                <CardDescription>Default quotas applied to new organizations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultStorageQuotaGB" className="text-xs font-medium">
                  Default Storage Quota (GB)
                </Label>
                <Input
                  id="defaultStorageQuotaGB"
                  type="number"
                  min="1"
                  step="0.5"
                  value={defaultStorageQuotaGB}
                  onChange={(e) => setDefaultStorageQuotaGB(e.target.value)}
                  placeholder="2"
                  className="h-9 transition-all focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">
                  Storage limit for new organizations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultEmailQuotaMonthly" className="text-xs font-medium">
                  Default Email Quota (per month)
                </Label>
                <Input
                  id="defaultEmailQuotaMonthly"
                  type="number"
                  min="1"
                  step="100"
                  value={defaultEmailQuotaMonthly}
                  onChange={(e) => setDefaultEmailQuotaMonthly(e.target.value)}
                  placeholder="500"
                  className="h-9 transition-all focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">
                  Monthly email limit for new organizations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Changes will affect all organizations</span>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            size="lg"
            className="gap-2 min-w-[160px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
