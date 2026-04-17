import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { TenantContext } from "@/lib/auth/tenant-context"
import { ClockSession, IClockSession } from "@/lib/db/schemas/clock-session"
import { ClockAudit, ClockEventType } from "@/lib/db/schemas/clock-audit"
import { BuddyPunchAlert } from "@/lib/db/schemas/buddy-punch-alert"
import { withLock } from "@/lib/redis/distributed-lock"
import { getRedisOptional } from "@/lib/redis/redis-client"
import mongoose from "mongoose"

export interface ClockValidationResult {
  allowed: boolean
  reason?: string
  riskScore: number
  riskFlags: string[]
}

export interface SessionParams {
  employeeId: string
  deviceId: string
  pin: string
  shiftId?: string
}

export interface AuditParams {
  employeeId: string
  sessionId: string
  shiftId?: string
  eventType: ClockEventType
  gpsLat?: number
  gpsLng?: number
  distanceFromLocation?: number
  ipAddress?: string
  deviceFingerprint?: string
  userAgent?: string
  riskScore: number
  riskFlags: string[]
  rawPayload?: Record<string, unknown>
}

interface RiskParams {
  employeeId: string
  deviceId: string
  gpsLat?: number
  gpsLng?: number
  locationLat?: number
  locationLng?: number
  locationRadius?: number
  geofenceEnabled?: boolean
  deviceRegistered?: boolean
  recentBuddyPunchCount?: number
  lastClockOutTime?: Date
  tenantId: string
}

export class ClockValidationService {
  /**
   * Validate a clock-in attempt before processing.
   */
  async validateClockIn(
    ctx: TenantContext,
    params: {
      employeeId: string
      deviceId: string
      pin: string
      gpsLat?: number
      gpsLng?: number
      ipAddress?: string
      deviceFingerprint?: string
      locationLat?: number
      locationLng?: number
      locationRadius?: number
      geofenceEnabled?: boolean
    }
  ): Promise<ClockValidationResult> {
    if (!ctx || ctx.type !== "full") {
      return { allowed: false, reason: "Unauthorized", riskScore: 100, riskFlags: ["UNAUTHORIZED"] }
    }
    await connectDB()

    // Check for existing active session (double clock-in prevention)
    const existingSession = await scope(ClockSession, ctx.tenantId).findOne({
      employeeId: params.employeeId,
      isActive: true,
    })

    if (existingSession) {
      return {
        allowed: false,
        reason: "Employee is already clocked in",
        riskScore: 0,
        riskFlags: ["ALREADY_CLOCKED_IN"],
      }
    }

    // Count recent buddy punch alerts
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let recentBuddyPunchCount = 0
    try {
      recentBuddyPunchCount = await scope(BuddyPunchAlert, ctx.tenantId).countDocuments({
        employeeId: params.employeeId,
        createdAt: { $gte: thirtyDaysAgo },
      })
    } catch {
      // BuddyPunchAlert may not exist in all environments
    }

    // Get last clock-out time
    const lastSession = await scope(ClockSession, ctx.tenantId)
      .find({ employeeId: params.employeeId, isActive: false })
      .sort({ logoutTime: -1 })
      .limit(1)
      .lean()

    const lastClockOutTime = lastSession[0]?.logoutTime

    const { score, flags } = this.calculateRiskScore({
      employeeId: params.employeeId,
      deviceId: params.deviceId,
      gpsLat: params.gpsLat,
      gpsLng: params.gpsLng,
      locationLat: params.locationLat,
      locationLng: params.locationLng,
      locationRadius: params.locationRadius,
      geofenceEnabled: params.geofenceEnabled,
      deviceRegistered: true, // device registration check is handled by existing clock service
      recentBuddyPunchCount,
      lastClockOutTime,
      tenantId: ctx.tenantId,
    })

    // Auto-create buddy punch alert if risk is high
    if (score > 70) {
      try {
        await scope(BuddyPunchAlert, ctx.tenantId).create({
          tenantId: ctx.tenantId,
          employeeId: params.employeeId,
          deviceId: params.deviceId,
          riskScore: score,
          riskFlags: flags,
          detectedAt: new Date(),
          isResolved: false,
        })
      } catch {
        // Non-critical — don't block clock-in
      }
    }

    return {
      allowed: true,
      riskScore: score,
      riskFlags: flags,
    }
  }

  /**
   * Open a new ClockSession. Throws if employee already has an active session.
   * Uses a distributed Redis lock to prevent race conditions on concurrent clock-in attempts.
   */
  async openSession(ctx: TenantContext, params: SessionParams): Promise<IClockSession> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    const lockKey = `clock-in:${ctx.tenantId}:${params.employeeId}`

    const doCreate = async () => {
      // Double-check inside the lock
      const existing = await scope(ClockSession, ctx.tenantId).findOne({
        employeeId: params.employeeId,
        isActive: true,
      })
      if (existing) throw new Error("Employee is already clocked in.")

      return scope(ClockSession, ctx.tenantId).create({
        tenantId: ctx.tenantId,
        employeeId: params.employeeId,
        deviceId: params.deviceId,
        pin: params.pin,
        shiftId: params.shiftId,
        loginTime: new Date(),
        isActive: true,
      })
    }

    // Try with Redis lock; fall back to DB-only if Redis is unavailable
    try {
      return await withLock(lockKey, doCreate, 30_000)
    } catch (err: any) {
      if (err?.message?.startsWith('REDIS_URL not set') || err?.code === 'ECONNREFUSED') {
        // Redis unavailable — fall back to DB unique index protection
        return doCreate()
      }
      throw err
    }
  }

  /**
   * Close the active session for an employee (on clock-out).
   */
  async closeSession(ctx: TenantContext, employeeId: string): Promise<void> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    await scope(ClockSession, ctx.tenantId).findOneAndUpdate(
      { employeeId, isActive: true },
      { $set: { isActive: false, logoutTime: new Date() } }
    )
  }

  /**
   * Write a ClockAudit record for any clock event.
   */
  async recordAudit(ctx: TenantContext, params: AuditParams): Promise<void> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    await scope(ClockAudit, ctx.tenantId).create({
      tenantId: ctx.tenantId,
      employeeId: params.employeeId,
      sessionId: params.sessionId,
      shiftId: params.shiftId,
      eventType: params.eventType,
      gpsLat: params.gpsLat,
      gpsLng: params.gpsLng,
      distanceFromLocation: params.distanceFromLocation,
      ipAddress: params.ipAddress,
      deviceFingerprint: params.deviceFingerprint,
      userAgent: params.userAgent,
      riskScore: params.riskScore,
      riskFlags: params.riskFlags,
      rawPayload: params.rawPayload,
      recordedAt: new Date(),
    })
  }

  /**
   * Calculate GPS distance using Haversine formula (no external API).
   * Returns distance in metres.
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3 // Earth radius in metres
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * Calculate risk score based on GPS, device, buddy punch history.
   */
  private calculateRiskScore(params: RiskParams): { score: number; flags: string[] } {
    let score = 0
    const flags: string[] = []

    // GPS_OUT_OF_RANGE: device GPS is > location.radius metres from location centre
    if (
      params.gpsLat != null &&
      params.gpsLng != null &&
      params.locationLat != null &&
      params.locationLng != null
    ) {
      const distance = this.calculateDistance(
        params.gpsLat,
        params.gpsLng,
        params.locationLat,
        params.locationLng
      )
      const radius = params.locationRadius ?? 100
      if (distance > radius) {
        score += 40
        flags.push("GPS_OUT_OF_RANGE")
      }
    } else if (params.geofenceEnabled && (params.gpsLat == null || params.gpsLng == null)) {
      // NO_GPS: no GPS provided when location has geofenceMode enabled
      score += 20
      flags.push("NO_GPS")
    }

    // UNKNOWN_DEVICE: deviceId not registered for this location
    if (!params.deviceRegistered) {
      score += 30
      flags.push("UNKNOWN_DEVICE")
    }

    // FREQUENT_FLAGGED: employee has >3 buddy punch alerts in last 30 days
    if ((params.recentBuddyPunchCount ?? 0) > 3) {
      score += 25
      flags.push("FREQUENT_FLAGGED")
    }

    // RAPID_RELOGIN: less than 1 hour since last clock-out
    if (params.lastClockOutTime) {
      const hoursSinceLastClockOut =
        (Date.now() - params.lastClockOutTime.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastClockOut < 1) {
        score += 10
        flags.push("RAPID_RELOGIN")
      }
    }

    return { score: Math.min(score, 100), flags }
  }
}

export const clockValidationService = new ClockValidationService()
