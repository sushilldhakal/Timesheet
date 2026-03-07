// Face Recognition Types and Interfaces

export interface StaffFaceProfile {
  _id: string
  employeeId: string          // ref to Employee
  descriptor: number[]        // 1024 floats from human.face[0].embedding
  enrolledAt: Date
  enrolledBy: "auto" | "admin"
  enrollmentQuality: number   // confidence score at time of capture (0-1)
  enrolledPhotoUrl?: string   // photo used at enrollment
  lastMatchedAt?: Date
  lastMatchScore?: number
  isActive: boolean           // allow disabling without deleting
}

export interface BuddyPunchAlert {
  _id: string
  employeeId: string
  punchType: "in" | "break" | "endBreak" | "out"
  punchTime: Date
  matchScore: number          // 0-1, lower = more suspicious
  capturedPhotoUrl?: string   // the photo taken at punch time
  enrolledPhotoUrl?: string   // photo used at enrollment
  locationId: string
  status: "pending" | "confirmed_buddy" | "dismissed" | "false_alarm"
  reviewedBy?: string         // user id of admin who reviewed
  reviewedAt?: Date
  notes?: string
}

export interface FaceMatchResult {
  matched: boolean
  score: number
  threshold: number
  shouldAlert: boolean
}

export const FACE_MATCH_THRESHOLD = 0.5

/**
 * Threshold explanation for L2-normalized face descriptors:
 * - Raw cosine similarity ranges from -1 to 1
 * - For face embeddings, typical ranges are:
 *   - Same person: 0.7 to 1.0
 *   - Different people: 0.3 to 0.6
 * - Threshold of 0.5 is a conservative middle ground
 * - Adjust based on your false positive/negative tolerance
 */
