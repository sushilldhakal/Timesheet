import { connectDB } from "@/lib/db"
import { needsAdminSetup } from "@/lib/db/setup"

export class SetupStatusService {
  async getStatus() {
    await connectDB()
    const setupRequired = await needsAdminSetup()
    return {
      success: true,
      data: {
        isSetupComplete: !setupRequired,
        hasAdmin: !setupRequired,
        databaseConnected: true,
        requiredSteps: setupRequired ? ["Create admin user"] : [],
        completedSteps: setupRequired ? [] : ["Create admin user"],
        needsSetup: setupRequired,
      },
    }
  }
}

export const setupStatusService = new SetupStatusService()

