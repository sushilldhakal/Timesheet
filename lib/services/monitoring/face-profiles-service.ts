import { isValidDescriptor } from "@/lib/services/face-matching"
import { FaceProfilesDbQueries } from "@/lib/db/queries/face-profiles"
import { connectDB } from "@/lib/db"

export class FaceProfilesService {
  async enroll(body: any) {
    await connectDB()
    const { employeeId, descriptor, enrollmentQuality, enrolledBy = "admin" } = body

    if (!isValidDescriptor(descriptor)) {
      return { status: 400, data: { error: "Invalid descriptor format" } }
    }

    const employee = await FaceProfilesDbQueries.employeeExists(employeeId)
    if (!employee) return { status: 404, data: { error: "Employee not found" } }

    const existingProfile = await FaceProfilesDbQueries.findByEmployeeId(employeeId)
    if (existingProfile) {
      ;(existingProfile as any).descriptor = descriptor
      ;(existingProfile as any).enrollmentQuality = enrollmentQuality
      ;(existingProfile as any).enrolledBy = enrolledBy
      ;(existingProfile as any).enrolledAt = new Date()
      ;(existingProfile as any).isActive = true
      await (existingProfile as any).save()
      return {
        status: 200,
        data: { success: true, message: "Face profile updated successfully", profile: existingProfile },
      }
    }

    const newProfile = await FaceProfilesDbQueries.create({
      employeeId,
      descriptor,
      enrollmentQuality,
      enrolledBy,
      enrolledAt: new Date(),
      isActive: true,
    })

    return {
      status: 200,
      data: { success: true, message: "Face profile enrolled successfully", profile: newProfile },
    }
  }

  async list(query: any) {
    await connectDB()
    const queryFilter = query?.activeOnly ? { isActive: true } : {}
    const profiles = await FaceProfilesDbQueries.list({ filter: queryFilter })
    return { success: true, profiles }
  }

  async get(employeeId: string) {
    await connectDB()
    const profile = await FaceProfilesDbQueries.findActiveByEmployeeIdNoDescriptor(employeeId)
    if (!profile) return { status: 404, data: { error: "Face profile not found" } }
    return { status: 200, data: { success: true, profile } }
  }

  async remove(employeeId: string) {
    await connectDB()
    const profile = await FaceProfilesDbQueries.deleteByEmployeeId(employeeId)
    if (!profile) return { status: 404, data: { error: "Face profile not found" } }
    return { status: 200, data: { success: true, message: "Face profile deleted successfully" } }
  }

  async setActive(employeeId: string, isActive: boolean) {
    await connectDB()
    const profile = await FaceProfilesDbQueries.updateActive(employeeId, isActive)
    if (!profile) return { status: 404, data: { error: "Face profile not found" } }
    return {
      status: 200,
      data: { success: true, message: `Face profile ${isActive ? "activated" : "deactivated"} successfully`, profile },
    }
  }
}

export const faceProfilesService = new FaceProfilesService()

