import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookie } from '@/lib/auth/auth-helpers'
import { weatherForecastService } from "@/lib/services/weather/weather-forecast-service"

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "")
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "")
  const start = req.nextUrl.searchParams.get("start") || ""
  const end = req.nextUrl.searchParams.get("end") || ""

  const result = await weatherForecastService.getForecast({ lat, lng, start, end })
  return NextResponse.json(result.data, { status: result.status })
}
