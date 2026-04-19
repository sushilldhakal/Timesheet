import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as publicHolidaysApi from '@/lib/api/public-holidays'
import type { CreatePublicHolidayRequest, GetPublicHolidaysParams } from '@/lib/api/public-holidays'

export const publicHolidayKeys = {
  all: (year: number, state?: string) => ['public-holidays', year, state ?? 'All'] as const,
}

export function usePublicHolidays(params: GetPublicHolidaysParams) {
  return useQuery({
    queryKey: publicHolidayKeys.all(params.year, params.state),
    queryFn: () => publicHolidaysApi.getPublicHolidays(params),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreatePublicHoliday(year: number, state?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePublicHolidayRequest) => publicHolidaysApi.createPublicHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicHolidayKeys.all(year, state) })
    },
  })
}

export function useDeletePublicHoliday(year: number, state?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => publicHolidaysApi.deletePublicHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicHolidayKeys.all(year, state) })
    },
  })
}

export function useSeedPublicHolidays(year: number, state?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (seedYear: number) => publicHolidaysApi.seedPublicHolidays(seedYear),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicHolidayKeys.all(year, state) })
    },
  })
}
