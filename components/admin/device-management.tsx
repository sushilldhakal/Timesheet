"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  WifiOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'
import { isAdminOrSuperAdmin } from '@/lib/utils/roles'

interface Device {
  _id: string
  deviceId?: string
  deviceName: string
  locationName: string
  locationAddress?: string
  status: 'active' | 'disabled' | 'revoked'
  registeredBy: { name: string; username: string }
  registeredAt: string
  lastActivity: string
  lastUsedBy?: { name: string }
  totalPunches: number
  activationCode?: string
  activationCodeExpiry?: string
  revokedBy?: { name: string; username: string }
  revokedAt?: string
  revocationReason?: string
}

interface CreateDeviceForm {
  deviceName: string
  locationName: string
  locationAddress: string
}

export function DeviceManagement() {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL LOGIC
  const { userRole, isHydrated } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<CreateDeviceForm>({
    deviceName: '',
    locationName: '',
    locationAddress: '',
  })
  const [createLoading, setCreateLoading] = useState(false)

  // Load devices function
  const loadDevices = async () => {
    try {
      const response = await fetch('/api/device/manage')
      const data = await response.json()
      
      if (response.ok) {
        setDevices(data.devices)
      } else {
        toast.error('Failed to load devices')
      }
    } catch (error) {
      toast.error('Failed to load devices')
    } finally {
      setLoading(false)
    }
  }

  // Load devices on mount - useEffect must be declared before any conditional logic
  useEffect(() => {
    loadDevices()
  }, [])

  // Check admin permissions
  const isAdmin = isAdminOrSuperAdmin(userRole)

  // Create new device function
  const createDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateLoading(true)
    
    try {
      const response = await fetch('/api/device/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Device created successfully!')
        
        // Show activation details
        toast.success(
          `Activation Code: ${data.activationCode}`,
          {
            description: 'Use this code to activate the tablet',
            duration: 10000,
          }
        )
        
        setShowCreateForm(false)
        setCreateForm({ deviceName: '', locationName: '', locationAddress: '' })
        loadDevices()
      } else {
        toast.error(data.error || 'Failed to create device')
      }
    } catch (error) {
      toast.error('Failed to create device')
    } finally {
      setCreateLoading(false)
    }
  }

  // Update device status function
  const updateDeviceStatus = async (deviceId: string, action: string, reason?: string) => {
    try {
      const response = await fetch('/api/device/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, action, reason }),
      })
      
      if (response.ok) {
        toast.success(`Device ${action}d successfully`)
        loadDevices()
      } else {
        const data = await response.json()
        toast.error(data.error || `Failed to ${action} device`)
      }
    } catch (error) {
      toast.error(`Failed to ${action} device`)
    }
  }

  // Copy activation URL function
  const copyActivationUrl = (activationCode: string) => {
    const url = `${window.location.origin}/pin?activate=${activationCode}`
    navigator.clipboard.writeText(url)
    toast.success('Activation URL copied to clipboard')
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

  // Get device status with more details
  const getDeviceStatusInfo = (device: Device) => {
    const now = new Date()
    const lastActivity = new Date(device.lastActivity)
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    
    if (!device.deviceId) {
      return {
        status: 'pending',
        label: 'Pending Activation',
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        icon: AlertTriangle,
        description: 'Waiting for tablet activation'
      }
    }
    
    if (device.status === 'revoked') {
      return {
        status: 'revoked',
        label: 'Revoked',
        color: 'bg-red-500/20 text-red-400 border-red-500/30',
        icon: XCircle,
        description: device.revocationReason || 'Access revoked'
      }
    }
    
    if (device.status === 'disabled') {
      return {
        status: 'disabled',
        label: 'Disabled',
        color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        icon: XCircle,
        description: 'Temporarily disabled'
      }
    }
    
    // Active device - check if it's been used recently
    if (hoursSinceActivity > 24) {
      return {
        status: 'inactive',
        label: 'Inactive',
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        icon: WifiOff,
        description: `No activity for ${Math.floor(hoursSinceActivity)}h`
      }
    }
    
    return {
      status: 'active',
      label: 'Active',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: CheckCircle,
      description: hoursSinceActivity < 1 
        ? 'Active now' 
        : `Active ${Math.floor(hoursSinceActivity)}h ago`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
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
          <Button variant="outline" onClick={loadDevices} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>
      </div>

      {/* Create Device Form */}
      {showCreateForm && (
        <Card className="p-6">
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
              <Button type="submit" disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create Device'}
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

      {/* Devices List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {devices.map((device) => (
          <Card key={device._id} className="p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Tablet className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{device.deviceName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const statusInfo = getDeviceStatusInfo(device)
                        const StatusIcon = statusInfo.icon
                        return (
                          <>
                            <StatusIcon className="h-3 w-3" />
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </>
                        )
                      })()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getDeviceStatusInfo(device).description}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{device.locationName}</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-400" />
                  <span>{device.totalPunches} punches</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{format(new Date(device.lastActivity), 'MMM d')}</span>
                </div>
              </div>

              {/* Last User */}
              {device.lastUsedBy && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Last: {device.lastUsedBy.name}</span>
                </div>
              )}

              {/* Activation Code */}
              {device.activationCode && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700">Pending Activation</p>
                      <p className="text-xs text-yellow-600">Code: {device.activationCode}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyActivationUrl(device.activationCode!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <QrCode className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {device.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateDeviceStatus(device._id, 'disable')}
                  >
                    Disable
                  </Button>
                )}
                {device.status === 'disabled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateDeviceStatus(device._id, 'enable')}
                  >
                    Enable
                  </Button>
                )}
                {device.status !== 'revoked' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      const reason = prompt('Reason for revocation (optional):')
                      updateDeviceStatus(device._id, 'revoke', reason || undefined)
                    }}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {devices.length === 0 && (
        <Card className="p-8 text-center">
          <Tablet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No devices registered</h3>
          <p className="text-gray-600 mb-4">
            Create your first kiosk device to get started with tablet-based time tracking.
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Device
          </Button>
        </Card>
      )}
    </div>
  )
}