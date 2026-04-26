import { connection } from "mongoose"
import type { ClientSession } from "mongoose"

/**
 * Start a Mongoose client session for multi-document transactions.
 * Always call session.endSession() in a finally block.
 */
export async function startMongoSession(): Promise<ClientSession> {
  return connection.startSession()
}
