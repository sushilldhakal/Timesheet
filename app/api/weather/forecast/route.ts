import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookie } from '@/lib/auth/auth-helpers'
import type { WeatherDayPayload } from '@/lib/weather/types'
import {
  daySummarySentence,
  formatSlotLabel,
} from '@/lib/weather/wmo-weather'

export const runtime = 'nodejs'

const SLOT_HOURS = [0, 4, 8, 12, 16, 20] as const

interface OpenMeteoHourly {
  time: string[]
  temperature_2m: number[]
  apparent_temperature: number[]
  precipitation_probability: number[]
  weather_code: number[]
}

interface OpenMeteoDaily {
  time: string[]
  weather_code: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  apparent_temperature_max: number[]
  apparent_temperature_min: number[]
  precipitation_probability_max: number[]
}

function parseHourFromIsoLocal(t: string): { date: string; hour: number } | null {
  if (t.length < 13) return null
  const date = t.slice(0, 10)
  const h = parseInt(t.slice(11, 13), 10)
  if (!Number.isFinite(h)) return null
  return { date, hour: h }
}

function buildDayPayload(
  isoDate: string,
  hourly: OpenMeteoHourly,
  daily: OpenMeteoDaily,
): WeatherDayPayload | null {
  const di = daily.time.indexOf(isoDate)
  if (di < 0) return null

  const weatherCode = daily.weather_code[di] ?? 0
  const high = daily.temperature_2m_max[di] ?? 0
  const low = daily.temperature_2m_min[di] ?? 0
  const feelsHigh = daily.apparent_temperature_max[di] ?? high
  const feelsLow = daily.apparent_temperature_min[di] ?? low
  const maxPrecipProb = Math.round(daily.precipitation_probability_max[di] ?? 0)

  const slots: WeatherDayPayload['slots'] = []
  const times = hourly.time
  const temp = hourly.temperature_2m
  const feels = hourly.apparent_temperature
  const precip = hourly.precipitation_probability
  const codes = hourly.weather_code

  for (const wantH of SLOT_HOURS) {
    let idx = -1
    for (let i = 0; i < times.length; i++) {
      const parsed = parseHourFromIsoLocal(times[i]!)
      if (!parsed || parsed.date !== isoDate || parsed.hour !== wantH) continue
      idx = i
      break
    }
    if (idx < 0) continue
    slots.push({
      label: formatSlotLabel(wantH),
      hour: wantH,
      temp: Math.round((temp[idx] ?? 0) * 10) / 10,
      precipProb: Math.round(precip[idx] ?? 0),
      feels: Math.round((feels[idx] ?? temp[idx] ?? 0) * 10) / 10,
    })
  }

  return {
    date: isoDate,
    summary: daySummarySentence(weatherCode, maxPrecipProb),
    weatherCode,
    high: Math.round(high * 10) / 10,
    low: Math.round(low * 10) / 10,
    feelsHigh: Math.round(feelsHigh * 10) / 10,
    feelsLow: Math.round(feelsLow * 10) / 10,
    maxPrecipProb,
    slots,
  }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lat = parseFloat(req.nextUrl.searchParams.get('lat') || '')
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') || '')
  const start = req.nextUrl.searchParams.get('start')
  const end = req.nextUrl.searchParams.get('end')

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !start || !end) {
    return NextResponse.json(
      { error: 'Query params lat, lng, start, end (YYYY-MM-DD) are required' },
      { status: 400 },
    )
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('start_date', start)
  url.searchParams.set('end_date', end)
  url.searchParams.set(
    'hourly',
    'temperature_2m,apparent_temperature,precipitation_probability,weather_code',
  )
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max',
  )

  // NOTE: Open-Meteo rejects `past_days` when `start_date`/`end_date` are set (mutually exclusive).
  // Use only the date range here. For older dates, their archive/historical APIs are separate.

  let res: Response
  try {
    res = await fetch(url.toString(), { cache: 'no-store' })
  } catch {
    return NextResponse.json({ error: 'Weather request failed' }, { status: 502 })
  }

  const rawText = await res.text()
  let body: {
    error?: boolean
    reason?: string
    hourly?: OpenMeteoHourly
    daily?: OpenMeteoDaily
  }
  try {
    body = JSON.parse(rawText) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from weather service' }, { status: 502 })
  }

  if (!res.ok) {
    const msg =
      typeof body.reason === 'string'
        ? body.reason
        : `Weather service HTTP ${res.status}`
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  if (body.error || !body.hourly || !body.daily) {
    return NextResponse.json(
      { error: body.reason || 'Invalid Open-Meteo response' },
      { status: 502 },
    )
  }

  const days: Record<string, WeatherDayPayload> = {}
  for (const isoDate of body.daily.time) {
    const payload = buildDayPayload(isoDate, body.hourly, body.daily)
    if (payload) days[isoDate] = payload
  }

  return NextResponse.json({ days })
}
