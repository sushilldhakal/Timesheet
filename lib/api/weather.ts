import { apiFetch } from './fetch-client'
import type { WeatherForecastApiResponse } from '@/lib/weather/types'

// Get weather forecast for a location and date range
export async function getWeatherForecast(params: {
  lat: number
  lng: number
  start: string
  end: string
}): Promise<WeatherForecastApiResponse> {
  const u = new URL('/api/weather/forecast', typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  u.searchParams.set('lat', String(params.lat))
  u.searchParams.set('lng', String(params.lng))
  u.searchParams.set('start', params.start)
  u.searchParams.set('end', params.end)
  return apiFetch<WeatherForecastApiResponse>(u.pathname + u.search)
}
