import type { ViewString } from "../types"

export type DateRange = { start: Date; end: Date }

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function startOfWeekMon(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay() // 0 Sun..6 Sat
  const diffToMon = (day + 6) % 7
  x.setDate(x.getDate() - diffToMon)
  return x
}

function endOfWeekSun(d: Date): Date {
  const s = startOfWeekMon(d)
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  return endOfDay(e)
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1))
}

function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

function startOfYear(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), 0, 1))
}

function endOfYear(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), 11, 31))
}

export function calculateDateRange(selectedDate: Date, view: ViewString): DateRange {
  const base = view.startsWith("list") ? (view.slice(4) as ViewString) : view
  switch (base) {
    case "day":
      return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) }
    case "week":
      return { start: startOfWeekMon(selectedDate), end: endOfWeekSun(selectedDate) }
    case "month":
      return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) }
    case "year":
      return { start: startOfYear(selectedDate), end: endOfYear(selectedDate) }
    default:
      return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) }
  }
}

