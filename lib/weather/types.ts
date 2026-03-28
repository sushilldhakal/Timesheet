export interface WeatherDayPayload {
  date: string
  summary: string
  weatherCode: number
  high: number
  low: number
  feelsHigh: number
  feelsLow: number
  maxPrecipProb: number
  slots: Array<{
    label: string
    hour: number
    temp: number
    precipProb: number
    feels: number
  }>
}

export interface WeatherForecastApiResponse {
  days: Record<string, WeatherDayPayload>
}
