import { useQuery } from '@tanstack/react-query'
import * as weatherApi from '@/lib/api/weather'

// Query keys
export const weatherKeys = {
  forecast: (params: Parameters<typeof weatherApi.getWeatherForecast>[0]) => 
    ['weather', 'forecast', params] as const,
}

// Get weather forecast
export function useWeatherForecast(params: Parameters<typeof weatherApi.getWeatherForecast>[0], enabled: boolean = true) {
  return useQuery({
    queryKey: weatherKeys.forecast(params),
    queryFn: () => weatherApi.getWeatherForecast(params),
    enabled: enabled && !!params.lat && !!params.lng,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}
