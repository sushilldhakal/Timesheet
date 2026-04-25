import { BuddyPunchAlertsDbQueries } from "@/lib/db/queries/buddy-punch-alerts"
import { connectDB } from "@/lib/db"
import { parse, isValid } from "date-fns"

export class BuddyPunchAlertsService {
  async list(query: any) {
    await connectDB()
    const { status, employeeId, locationId, page = 1, limit = 50, startDate, endDate } = query || {}
    const queryFilter: any = {}
    if (status) queryFilter.status = status
    if (employeeId) queryFilter.employeeId = employeeId
    if (locationId) queryFilter.locationId = locationId

    if (startDate || endDate) {
      const dateFilter: any = {}
      if (startDate) {
        const parsed = parse(startDate, "yyyy-MM-dd", new Date())
        if (isValid(parsed)) {
          parsed.setHours(0, 0, 0, 0)
          dateFilter.$gte = parsed
        }
      }
      if (endDate) {
        const parsed = parse(endDate, "yyyy-MM-dd", new Date())
        if (isValid(parsed)) {
          parsed.setHours(23, 59, 59, 999)
          dateFilter.$lte = parsed
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        queryFilter.punchTime = dateFilter
      }
    }

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
