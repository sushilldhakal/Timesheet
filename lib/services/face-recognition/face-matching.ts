import { FACE_MATCH_THRESHOLD, FaceMatchResult } from "@/lib/api/face-recognition"

/**
 * Calculate cosine similarity between two face descriptors
 * Returns a score between -1 and 1 (typically 0.3-1.0 for face embeddings)
 * 
 * Human's face descriptors are L2-normalized unit vectors:
 * - Same person: 0.7 to 1.0
 * - Different people: 0.3 to 0.6
 * 
 * This runs server-side so the client can't tamper with the score.
 * Don't rely on Human library server-side - implement pure math.
 */
export function calculateCosineSimilarity(
  descriptor1: number[],
  descriptor2: number[]
): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error("Descriptors must have the same length")
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < descriptor1.length; i++) {
    dotProduct += descriptor1[i] * descriptor2[i]
    norm1 += descriptor1[i] * descriptor1[i]
    norm2 += descriptor2[i] * descriptor2[i]
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
  
  if (magnitude === 0) {
    return 0
  }

  // Return raw cosine similarity - already meaningful as-is
  // For L2-normalized vectors, this is already in a useful range
  return dotProduct / magnitude
}

/**
 * Match a captured face descriptor against an enrolled profile
 */
export function matchFaceDescriptor(
  capturedDescriptor: number[],
  enrolledDescriptor: number[],
  threshold: number = FACE_MATCH_THRESHOLD
): FaceMatchResult {
  const score = calculateCosineSimilarity(capturedDescriptor, enrolledDescriptor)
  const matched = score >= threshold
  const shouldAlert = !matched

  return {
    matched,
    score,
    threshold,
    shouldAlert,
  }
}

/**
 * Validate face descriptor format
 */
export function isValidDescriptor(descriptor: any): descriptor is number[] {
  return (
    Array.isArray(descriptor) &&
    descriptor.length > 0 &&
    descriptor.every((val) => typeof val === "number" && !isNaN(val))
  )
}
