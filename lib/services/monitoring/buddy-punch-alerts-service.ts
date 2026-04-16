import { BuddyPunchAlertsDbQueries } from "@/lib/db/queries/buddy-punch-alerts"
import { connectDB } from "@/lib/db"

export class BuddyPunchAlertsService {
  async list(query: any) {
    await connectDB()
    const { status, employeeId, locationId, page = 1, limit = 50 } = query || {}
    const queryFilter: any = {}
    if (status) queryFilter.status = status
    if (employeeId) queryFilter.employeeId = employeeId
    if (locationId) queryFilter.locationId = locationId
    const skip = (page - 1) * limit

    const [alerts, total] = await Promise.all([
      BuddyPunchAlertsDbQueries.list({ filter: queryFilter, skip, limit }),
      BuddyPunchAlertsDbQueries.count(queryFilter),
    ])

    return {
      success: true,
      alerts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  }

  async create(body: any) {
    await connectDB()
    const alert = await BuddyPunchAlertsDbQueries.create({ ...body, status: "pending" })
    return { success: true, alert }
  }

  async get(id: string) {
    await connectDB()
    const alert = await BuddyPunchAlertsDbQueries.findByIdPopulated(id)
    if (!alert) return { status: 404, data: { error: "Alert not found" } }
    return { status: 200, data: { success: true, alert } }
  }

  async update(id: string, body: any) {
    await connectDB()
    const alert = await BuddyPunchAlertsDbQueries.updateByIdPopulated(id, {
      status: body.status,
      notes: body.notes,
      reviewedBy: undefined,
      reviewedAt: new Date(),
    })
    if (!alert) return { status: 404, data: { error: "Alert not found" } }
    return { status: 200, data: { success: true, message: "Alert updated successfully", alert } }
  }

  async remove(id: string) {
    await connectDB()
    const alert = await BuddyPunchAlertsDbQueries.deleteById(id)
    if (!alert) return { status: 404, data: { error: "Alert not found" } }
    return { status: 200, data: { success: true, message: "Alert deleted successfully" } }
  }
}

export const buddyPunchAlertsService = new BuddyPunchAlertsService()

