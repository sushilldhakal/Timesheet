export type WindowType = 'weekly' | 'fortnightly' | 'roster_cycle' | 'rolling_days'

export interface PayPeriodConfig {
  windowType: WindowType
  /** 0=Sun, 1=Mon…6=Sat. Required for weekly/fortnightly. */
  periodStartDayOfWeek?: number
  /** Required for roster_cycle. */
  rosterCycleDays?: number
  /** Required for rolling_days. */
  rollingDays?: number
}

export interface TimeWindow {
  start: Date
  end: Date
  windowType: WindowType
  label: string
}

export class ComplianceWindowResolver {
  resolveMaxHoursWindow(date: Date, config: PayPeriodConfig): TimeWindow {
    switch (config.windowType) {
      case 'weekly':
        return this._weeklyWindow(date, config.periodStartDayOfWeek ?? 1)
      case 'fortnightly':
        return this._fortnightlyWindow(date, config.periodStartDayOfWeek ?? 1)
      case 'rolling_days':
        return this._rollingWindow(date, config.rollingDays ?? 7)
      case 'roster_cycle':
        return this._rosterCycleWindow(date, config.rosterCycleDays ?? 14)
    }
  }

  resolveConsecutiveDaysWindow(date: Date, maxDays: number): TimeWindow {
    // Need enough lookback to detect a full run: maxDays * 2 + 1
    return this._rollingWindow(date, maxDays * 2 + 1)
  }

  resolveRestPeriodWindow(shiftStart: Date): TimeWindow {
    const end = new Date(shiftStart)
    const start = new Date(shiftStart)
    start.setHours(start.getHours() - 48)
    return { start, end, windowType: 'rolling_days', label: '48h lookback' }
  }

  private _weeklyWindow(date: Date, startDay: number): TimeWindow {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const daysBack = (d.getDay() - startDay + 7) % 7
    const start = new Date(d)
    start.setDate(start.getDate() - daysBack)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    const wn = this._weekNum(start)
    return { start, end, windowType: 'weekly', label: `${start.getFullYear()}-W${wn}` }
  }

  private _fortnightlyWindow(date: Date, startDay: number): TimeWindow {
    const week = this._weeklyWindow(date, startDay)
    const wn = this._weekNum(week.start)
    const start = new Date(week.start)
    if (wn % 2 === 0) start.setDate(start.getDate() - 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 13)
    end.setHours(23, 59, 59, 999)
    const fn = Math.ceil(this._weekNum(start) / 2)
    return { start, end, windowType: 'fortnightly', label: `${start.getFullYear()}-FN${fn}` }
  }

  private _rollingWindow(date: Date, days: number): TimeWindow {
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setDate(start.getDate() - (days - 1))
    start.setHours(0, 0, 0, 0)
    return { start, end, windowType: 'rolling_days', label: `Rolling ${days}d` }
  }

  private _rosterCycleWindow(date: Date, cycleDays: number): TimeWindow {
    // Epoch: first Monday of 2025
    const epoch = new Date('2025-01-06T00:00:00Z')
    const diffDays = Math.floor((date.getTime() - epoch.getTime()) / 86_400_000)
    const offset = ((diffDays % cycleDays) + cycleDays) % cycleDays
    const start = new Date(date)
    start.setDate(start.getDate() - offset)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + cycleDays - 1)
    end.setHours(23, 59, 59, 999)
    return {
      start,
      end,
      windowType: 'roster_cycle',
      label: `Cycle from ${start.toISOString().slice(0, 10)}`,
    }
  }

  private _weekNum(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
  }
}

export const complianceWindowResolver = new ComplianceWindowResolver()
