/** WMO Weather interpretation codes (WW) — Open-Meteo `weather_code`. @see https://open-meteo.com/en/docs */

export function wmoCodeDescription(code: number): string {
  const c = Math.round(code)
  if (c === 0) return 'Clear sky'
  if (c >= 1 && c <= 3) {
    if (c === 1) return 'Mainly clear'
    if (c === 2) return 'Partly cloudy'
    return 'Overcast'
  }
  if (c === 45 || c === 48) return 'Fog'
  if (c >= 51 && c <= 55) return 'Drizzle'
  if (c === 56 || c === 57) return 'Freezing drizzle'
  if (c >= 61 && c <= 65) return 'Rain'
  if (c === 66 || c === 67) return 'Freezing rain'
  if (c >= 71 && c <= 75) return 'Snow fall'
  if (c === 77) return 'Snow grains'
  if (c >= 80 && c <= 82) return 'Rain showers'
  if (c === 85 || c === 86) return 'Snow showers'
  if (c === 95) return 'Thunderstorm'
  if (c === 96 || c === 99) return 'Thunderstorm with hail'
  return 'Mixed conditions'
}

/** Rough bucket for picking an icon */
export type WeatherIconKind =
  | 'clear'
  | 'partly'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm'

export function wmoCodeIconKind(code: number): WeatherIconKind {
  const c = Math.round(code)
  if (c === 0) return 'clear'
  if (c >= 1 && c <= 3) return c === 3 ? 'cloud' : 'partly'
  if (c === 45 || c === 48) return 'fog'
  if (c >= 51 && c <= 57) return 'drizzle'
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return 'rain'
  if (c >= 71 && c <= 77 || c === 85 || c === 86) return 'snow'
  if (c >= 95 && c <= 99) return 'storm'
  return 'cloud'
}

export function daySummarySentence(code: number, maxPrecipProb: number): string {
  const base = wmoCodeDescription(code)
  const rainish =
    maxPrecipProb >= 25 ||
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
      Math.round(code),
    )
  const tail = rainish ? ' with a chance of rain' : ''
  return `${base} throughout the day${tail}.`
}

export function formatSlotLabel(hour24: number): string {
  if (hour24 === 0) return '12:00a'
  if (hour24 < 12) return `${hour24}:00a`
  if (hour24 === 12) return '12:00p'
  return `${hour24 - 12}:00p`
}
