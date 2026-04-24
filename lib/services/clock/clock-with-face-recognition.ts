/**
 * Clock-in/out service with face recognition integration
 * 
 * This service handles the clock flow with automatic face matching:
 * 1. PIN entered → clock page loads
 * 2. Face captured (already happening)
 * 3. POST /api/clock with punch + photo + embedding
 * 4. Server side:
 *    - Fetch StaffFaceProfile for this employeeId
 *    - If none → create one (auto-enroll), no flag
 *    - If exists → compare embeddings
 *      - Score > 0.5 → clean punch, save lastMatchedAt
 *      - Score < 0.5 → save BuddyPunchAlert, punch still goes through
 * 
 * The punch ALWAYS goes through regardless — you never block a clock-in.
 * The alert is purely for manager review.
 */

import { StaffFaceProfile, BuddyPunchAlert } from "@/lib/db"
import { matchFaceDescriptor, isValidDescriptor } from "@/lib/services/face-recognition/face-matching"
import { FACE_MATCH_THRESHOLD } from "@/lib/api/face-recognition"

export interface ClockWithFaceData {
  employeeId: string
  punchType: "in" | "break" | "endBreak" | "out"
  punchTime: Date
  locationId: string
  photoUrl?: string
  faceDescriptor?: number[]
  faceQuality?: number
  deviceId?: string
  deviceName?: string
}

export interface FaceRecognitionResult {
  enrolled: boolean
  matched: boolean
  score?: number
  alertCreated: boolean
  alertId?: string
}

/**
 * Process face recognition during clock-in/out
 * This function should be called AFTER the timesheet entry is created
 */
export async function processFaceRecognition(
  data: ClockWithFaceData
): Promise<FaceRecognitionResult> {
  const {
    employeeId,
    punchType,
    punchTime,
    locationId,
    photoUrl,
    faceDescriptor,
    faceQuality,
    deviceId,
    deviceName,
  } = data

  // Temporary logging for debugging
  console.log('[FaceRecog] called with descriptor length:', faceDescriptor?.length)
  console.log('[FaceRecog] employeeId:', employeeId)
  console.log('[FaceRecog] photoUrl:', photoUrl)
  console.log('[FaceRecog] locationId:', locationId)

  try {
    // Fetch existing face profile
    const existingProfile = await StaffFaceProfile.findOne({
      employeeId,
      isActive: true,
    })

    // Check if employee has an enrolled face profile
    const hasEnrolledProfile = !!existingProfile

    // If no face data provided but employee has enrolled profile → ALERT (camera covered/face hidden)
    if (hasEnrolledProfile && (!faceDescriptor || !isValidDescriptor(faceDescriptor))) {
      console.log('[FaceRecog] Employee has enrolled profile but no valid face detected - creating alert')
      
      const alert = await BuddyPunchAlert.create({
        employeeId,
        punchType,
        punchTime,
        matchScore: 0, // Zero score indicates no face was detected
        capturedPhotoUrl: photoUrl || null,
        enrolledPhotoUrl: existingProfile.enrolledPhotoUrl,
        locationId,
        deviceId,
        deviceName,
        status: "pending",
      })

      return {
        enrolled: true,
        matched: false,
        score: 0,
        alertCreated: true,
        alertId: alert._id.toString(),
      }
    }

    // If no face data and no profile → skip (first time user, will auto-enroll next time)
    if (!faceDescriptor || !isValidDescriptor(faceDescriptor)) {
      console.log('[FaceRecog] No face descriptor and no enrolled profile - skipping')
      return {
        enrolled: false,
        matched: false,
        alertCreated: false,
      }
    }

    // No profile exists → auto-enroll
    if (!existingProfile) {
      console.log('[FaceRecog] No existing profile, auto-enrolling')
      await StaffFaceProfile.create({
        employeeId,
        descriptor: faceDescriptor,
        enrolledAt: new Date(),
        enrolledBy: "auto",
        enrollmentQuality: faceQuality || 0.8,
        enrolledPhotoUrl: photoUrl, // Store the photo taken at enrollment
        isActive: true,
      })
      console.log('[FaceRecog] Auto-enrollment complete')

      return {
        enrolled: true,
        matched: true,
        score: 1.0,
        alertCreated: false,
      }
    }

    console.log('[FaceRecog] Existing profile found, comparing embeddings')

    // Profile exists → compare embeddings
    const matchResult = matchFaceDescriptor(
      faceDescriptor,
      existingProfile.descriptor,
      FACE_MATCH_THRESHOLD
    )

    // Update last matched info
    if (matchResult.matched) {
      existingProfile.lastMatchedAt = new Date()
      existingProfile.lastMatchScore = matchResult.score
      await existingProfile.save()

      return {
        enrolled: true,
        matched: true,
        score: matchResult.score,
        alertCreated: false,
      }
    }

    // Low match score → create buddy punch alert
    const alert = await BuddyPunchAlert.create({
      employeeId,
      punchType,
      punchTime,
      matchScore: matchResult.score,
      capturedPhotoUrl: photoUrl,
      enrolledPhotoUrl: existingProfile.enrolledPhotoUrl, // Side-by-side comparison
      locationId,
      deviceId,
      deviceName,
      status: "pending",
    })

    return {
      enrolled: true,
      matched: false,
      score: matchResult.score,
      alertCreated: true,
      alertId: alert._id.toString(),
    }
  } catch (error) {
    console.error("Error processing face recognition:", error)
    // Don't fail the clock-in if face recognition fails
    return {
      enrolled: false,
      matched: false,
      alertCreated: false,
    }
  }
}

/**
 * Get face profile status for an employee
 */
export async function getFaceProfileStatus(employeeId: string) {
  const profile = await StaffFaceProfile.findOne({
    employeeId,
    isActive: true,
  })

  if (!profile) {
    return {
      enrolled: false,
      enrollmentQuality: null,
      lastMatchedAt: null,
    }
  }

  return {
    enrolled: true,
    enrollmentQuality: profile.enrollmentQuality,
    lastMatchedAt: profile.lastMatchedAt,
    lastMatchScore: profile.lastMatchScore,
  }
}
