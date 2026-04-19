"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Trash2, Cloud, Save, ExternalLink, CheckCircle2, AlertTriangle, Loader2, Calendar as CalendarLog, HardDrive, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ConfirmDialogShell } from "@/components/shared/forms"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { 
  useStorageSettings, 
  useUpdateStorageSettings, 
  useTestStorageConnection,
  useStorageStats,
  useActivityLogs,
  useCreateActivityLog,
  useCleanupCloudinary,
} from "@/lib/queries/settings"

type StorageProvider = "cloudinary" | "r2"

type StorageSettings = {
  provider: StorageProvider
  isActive: boolean
  cloudinary?: {
    cloudName: string
    apiKey: string
    apiSecret: string
    hasSecret: boolean
  }
  r2?: {
    accountId: string
    accessKeyId: string
    secretAccessKey: string
    bucketName: string
    publicUrl: string
    hasSecret: boolean
  }
}

type ActivityLog = {
  id: string
  action: string
  timestamp: Date
  details: string
  status: "success" | "error" | "warning"
}

type StorageStats = {
  storageUsedMB: number
  storageLimitMB: number | null
  assets: number
  bandwidth: number | null
  // Cloudinary specific
  images?: number
  videos?: number
  transformations?: number
  transformationsLimit?: number
  bandwidthLimit?: number
  lastSync?: Date
  // R2 specific
  other?: number
  bucketName?: string

  // Allow provider-specific extended stats without breaking the UI
  [key: string]: any
}

export default function SettingPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [storageProvider, setStorageProvider] = useState<StorageProvider>("cloudinary")
  const [cloudinarySettings, setCloudinarySettings] = useState({
    cloudName: "",
    apiKey: "",
    apiSecret: "",
  })
  const [r2Settings, setR2Settings] = useState({
    accountId: "",
    accessKeyId: "",
    secretAccessKey: "",
    bucketName: "",
    publicUrl: "",
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityLogsPage, setActivityLogsPage] = useState(1)
  const [totalLogsPages, setTotalLogsPages] = useState(1)
  
  const [cloudinaryDate, setCloudinaryDate] = useState<Date | undefined>(undefined)
  const [cloudinaryOpen, setCloudinaryOpen] = useState(false)
  const [confirmCloudinary, setConfirmCloudinary] = useState(false)

  const isAdmin = isAdminOrSuperAdmin(user?.role ?? null)

  // TanStack Query hooks
  const storageSettingsQuery = useStorageSettings()
  const updateStorageSettingsMutation = useUpdateStorageSettings()
  const testStorageConnectionMutation = useTestStorageConnection()
  const storageStatsQuery = useStorageStats()
  const activityLogsQuery = useActivityLogs('storage', activityLogsPage)
  const createActivityLogMutation = useCreateActivityLog()
  const cleanupCloudinaryMutation = useCleanupCloudinary()

  const currentSettings = storageSettingsQuery.data?.settings || null
  const storageStats = storageStatsQuery.data?.stats || null
  const storageStatsError = (storageStatsQuery.data as any)?.error || null
  const storageProvider_ = (storageStatsQuery.data as any)?.provider || currentSettings?.provider || null

  // Update activity logs when query data changes
  useEffect(() => {
    const logs = (activityLogsQuery.data as any)?.logs
    const total = (activityLogsQuery.data as any)?.total
    if (Array.isArray(logs)) {
      const newLogs = logs.map((log: any) => ({
        id: log._id,
        action: log.action,
        timestamp: new Date(log.createdAt),
        details: log.details,
        status: log.status,
      }))
      
      setActivityLogs(newLogs)
      const totalPages = Math.ceil((typeof total === "number" ? total : 0) / 10)
      setTotalLogsPages(totalPages)
    } else if (activityLogsQuery.data) {
      // Defensive: backend may return { error } or a different shape.
      setActivityLogs([])
      setTotalLogsPages(1)
    }
  }, [activityLogsQuery.data])

  // Load settings when query data changes
  useEffect(() => {
    if (currentSettings) {
      setStorageProvider(currentSettings.provider)
      
      // Always load both provider settings if they exist
      if (currentSettings.cloudinary) {
        setCloudinarySettings({
          cloudName: currentSettings.cloudinary.cloudName,
          apiKey: currentSettings.cloudinary.apiKey,
          apiSecret: "", // Keep empty - will use existing if not changed
        })
      }
      
      if (currentSettings.r2) {
        setR2Settings({
          accountId: currentSettings.r2.accountId,
          accessKeyId: currentSettings.r2.accessKeyId,
          secretAccessKey: "", // Keep empty - will use existing if not changed
          bucketName: currentSettings.r2.bucketName,
          publicUrl: currentSettings.r2.publicUrl,
        })
      }
    }
  }, [currentSettings])

  // Track unsaved changes
  useEffect(() => {
    if (!currentSettings) {
      // If no settings exist, check if any fields are filled
      const cloudinaryFilled = cloudinarySettings.cloudName || cloudinarySettings.apiKey || cloudinarySettings.apiSecret
      const r2Filled = r2Settings.accountId || r2Settings.accessKeyId || r2Settings.secretAccessKey || r2Settings.bucketName
      setHasUnsavedChanges(!!(cloudinaryFilled || r2Filled))
      return
    }
    
    const cloudinaryChanged = 
      cloudinarySettings.cloudName !== (currentSettings.cloudinary?.cloudName || "") ||
      cloudinarySettings.apiKey !== (currentSettings.cloudinary?.apiKey || "") ||
      cloudinarySettings.apiSecret !== ""
    
    const r2Changed = 
      r2Settings.accountId !== (currentSettings.r2?.accountId || "") ||
      r2Settings.accessKeyId !== (currentSettings.r2?.accessKeyId || "") ||
      r2Settings.bucketName !== (currentSettings.r2?.bucketName || "") ||
      r2Settings.publicUrl !== (currentSettings.r2?.publicUrl || "") ||
      r2Settings.secretAccessKey !== ""
    
    setHasUnsavedChanges(cloudinaryChanged || r2Changed)
  }, [cloudinarySettings, r2Settings, currentSettings])

  const addLog = (action: string, details: string, status: ActivityLog["status"]) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      action,
      timestamp: new Date(),
      details,
      status,
    }
    setActivityLogs((prev) => [newLog, ...prev].slice(0, 10))
    
    // Save to database using mutation
    createActivityLogMutation.mutate({ action, details, status, category: "storage" })
  }

  const fetchActivityLogs = (page: number) => {
    setActivityLogsPage(page)
    // This will trigger the query to refetch with the new page
  }

  const handleStorageProviderChange = async (provider: StorageProvider) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("You have unsaved changes. Do you want to save them before switching providers?")
      if (confirmed) {
        await handleStorageSave()
      }
    }
    
    // If both providers are already configured, just switch and save
    if (
      (provider === "cloudinary" && currentSettings?.cloudinary?.hasSecret) ||
      (provider === "r2" && currentSettings?.r2?.hasSecret)
    ) {
      setStorageProvider(provider)
      
      // Auto-save the provider switch
      try {
        const body: any = { provider }
        
        // Include the provider's credentials (they're already in the database)
        if (provider === "cloudinary" && currentSettings?.cloudinary) {
          body.cloudinary = {
            cloudName: currentSettings.cloudinary.cloudName,
            apiKey: currentSettings.cloudinary.apiKey,
            // Secret is already in database, don't send it
          }
        } else if (provider === "r2" && currentSettings?.r2) {
          body.r2 = {
            accountId: currentSettings.r2.accountId,
            accessKeyId: currentSettings.r2.accessKeyId,
            bucketName: currentSettings.r2.bucketName,
            publicUrl: currentSettings.r2.publicUrl,
            // Secret is already in database, don't send it
          }
        }
        
        await updateStorageSettingsMutation.mutateAsync(body)
        toast.success(`Switched to ${provider === "cloudinary" ? "Cloudinary" : "Cloudflare R2"}`)
        addLog("Provider Switched", `Switched to ${provider === "cloudinary" ? "Cloudinary" : "Cloudflare R2"}`, "success")
      } catch (error) {
        toast.error("Failed to switch provider")
      }
    } else {
      // Provider not configured yet, just switch the UI
      setStorageProvider(provider)
    }
  }

  const handleTestConnection = async () => {
    try {
      const credentials = storageProvider === "cloudinary"
        ? {
            cloudName: cloudinarySettings.cloudName,
            apiKey: cloudinarySettings.apiKey,
            apiSecret: cloudinarySettings.apiSecret || "existing",
          }
        : {
            accountId: r2Settings.accountId,
            accessKeyId: r2Settings.accessKeyId,
            secretAccessKey: r2Settings.secretAccessKey || "existing",
            bucketName: r2Settings.bucketName,
          }

      console.log("Testing connection with:", {
        provider: storageProvider,
        credentials: storageProvider === "r2" 
          ? { ...credentials, secretAccessKey: credentials.secretAccessKey ? "***" : "empty" }
          : { ...credentials, apiSecret: credentials.apiSecret ? "***" : "empty" }
      })

      // Validate non-secret fields are filled
      if (storageProvider === "cloudinary") {
        if (!credentials.cloudName || !credentials.apiKey) {
          toast.error("Please fill in Cloud Name and API Key")
          return
        }
        // Check if we have a secret (either new or existing)
        if (!credentials.apiSecret && !currentSettings?.cloudinary?.hasSecret) {
          toast.error("Please enter API Secret")
          return
        }
      } else {
        if (!credentials.accountId || !credentials.accessKeyId || !credentials.bucketName) {
          toast.error("Please fill in Account ID, Access Key ID, and Bucket Name")
          return
        }
        // Check if we have a secret (either new or existing)
        if (!credentials.secretAccessKey && !currentSettings?.r2?.hasSecret) {
          toast.error("Please enter Secret Access Key")
          return
        }
      }

      const result = await testStorageConnectionMutation.mutateAsync({ 
        provider: storageProvider, 
        credentials 
      })

      const message = result.success ? (result.data as any).message : "Connection test successful!"
      toast.success(message)
      addLog("Connection Test", `Successfully connected to ${storageProvider === "cloudinary" ? "Cloudinary" : "Cloudflare R2"}`, "success")
    } catch (error: any) {
      toast.error(error.message || "Connection test failed")
      addLog("Connection Test", error.message || "Failed to connect", "error")
    }
  }

  const handleStorageSave = async () => {
    try {
      const body: any = { provider: storageProvider }
      
      if (storageProvider === "cloudinary") {
        // Check if this is initial setup (no existing secret) or just switching
        const isInitialSetup = !currentSettings?.cloudinary?.hasSecret
        
        if (isInitialSetup && !cloudinarySettings.apiSecret) {
          toast.error("Please enter API Secret for initial Cloudinary setup")
          return
        }
        
        if (!cloudinarySettings.cloudName || !cloudinarySettings.apiKey) {
          toast.error("Please fill in Cloud Name and API Key")
          return
        }
        
        body.cloudinary = {
          cloudName: cloudinarySettings.cloudName,
          apiKey: cloudinarySettings.apiKey,
          // Only send secret if it's been changed
          ...(cloudinarySettings.apiSecret && { apiSecret: cloudinarySettings.apiSecret }),
        }
      } else {
        // Check if this is initial setup (no existing secret) or just switching
        const isInitialSetup = !currentSettings?.r2?.hasSecret
        
        if (isInitialSetup && !r2Settings.secretAccessKey) {
          toast.error("Please enter Secret Access Key for initial R2 setup")
          return
        }
        
        if (!r2Settings.accountId || !r2Settings.accessKeyId || !r2Settings.bucketName) {
          toast.error("Please fill in all required R2 fields")
          return
        }
        
        body.r2 = {
          accountId: r2Settings.accountId,
          accessKeyId: r2Settings.accessKeyId,
          bucketName: r2Settings.bucketName,
          publicUrl: r2Settings.publicUrl,
          // Only send secret if it's been changed
          ...(r2Settings.secretAccessKey && { secretAccessKey: r2Settings.secretAccessKey }),
        }
      }
      
      await updateStorageSettingsMutation.mutateAsync(body)
      toast.success(`Switched to ${storageProvider === "cloudinary" ? "Cloudinary" : "Cloudflare R2"} successfully!`)
      addLog("Storage Provider Changed", `Switched to ${storageProvider === "cloudinary" ? "Cloudinary" : "Cloudflare R2"}`, "success")
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings")
      addLog("Save Failed", error.message || "Failed to save settings", "error")
    }
  }

  const handleCloudinaryConfirm = async () => {
    if (!cloudinaryDate) return
    try {
      const result = await cleanupCloudinaryMutation.mutateAsync({
        beforeDate: format(cloudinaryDate, "yyyy-MM-dd"),
      })
      toast.success(`Deleted ${result.deleted ?? 0} image(s)`)
      addLog("Images Deleted", `Deleted ${result.deleted ?? 0} images older than ${format(cloudinaryDate, "d MMM yyyy")}`, "success")
      setCloudinaryDate(undefined)
      setConfirmCloudinary(false)
    } catch (error: any) {
      toast.error(error.message ?? "Failed to delete images")
      addLog("Delete Failed", error.message ?? "Failed to delete images", "error")
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

  const storageUsagePercent = storageStats && storageStats.storageLimitMB
    ? (storageStats.storageUsedMB / storageStats.storageLimitMB) * 100
    : 0

  function formatSize(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    return `${(mb * 1024).toFixed(1)} KB`
  }

  function formatSizeKB(kb: number): string {
    if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(2)} GB`
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
    return `${kb.toFixed(1)} KB`
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
        <h1 className="text-2xl font-semibold">Image Storage Settings</h1>
        <p className="text-muted-foreground">Configure storage and manage data cleanup.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Storage Configuration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Image Storage</CardTitle>
                  <CardDescription>Configure where employee clock-in photos are stored</CardDescription>
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
                    <p className="text-sm text-yellow-700">Remember to save before switching providers.</p>
                  </div>
                </div>
              )}

              {/* Storage Provider Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Storage Provider</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleStorageProviderChange("cloudinary")}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      storageProvider === "cloudinary"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Cloudinary</div>
                      {storageProvider === "cloudinary" && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Media management</div>
                  </button>
                  <button
                    onClick={() => handleStorageProviderChange("r2")}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      storageProvider === "r2"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Cloudflare R2</div>
                      {storageProvider === "r2" && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">S3-compatible</div>
                  </button>
                </div>
              </div>

              {/* Credentials Form */}
              {storageProvider === "cloudinary" ? (
                <div className="space-y-4 bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Get your credentials:</p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-2">
                      <li>Sign up at <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">cloudinary.com <ExternalLink className="h-3 w-3" /></a></li>
                      <li>Dashboard → Settings → Access Keys</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cloudName">Cloud Name</Label>
                    <Input
                      id="cloudName"
                      value={cloudinarySettings.cloudName}
                      onChange={(e) => setCloudinarySettings({ ...cloudinarySettings, cloudName: e.target.value })}
                      placeholder="my-cloud-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      value={cloudinarySettings.apiKey}
                      onChange={(e) => setCloudinarySettings({ ...cloudinarySettings, apiKey: e.target.value })}
                      placeholder="123456789012345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">
                      API Secret
                      {currentSettings?.cloudinary?.hasSecret && (
                        <span className="ml-2 text-xs text-green-600 font-normal">✓ Saved</span>
                      )}
                    </Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      value={cloudinarySettings.apiSecret}
                      onChange={(e) => setCloudinarySettings({ ...cloudinarySettings, apiSecret: e.target.value })}
                      placeholder={currentSettings?.cloudinary?.hasSecret ? "••••••••" : "Enter secret"}
                    />
                    {currentSettings?.cloudinary?.hasSecret && (
                      <p className="text-xs text-muted-foreground">Leave empty to keep existing</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Get your R2 credentials:</p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-2">
                      <li><a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Cloudflare <ExternalLink className="h-3 w-3" /></a> → R2</li>
                      <li>Create bucket → Manage API Tokens</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountId">Account ID</Label>
                      <Input
                        id="accountId"
                        value={r2Settings.accountId}
                        onChange={(e) => setR2Settings({ ...r2Settings, accountId: e.target.value })}
                        placeholder="abc123"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bucketName">Bucket Name</Label>
                      <Input
                        id="bucketName"
                        value={r2Settings.bucketName}
                        onChange={(e) => setR2Settings({ ...r2Settings, bucketName: e.target.value })}
                        placeholder="my-bucket"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessKeyId">Access Key ID</Label>
                    <Input
                      id="accessKeyId"
                      value={r2Settings.accessKeyId}
                      onChange={(e) => setR2Settings({ ...r2Settings, accessKeyId: e.target.value })}
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secretAccessKey">
                      Secret Access Key
                      {currentSettings?.r2?.hasSecret && (
                        <span className="ml-2 text-xs text-green-600 font-normal">✓ Saved</span>
                      )}
                    </Label>
                    <Input
                      id="secretAccessKey"
                      type="password"
                      value={r2Settings.secretAccessKey}
                      onChange={(e) => setR2Settings({ ...r2Settings, secretAccessKey: e.target.value })}
                      placeholder={currentSettings?.r2?.hasSecret ? "••••••••" : "Enter secret"}
                    />
                    {currentSettings?.r2?.hasSecret && (
                      <p className="text-xs text-muted-foreground">Leave empty to keep existing</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publicUrl">Public URL (Optional)</Label>
                    <Input
                      id="publicUrl"
                      value={r2Settings.publicUrl}
                      onChange={(e) => setR2Settings({ ...r2Settings, publicUrl: e.target.value })}
                      placeholder="https://images.yourdomain.com"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleTestConnection}
                  disabled={testStorageConnectionMutation.isPending}
                  variant="outline"
                >
                  {testStorageConnectionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                <Button
                  onClick={handleStorageSave}
                  disabled={updateStorageSettingsMutation.isPending || !hasUnsavedChanges}
                >
                  {updateStorageSettingsMutation.isPending ? (
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

          {/* Data Management Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <div>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>Remove old data to free up storage space</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Delete Images */}
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold mb-1">Delete Cloud Images</h3>
                      <p className="text-sm text-muted-foreground">Remove punch photos older than selected date</p>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Delete images before</Label>
                        <Popover open={cloudinaryOpen} onOpenChange={setCloudinaryOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1",
                                !cloudinaryDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {cloudinaryDate ? format(cloudinaryDate, "d MMM yyyy") : "Pick date"}
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
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setConfirmCloudinary(true)}
                        disabled={!cloudinaryDate}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* Storage Stats Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Storage Stats</CardTitle>
                    {currentSettings && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {currentSettings.provider === "cloudinary" ? "Cloudinary" : "Cloudflare R2"}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => storageStatsQuery.refetch()}
                  disabled={storageStatsQuery.isLoading}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={cn("h-4 w-4", storageStatsQuery.isLoading && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {storageStatsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : storageStats ? (
                storageProvider_ === "r2" ? (
                  <>
                    {/* R2: Storage overview */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Total Storage</span>
                        <span className="text-sm font-medium">{formatSize(storageStats.storageUsedMB)}</span>
                      </div>
                      {Boolean((storageStats as any).bucketName) && (
                        <p className="text-xs text-muted-foreground">
                          Bucket: {(storageStats as any).bucketName}
                        </p>
                      )}
                    </div>

                    {/* R2: Files breakdown */}
                    <div className="pt-3 border-t space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Files</span>
                        <span className="text-sm font-medium">{storageStats.assets.toLocaleString()}</span>
                      </div>

                      {(storageStats.images ?? 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground pl-3">Images</span>
                          <span className="text-xs font-medium">
                            {(storageStats.images ?? 0).toLocaleString()}
                            {(storageStats as any).imageSizeMB != null && (
                              <span className="text-muted-foreground font-normal ml-1">
                                ({formatSize((storageStats as any).imageSizeMB)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {(storageStats.videos ?? 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground pl-3">Videos</span>
                          <span className="text-xs font-medium">
                            {(storageStats.videos ?? 0).toLocaleString()}
                            {(storageStats as any).videoSizeMB != null && (
                              <span className="text-muted-foreground font-normal ml-1">
                                ({formatSize((storageStats as any).videoSizeMB)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {(storageStats.other ?? 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground pl-3">Other</span>
                          <span className="text-xs font-medium">
                            {(storageStats.other ?? 0).toLocaleString()}
                            {(storageStats as any).otherSizeMB != null && (
                              <span className="text-muted-foreground font-normal ml-1">
                                ({formatSize((storageStats as any).otherSizeMB)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* R2: File size stats */}
                    <div className="pt-3 border-t space-y-2.5">
                      <span className="text-sm font-medium">File Sizes</span>
                      {(storageStats as any).avgFileSizeKB != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground pl-3">Average</span>
                          <span className="text-xs font-medium">{formatSizeKB((storageStats as any).avgFileSizeKB)}</span>
                        </div>
                      )}
                      {(storageStats as any).largestFileSizeKB != null && (storageStats as any).largestFileSizeKB > 0 && (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground pl-3">Largest</span>
                            <span className="text-xs font-medium">{formatSizeKB((storageStats as any).largestFileSizeKB)}</span>
                          </div>
                          {(storageStats as any).largestFileName && (
                            <p className="text-[10px] text-muted-foreground pl-3 truncate" title={(storageStats as any).largestFileName}>
                              {(storageStats as any).largestFileName}
                            </p>
                          )}
                        </div>
                      )}
                      {(storageStats as any).smallestFileSizeKB != null && storageStats.assets > 1 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground pl-3">Smallest</span>
                          <span className="text-xs font-medium">{formatSizeKB((storageStats as any).smallestFileSizeKB)}</span>
                        </div>
                      )}
                    </div>

                    {/* R2: File types */}
                    {(storageStats as any).topExtensions?.length > 0 && (
                      <div className="pt-3 border-t space-y-2.5">
                        <span className="text-sm font-medium">File Types</span>
                        {(storageStats as any).topExtensions.map((ext: any) => (
                          <div key={ext.ext} className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground pl-3">.{ext.ext}</span>
                            <span className="text-xs font-medium">
                              {ext.count}
                              <span className="text-muted-foreground font-normal ml-1">({formatSize(ext.sizeMB)})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* R2: Folders */}
                    {(storageStats as any).folderCount > 0 && (
                      <div className="pt-3 border-t space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Folders</span>
                          <span className="text-xs font-medium">{(storageStats as any).folderCount}</span>
                        </div>
                        {(storageStats as any).folders?.map((folder: string) => (
                          <p key={folder} className="text-[10px] text-muted-foreground pl-3 truncate" title={folder}>
                            /{folder}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* R2: Date range */}
                    {((storageStats as any).oldestFile || (storageStats as any).newestFile) && (
                      <div className="pt-3 border-t space-y-2.5">
                        <span className="text-sm font-medium">Date Range</span>
                        {(storageStats as any).oldestFile && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground pl-3">Oldest</span>
                            <span className="text-xs font-medium">
                              {new Date((storageStats as any).oldestFile).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                        {(storageStats as any).newestFile && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground pl-3">Newest</span>
                            <span className="text-xs font-medium">
                              {new Date((storageStats as any).newestFile).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* R2: Last Sync */}
                    {storageStats.lastSync != null && (
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-xs text-muted-foreground">Last Sync</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(storageStats.lastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Cloudinary: Plan & Credits */}
                    {storageStats.creditsLimit != null && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            Credits
                            {storageStats.plan && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                ({storageStats.plan})
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {storageStats.credits?.toFixed(2)} / {storageStats.creditsLimit}
                          </span>
                        </div>
                        <Progress
                          value={storageStats.creditsUsedPercent ?? 0}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {(storageStats.creditsLimit - (storageStats.credits ?? 0)).toFixed(2)} remaining
                          {storageStats.creditsUsedPercent != null &&
                            ` (${storageStats.creditsUsedPercent.toFixed(1)}% used)`}
                        </p>
                      </div>
                    )}

                    <div className={cn(storageStats.creditsLimit != null && "pt-4 border-t", "space-y-3")}>
                      {/* Storage */}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Storage</span>
                          <span className="text-sm font-medium">
                            {formatSize(storageStats.storageUsedMB)}
                            {storageStats.storageLimitMB != null && ` / ${formatSize(storageStats.storageLimitMB)}`}
                          </span>
                        </div>
                        {storageStats.storageCredits != null && (
                          <p className="text-xs text-muted-foreground text-right">{storageStats.storageCredits} credits</p>
                        )}
                        {storageStats.storageLimitMB != null && (
                          <Progress value={storageUsagePercent} className="h-1.5 mt-1" />
                        )}
                      </div>

                      {/* Bandwidth */}
                      {storageStats.bandwidth != null && (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Bandwidth</span>
                            <span className="text-sm font-medium">
                              {formatSize(storageStats.bandwidth)}
                              {storageStats.bandwidthLimit != null && ` / ${formatSize(storageStats.bandwidthLimit)}`}
                            </span>
                          </div>
                          {storageStats.bandwidthCredits != null && (
                            <p className="text-xs text-muted-foreground text-right">{storageStats.bandwidthCredits} credits</p>
                          )}
                        </div>
                      )}

                      {/* Transformations */}
                      {storageStats.transformations !== undefined && (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Transformations</span>
                            <span className="text-sm font-medium">
                              {storageStats.transformations.toLocaleString()}
                              {storageStats.transformationsLimit != null && ` / ${storageStats.transformationsLimit.toLocaleString()}`}
                            </span>
                          </div>
                          {storageStats.transformationsCredits != null && (
                            <p className="text-xs text-muted-foreground text-right">{storageStats.transformationsCredits} credits</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      {/* Assets breakdown */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Assets</span>
                        <span className="text-sm font-medium">
                          {storageStats.assets.toLocaleString()}
                        </span>
                      </div>

                      {storageStats.images != null && storageStats.images > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground pl-3">Images</span>
                          <span className="text-xs font-medium">{storageStats.images.toLocaleString()}</span>
                        </div>
                      )}

                      {storageStats.videos != null && storageStats.videos > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground pl-3">Videos</span>
                          <span className="text-xs font-medium">{storageStats.videos.toLocaleString()}</span>
                        </div>
                      )}

                      {storageStats.derivedResources != null && storageStats.derivedResources > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground pl-3">Derived</span>
                          <span className="text-xs font-medium">{storageStats.derivedResources.toLocaleString()}</span>
                        </div>
                      )}

                      {storageStats.storageLimitMB != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Remaining</span>
                          <span className="text-sm font-medium text-success">
                            {formatSize(storageStats.storageLimitMB - storageStats.storageUsedMB)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cloudinary: Last Sync */}
                    {storageStats.lastSync != null && (
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-xs text-muted-foreground">Last Sync</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(storageStats.lastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </>
                )
              ) : storageStatsError ? (
                <div className="space-y-2 py-4">
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{storageStatsError}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No storage configured
                </p>
              )}
            </CardContent>
          </Card>

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
                      
                      {/* Pagination Controls */}
                      {totalLogsPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchActivityLogs(activityLogsPage - 1)}
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
                            onClick={() => fetchActivityLogs(activityLogsPage + 1)}
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

      <ConfirmDialogShell
        open={confirmCloudinary}
        onOpenChange={setConfirmCloudinary}
        title="Delete cloud images?"
        description={
          <>
            All punch photos uploaded before{" "}
            <strong>{cloudinaryDate ? format(cloudinaryDate, "d MMM yyyy") : ""}</strong>{" "}
            will be permanently deleted. This cannot be undone.
          </>
        }
        onConfirm={handleCloudinaryConfirm}
        confirmLabel={cleanupCloudinaryMutation.isPending ? "Deleting..." : "Delete Images"}
        loading={cleanupCloudinaryMutation.isPending}
        variant="destructive"
      />

    </div>
  )
}
