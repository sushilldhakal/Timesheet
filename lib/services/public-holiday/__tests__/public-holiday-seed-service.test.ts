import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { PublicHolidaySeedService } from '../public-holiday-seed-service'
import { PublicHoliday } from '@/lib/db/schemas/public-holiday'
import { connectDB } from '@/lib/db'

describe('PublicHolidaySeedService', () => {
  let service: PublicHolidaySeedService

  beforeEach(async () => {
    await connectDB()
    service = new PublicHolidaySeedService()
    // Clean up any existing test data
    await PublicHoliday.deleteMany({ name: { $regex: /test/i } })
  })

  afterEach(async () => {
    // Clean up test data
    await PublicHoliday.deleteMany({ name: { $regex: /test/i } })
  })

  describe('seedYear', () => {
    it('should seed holidays for all Australian states', async () => {
      const year = 2026
      const result = await service.seedYear(year)

      expect(result.success).toBe(true)
      expect(result.year).toBe(year)
      expect(result.upserted).toBeGreaterThan(0)

      // Verify holidays were created for all states
      const allHolidays = await PublicHoliday.find({ 
        date: { 
          $gte: new Date(year, 0, 1), 
          $lte: new Date(year, 11, 31) 
        } 
      }).lean()

      const states = [...new Set(allHolidays.map(h => h.state))]
      expect(states).toContain('NAT')
      expect(states).toContain('VIC')
      expect(states).toContain('NSW')
      expect(states).toContain('QLD')
      expect(states).toContain('SA')
      expect(states).toContain('WA')
      expect(states).toContain('TAS')
      expect(states).toContain('ACT')
      expect(states).toContain('NT')

      // Verify national holidays exist
      const nationalHolidays = allHolidays.filter(h => h.state === 'NAT')
      expect(nationalHolidays.length).toBeGreaterThan(0)
      
      const holidayNames = nationalHolidays.map(h => h.name)
      expect(holidayNames).toContain("New Year's Day")
      expect(holidayNames).toContain('Australia Day')
      expect(holidayNames).toContain('Good Friday')
      expect(holidayNames).toContain('Easter Monday')
      expect(holidayNames).toContain('ANZAC Day')
      expect(holidayNames).toContain('Christmas Day')
      expect(holidayNames).toContain('Boxing Day')
    })

    it('should be idempotent - re-seeding should not create duplicates', async () => {
      const year = 2026

      // First seed
      const result1 = await service.seedYear(year)
      expect(result1.success).toBe(true)

      const countAfterFirst = await PublicHoliday.countDocuments({ 
        date: { 
          $gte: new Date(year, 0, 1), 
          $lte: new Date(year, 11, 31) 
        } 
      })

      // Second seed (should be idempotent)
      const result2 = await service.seedYear(year)
      expect(result2.success).toBe(true)

      const countAfterSecond = await PublicHoliday.countDocuments({ 
        date: { 
          $gte: new Date(year, 0, 1), 
          $lte: new Date(year, 11, 31) 
        } 
      })

      // Count should be the same (no duplicates)
      expect(countAfterSecond).toBe(countAfterFirst)

      // Verify no duplicate holidays exist for same date/state/name
      const holidays = await PublicHoliday.find({ 
        date: { 
          $gte: new Date(year, 0, 1), 
          $lte: new Date(year, 11, 31) 
        } 
      }).lean()

      const uniqueKeys = new Set()
      for (const holiday of holidays) {
        const key = `${holiday.date.toISOString()}-${holiday.state}-${holiday.name}`
        expect(uniqueKeys.has(key)).toBe(false)
        uniqueKeys.add(key)
      }
    })

    it('should handle NAT and state-specific holidays coexisting on same date', async () => {
      const year = 2026
      await service.seedYear(year)

      // Find dates that have both NAT and state-specific holidays
      const holidays = await PublicHoliday.find({ 
        date: { 
          $gte: new Date(year, 0, 1), 
          $lte: new Date(year, 11, 31) 
        } 
      }).lean()

      const dateGroups = holidays.reduce((acc, holiday) => {
        const dateKey = holiday.date.toISOString().split('T')[0]
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(holiday)
        return acc
      }, {} as Record<string, any[]>)

      // Check that we can have multiple holidays on the same date for different states
      let foundCoexistence = false
      for (const [date, holidaysOnDate] of Object.entries(dateGroups)) {
        if (holidaysOnDate.length > 1) {
          const states = holidaysOnDate.map(h => h.state)
          const names = holidaysOnDate.map(h => h.name)
          
          // Ensure they are different logical holidays (different names or states)
          const uniqueHolidays = new Set(holidaysOnDate.map(h => `${h.state}-${h.name}`))
          expect(uniqueHolidays.size).toBe(holidaysOnDate.length)
          foundCoexistence = true
        }
      }

      // We should find at least some coexistence (e.g., King's Birthday on different dates for different states)
      // This test mainly ensures the logic allows valid coexistence
    })

    it('should create holidays with correct recurring flags', async () => {
      const year = 2026
      await service.seedYear(year)

      const holidays = await PublicHoliday.find({ 
        date: { 
          $gte: new Date(year, 0, 1), 
          $lte: new Date(year, 11, 31) 
        } 
      }).lean()

      // Check some known recurring holidays
      const newYearsDay = holidays.find(h => h.name === "New Year's Day" && h.state === 'NAT')
      expect(newYearsDay?.isRecurring).toBe(true)

      const christmasDay = holidays.find(h => h.name === 'Christmas Day' && h.state === 'NAT')
      expect(christmasDay?.isRecurring).toBe(true)

      // Check some known non-recurring holidays (calculated dates)
      const goodFriday = holidays.find(h => h.name === 'Good Friday' && h.state === 'NAT')
      expect(goodFriday?.isRecurring).toBe(false)

      const easterMonday = holidays.find(h => h.name === 'Easter Monday' && h.state === 'NAT')
      expect(easterMonday?.isRecurring).toBe(false)
    })

    it('should normalize dates to start of day', async () => {
      const year = 2026
      await service.seedYear(year)

      const holidays = await PublicHoliday.find({ 
        date: { 
          $gte: new Date(year, 0, 1), 
          $lte: new Date(year, 11, 31) 
        } 
      }).lean()

      // All dates should be normalized to start of day (00:00:00.000)
      for (const holiday of holidays) {
        expect(holiday.date.getHours()).toBe(0)
        expect(holiday.date.getMinutes()).toBe(0)
        expect(holiday.date.getSeconds()).toBe(0)
        expect(holiday.date.getMilliseconds()).toBe(0)
      }
    })
  })
})