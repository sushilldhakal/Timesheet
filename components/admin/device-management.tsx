"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Tablet, 
  Plus, 
  MoreVertical, 
  MapPin, 
  Clock, 
  User, 
  Activity,
  Copy,
  QrCode,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield,
  WifiOff,
  Trash2,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useAuth } from '@/lib/hooks/use-auth'
import { isAdminOrSuperAdmin, isManager } from '@/lib/config/roles'
import { useManagedDevices, useCreateManagedDevice, useUpdateManagedDevice, useDeleteManagedDevice } from '@/lib/queries/devices'
import type { ManagedDevice } from '@/lib/types/devices'
import QRCode from 'qrcode'

interface CreateDeviceForm {
  deviceName: string
  locationName: string
  locationAddress: string
}

interface DeleteDialogState {
  open: boolean
  device: ManagedDevice | null
  step: 'revoke' | 'confirm-delete'
  revocationReason: string
}

interface QRDialogState {
  open: boolean
  device: ManagedDevice | null
  qrCodeUrl: string
}

export function DeviceManagement() {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL LOGIC
  const { userRole, isHydrated } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<CreateDeviceForm>({
    deviceName: '',
    locationName: '',
    locationAddress: '',
  })
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    device: null,
    step: 'revoke',
    revocationReason: '',
  })
  const [qrDialog, setQRDialog] = useState<QRDialogState>({
    open: false,
    device: null,
    qrCodeUrl: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive' | 'disabled' | 'revoked'>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')

  // TanStack Query hooks
  const { data: devicesData, isLoading: loading, error, refetch } = useManagedDevices()
  const createDeviceMutation = useCreateManagedDevice()
  const updateDeviceMutation = useUpdateManagedDevice()
  const deleteDeviceMutation = useDeleteManagedDevice()

  const devices = devicesData?.devices || []

  // Check permissions — admin and manager can access device management
  const isAdmin = isAdminOrSuperAdmin(userRole) || isManager(userRole)

  // Get device status with more details - MUST BE BEFORE FILTER LOGIC
  const getDeviceStatusInfo = (device: ManagedDevice) => {
    const now = new Date()
    const lastActivity = new Date(device.lastActivity)
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    
    if (!device.deviceId) {
      return {
        status: 'pending' as const,
        label: 'Pending Activation',
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        icon: AlertTriangle,
        description: 'Waiting for tablet activation'
      }
    }
    
    if (device.status === 'revoked') {
      return {
        status: 'revoked' as const,
        label: 'Revoked',
        color: 'bg-red-500/20 text-red-400 border-red-500/30',
        icon: XCircle,
        description: device.revocationReason || 'Access revoked'
      }
    }
    
    if (device.status === 'disabled') {
      return {
        status: 'disabled' as const,
        label: 'Disabled',
        color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        icon: XCircle,
        description: 'Temporarily disabled'
      }
    }
    
    // Active device - check if it's been used recently
    if (hoursSinceActivity > 24) {
      return {
        status: 'inactive' as const,
        label: 'Inactive',
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        icon: WifiOff,
        description: `No activity for ${Math.floor(hoursSinceActivity)}h`
      }
    }
    
    return {
      status: 'active' as const,
      label: 'Active',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: CheckCircle,
      description: hoursSinceActivity < 1 
        ? 'Active now' 
        : `Active ${Math.floor(hoursSinceActivity)}h ago`
    }
  }

  // Get unique locations for filter
  const uniqueLocations = Array.from(new Set(devices.map(d => d.locationName)))

  // Filter devices
  const filteredDevices = devices.filter(device => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      device.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceId?.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    const deviceStatus = getDeviceStatusInfo(device).status
    const matchesStatus = statusFilter === 'all' || deviceStatus === statusFilter

    // Location filter
    const matchesLocation = locationFilter === 'all' || device.locationName === locationFilter

    return matchesSearch && matchesStatus && matchesLocation
  })

  // Create new device function
  const createDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    try {
      const result = await createDeviceMutation.mutateAsync(createForm)
      
      toast.success('Device created successfully!')
      
      // Show activation details
      toast.success(
        `Activation Code: ${result.activationCode}`,
        {
          description: 'Use this code to activate the tablet',
          duration: 10000,
        }
      )
      
      setShowCreateForm(false)
      setCreateForm({ deviceName: '', locationName: '', locationAddress: '' })
    } catch (error: any) {
      toast.error(error.error || 'Failed to create device')
    }
  }

  // Update device status function
  const updateDeviceStatus = async (deviceId: string, action: string, reason?: string) => {
    try {
      await updateDeviceMutation.mutateAsync({ deviceId, action, reason })
      toast.success(`Device ${action}d successfully`)
    } catch (error: any) {
      toast.error(error.error || `Failed to ${action} device`)
    }
  }

  // Copy activation URL function
  const copyActivationUrl = (activationCode: string) => {
    const url = `${window.location.origin}/pin?activate=${activationCode}`
    navigator.clipboard.writeText(url)
    toast.success('Activation URL copied to clipboard')
  }

  // Open QR code dialog
  const openQRDialog = async (device: ManagedDevice) => {
    if (!device.activationCode) {
      toast.error('No activation code available')
      return
    }

    try {
      const url = `${window.location.origin}/pin?activate=${device.activationCode}`
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      
      setQRDialog({
        open: true,
        device,
        qrCodeUrl: qrCodeDataUrl,
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Failed to generate QR code')
    }
  }

  // Close QR dialog
  const closeQRDialog = () => {
    setQRDialog({
      open: false,
      device: null,
      qrCodeUrl: '',
    })
  }

  // Download QR code
  const downloadQRCode = () => {
    if (!qrDialog.qrCodeUrl || !qrDialog.device) return

    const link = document.createElement('a')
    link.download = `${qrDialog.device.deviceName.replace(/\s+/g, '-')}-activation-qr.png`
    link.href = qrDialog.qrCodeUrl
    link.click()
    toast.success('QR code downloaded')
  }

  // Open delete dialog
  const openDeleteDialog = (device: ManagedDevice) => {
    setDeleteDialog({
      open: true,
      device,
      step: device.status === 'revoked' ? 'confirm-delete' : 'revoke',
      revocationReason: '',
    })
  }

  // Close delete dialog
  const closeDeleteDialog = () => {
    setDeleteDialog({
      open: false,
      device: null,
      step: 'revoke',
      revocationReason: '',
    })
  }

  // Handle revoke in delete flow
  const handleRevokeForDelete = async () => {
    if (!deleteDialog.device) return

    try {
      await updateDeviceMutation.mutateAsync({
        deviceId: deleteDialog.device._id,
        action: 'revoke',
        reason: deleteDialog.revocationReason || 'Device scheduled for deletion',
      })
      
      toast.success('Device revoked successfully')
      
      // Move to delete confirmation step
      setDeleteDialog(prev => ({
        ...prev,
        step: 'confirm-delete',
      }))
    } catch (error: any) {
      toast.error(error.error || 'Failed to revoke device')
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteDialog.device) return

    try {
      await deleteDeviceMutation.mutateAsync(deleteDialog.device._id)
      toast.success('Device deleted successfully')
      closeDeleteDialog()
    } catch (error: any) {
      toast.error(error.error || 'Failed to delete device')
    }
  }

  // NOW we can do conditional rendering after all hooks are declared
  
  // Show loading while checking auth
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-red-600">Access Denied</h3>
        <p className="text-gray-600 mb-4">
          You need administrator privileges to access device management.
        </p>
        <p className="text-sm text-gray-500">
          Contact your system administrator if you believe this is an error.
        </p>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-red-600">Failed to Load Devices</h3>
        <p className="text-gray-600 mb-4">
          {error instanceof Error ? error.message : 'An error occurred while loading devices'}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Device Management</h1>
          <p className="text-gray-600">Manage kiosk tablets and their activation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Search devices, locations, or device IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="disabled">Disabled</option>
            <option value="revoked">Revoked</option>
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Locations</option>
            {uniqueLocations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredDevices.length} of {devices.length} devices
        </div>
      </Card>

      {/* Create Device Form */}
      {showCreateForm && (
        <Card className="p-6 pt-0">
          <h2 className="text-lg font-semibold mb-4">Create New Device</h2>
          <form onSubmit={createDevice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Device Name</label>
                <input
                  type="text"
                  value={createForm.deviceName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, deviceName: e.target.value }))}
                  placeholder="e.g., Kiosk 1 - Port Melbourne"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location Name</label>
                <input
                  type="text"
                  value={createForm.locationName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, locationName: e.target.value }))}
                  placeholder="e.g., Port Melbourne"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location Address (Optional)</label>
              <input
                type="text"
                value={createForm.locationAddress}
                onChange={(e) => setCreateForm(prev => ({ ...prev, locationAddress: e.target.value }))}
                placeholder="e.g., 123 Main St, Port Melbourne VIC 3207"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createDeviceMutation.isPending}>
                {createDeviceMutation.isPending ? 'Creating...' : 'Create Device'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Devices Grid - Compact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDevices.map((device) => {
          const statusInfo = getDeviceStatusInfo(device)
          const StatusIcon = statusInfo.icon
          
          return (
            <Card key={device._id} className="group hover:shadow-md transition-shadow pt-0">
              <div className="p-4 space-y-3">
                {/* Header - Device Name & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1.5 rounded-md bg-blue-500/10 shrink-0">
                      <Tablet className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{device.deviceName}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusIcon className="h-3 w-3 shrink-0" />
                        <Badge className={cn(statusInfo.color, "text-xs px-1.5 py-0")}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{device.locationName}</span>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">{device.totalPunches}</span>
                    <span className="text-gray-500">punches</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(device.lastActivity), 'MMM d')}</span>
                  </div>
                </div>

                {/* Last User */}
                {device.lastUsedBy && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 py-1.5 px-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{device.lastUsedBy.name}</span>
                  </div>
                )}

                {/* Device ID or Activation Code */}
                {device.deviceId ? (
                  <div className="text-xs font-mono text-gray-500 truncate py-1.5 px-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    {device.deviceId}
                  </div>
                ) : device.activationCode ? (
                  <div className="text-xs font-mono text-yellow-600 py-1.5 px-2 bg-yellow-50 dark:bg-yellow-950/20 rounded flex items-center justify-between">
                    <span>{device.activationCode}</span>
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                  </div>
                ) : null}

                {/* Actions - Always visible */}
                <div className="flex items-center gap-1 pt-2 border-t">
                  {device.activationCode && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyActivationUrl(device.activationCode!)}
                        title="Copy URL"
                        className="h-7 px-2 flex-1"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openQRDialog(device)}
                        title="QR Code"
                        className="h-7 px-2 flex-1"
                      >
                        <QrCode className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  
                  {device.status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateDeviceStatus(device._id, 'disable')}
                      disabled={updateDeviceMutation.isPending}
                      title="Disable"
                      className="h-7 px-2 flex-1"
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {device.status === 'disabled' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateDeviceStatus(device._id, 'enable')}
                      disabled={updateDeviceMutation.isPending}
                      title="Enable"
                      className="h-7 px-2 flex-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {device.status !== 'revoked' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const reason = prompt('Reason for revocation (optional):')
                        updateDeviceStatus(device._id, 'revoke', reason || undefined)
                      }}
                      disabled={updateDeviceMutation.isPending}
                      title="Revoke"
                      className="h-7 px-2 flex-1 text-destructive hover:text-destructive"
                    >
                      <Shield className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDeleteDialog(device)}
                    disabled={deleteDeviceMutation.isPending}
                    title="Delete"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredDevices.length === 0 && (
        <Card className="p-12 text-center">
          <Tablet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery || statusFilter !== 'all' || locationFilter !== 'all' 
              ? 'No devices found' 
              : 'No devices registered'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || statusFilter !== 'all' || locationFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first kiosk device to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && locationFilter === 'all' && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Device
            </Button>
          )}
        </Card>
      )}

      {/* Delete Device Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          {deleteDialog.step === 'revoke' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Revoke Device Before Deletion
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Before deleting <strong>{deleteDialog.device?.deviceName}</strong>, you must first revoke its access.
                      This ensures the device can no longer be used for time tracking.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="revocation-reason">Revocation Reason (Optional)</Label>
                      <Input
                        id="revocation-reason"
                        placeholder="e.g., Device lost, stolen, or no longer needed"
                        value={deleteDialog.revocationReason}
                        onChange={(e) => setDeleteDialog(prev => ({ ...prev, revocationReason: e.target.value }))}
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
                <Button
                  onClick={handleRevokeForDelete}
                  disabled={updateDeviceMutation.isPending}
                  variant="destructive"
                >
                  {updateDeviceMutation.isPending ? 'Revoking...' : 'Revoke Device'}
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Confirm Device Deletion
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to permanently delete <strong>{deleteDialog.device?.deviceName}</strong>?
                    </p>
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">⚠️ This action cannot be undone</p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                        <li>Device record will be permanently deleted</li>
                        <li>Historical punch data will remain intact</li>
                        <li>Activation code will be invalidated</li>
                      </ul>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteDeviceMutation.isPending}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {deleteDeviceMutation.isPending ? 'Deleting...' : 'Delete Device'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog.open} onOpenChange={(open) => !open && closeQRDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Device Activation QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code with the tablet to activate {qrDialog.device?.deviceName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* QR Code Display */}
            <div className="flex justify-center p-6 bg-white rounded-lg">
              {qrDialog.qrCodeUrl && (
                <img 
                  src={qrDialog.qrCodeUrl} 
                  alt="Activation QR Code"
                  className="w-full max-w-[300px] h-auto"
                />
              )}
            </div>

            {/* Device Info */}
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Device:</span>
                <span className="font-medium">{qrDialog.device?.deviceName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{qrDialog.device?.locationName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Activation Code:</span>
                <span className="font-mono font-medium">{qrDialog.device?.activationCode}</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">How to activate:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Open the tablet browser</li>
                <li>Scan this QR code or enter the activation code manually</li>
                <li>The device will be automatically activated</li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={downloadQRCode}
                className="flex-1"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download QR Code
              </Button>
              <Button
                onClick={() => {
                  if (qrDialog.device?.activationCode) {
                    copyActivationUrl(qrDialog.device.activationCode)
                  }
                }}
                className="flex-1"
                variant="outline"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}