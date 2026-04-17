import mongoose from "mongoose"
type MongooseInstance = typeof mongoose

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error(
    "Please define MONGODB_URI in .env – e.g. mongodb+srv://user:pass@cluster.mongodb.net/dbname"
  )
}

declare global {
  var __mongooseCache:
    | { conn: MongooseInstance | null; promise: Promise<MongooseInstance> | null }
    | undefined
}

const cached = globalThis.__mongooseCache ?? { conn: null, promise: null }
if (process.env.NODE_ENV == "production") globalThis.__mongooseCache = cached

/**
 * Connect to MongoDB Atlas. Reuses the same connection in serverless (e.g. Next.js API routes).
 */
export async function connectDB(): Promise<MongooseInstance> {
  if (cached.conn) return cached.conn
  const isNewConnection = !cached.promise
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      bufferCommands: true,
      socketTimeoutMS: 5000,
      serverSelectionTimeoutMS: 10000,
    })
  }
  cached.conn = await cached.promise

  // Fire-and-forget startup sweep for unprocessed events (first connection only)
  if (isNewConnection) {
    import('@/lib/events/event-replay-service').then(({ eventReplayService }) => {
      eventReplayService.retryFailedListeners({ limit: 200 }).catch(() => {})
    }).catch(() => {})
  }

  return cached.conn
}

export { mongoose }
export * from "@/lib/db/schemas"