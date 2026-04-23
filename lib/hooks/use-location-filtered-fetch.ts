import { useCallback, useEffect, useState } from 'react'
import { useDashboardLocationScope } from '@/components/providers/DashboardLocationScopeProvider'

/**
 * A reusable hook for fetching data with location-based filtering.
 * This hook ensures that:
 * 1. Data is only fetched when location scope is ready
 * 2. Location filter is always applied based on header selection
 * 3. Prevents unnecessary API calls during initialization
 * 
 * @example
 * ```tsx
 * const { data, loading, refetch } = useLocationFilteredFetch(
 *   async (locationNames) => {
 *     return await api.getData({ location: locationNames.join(',') })
 *   },
 *   [otherDependencies]
 * )
 * ```
 */
export function useLocationFilteredFetch<T>(
  fetchFn: (selectedLocationNames: string[]) => Promise<T>,
  dependencies: any[] = []
) {
  const { selectedLocationNames, isReady: locationScopeReady } = useDashboardLocationScope()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    // Don't fetch until location scope is ready
    if (!locationScopeReady) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await fetchFn(selectedLocationNames)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, locationScopeReady, selectedLocationNames])

  useEffect(() => {
    fetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch, ...dependencies])

  return {
    data,
    loading,
    error,
    refetch: fetch,
    isReady: locationScopeReady,
    selectedLocationNames,
  }
}

/**
 * Hook for managing location-aware pagination and filtering.
 * Useful for tables and lists that need location-based filtering.
 * 
 * @example
 * ```tsx
 * const {
 *   data,
 *   loading,
 *   pagination,
 *   setPagination,
 *   filters,
 *   setFilters,
 *   refetch
 * } = useLocationFilteredPagination(
 *   async (params) => {
 *     return await api.getList(params)
 *   }
 * )
 * ```
 */
export function useLocationFilteredPagination<T>(
  fetchFn: (params: {
    selectedLocationNames: string[]
    pageIndex: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
    filters?: Record<string, any>
  }) => Promise<{ data: T[]; total: number }>
) {
  const { selectedLocationNames, isReady: locationScopeReady } = useDashboardLocationScope()
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})

  const fetch = useCallback(async () => {
    // Don't fetch until location scope is ready
    if (!locationScopeReady) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await fetchFn({
        selectedLocationNames,
        pageIndex,
        pageSize,
        sortBy,
        sortOrder,
        search,
        filters,
      })
      setData(result.data)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, locationScopeReady, selectedLocationNames, pageIndex, pageSize, sortBy, sortOrder, search, filters])

  useEffect(() => {
    fetch()
  }, [fetch])

  // Reset to first page when search or filters change
  useEffect(() => {
    setPageIndex(0)
  }, [search, filters])

  return {
    data,
    total,
    loading,
    error,
    isReady: locationScopeReady,
    selectedLocationNames,
    pagination: {
      pageIndex,
      pageSize,
      setPageIndex,
      setPageSize,
    },
    sorting: {
      sortBy,
      sortOrder,
      setSortBy,
      setSortOrder,
    },
    search: {
      value: search,
      setValue: setSearch,
    },
    filters: {
      value: filters,
      setValue: setFilters,
    },
    refetch: fetch,
  }
}
