"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { Loader2, Tablet, Wifi, AlertCircle } from 'lucide-react'

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
  deviceId 
}: DeviceActivationProps) {
  const [activationCode, setActivationCode] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    
    if (!activationCode.trim()) {
      setLocalError('Please enter an activation code')
      return
    }
    
    const result = await onActivate(activationCode.trim().toUpperCase())
    if (!result.success) {
      setLocalError(result.error || 'Activation failed')
    }
  }

  const displayError = error || localError

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white/10 backdrop-blur-sm border-white/20">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-blue-500/20 border border-blue-500/30">
              <Tablet className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Device Activation Required
            </h1>
            <p className="text-gray-300 text-sm">
              This tablet needs to be activated before it can be used for staff clock-ins.
            </p>
          </div>

          {/* Device Info */}
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Wifi className="h-4 w-4" />
              Device ID
            </div>
            <p className="text-xs font-mono text-gray-300 break-all">
              {deviceId}
            </p>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="activationCode" 
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Activation Code
              </label>
              <input
                id="activationCode"
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className={cn(
                  "w-full px-4 py-3 rounded-lg text-center text-lg font-mono tracking-wider",
                  "bg-gray-800 border border-gray-600 text-white",
                  "placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{displayError}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !activationCode.trim()}
              className={cn(
                "w-full py-3 text-lg font-semibold",
                "bg-blue-600 hover:bg-blue-700 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Activating...
                </>
              ) : (
                'Activate Device'
              )}
            </Button>
          </form>

          {/* Instructions */}
          <div className="text-xs text-gray-400 space-y-2">
            <p>
              <strong>Need an activation code?</strong>
            </p>
            <p>
              Contact your administrator to generate an activation code for this tablet.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}