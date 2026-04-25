/** Typical Mongo ObjectId as a 24-char hex string (no mongoose dependency). */
const OBJECT_ID_HEX24 = /^[0-9a-fA-F]{24}$/

export function isLikelyObjectIdString(id: string): boolean {
  return OBJECT_ID_HEX24.test(id)
}

/** Duck-type BSON ObjectId (Mongoose / driver) without importing mongoose. */
export function isObjectIdLike(v: unknown): boolean {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { toHexString?: () => string }).toHexString === "function" &&
    typeof (v as { toString?: () => string }).toString === "function"
  )
}
