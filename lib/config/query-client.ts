import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/query-persist-client-core'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// Create IndexedDB persister
const persister = typeof window !== 'undefined'
  ? createSyncStoragePersister({
      storage: {
        getItem: (key: string) => {
          try {
            return localStorage.getItem(key)
          } catch {
            return null
          }
        },
        setItem: (key: string, value: string) => {
          try {
            localStorage.setItem(key, value)
          } catch {
            // Ignore storage errors
          }
        },
        removeItem: (key: string) => {
          try {
            localStorage.removeItem(key)
          } catch {
            // Ignore storage errors
          }
        },
      },
    })
  : undefined

// Create query client with offline-first configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 24 hours
      gcTime: 1000 * 60 * 60 * 24,
      // Stale time of 5 minutes
      staleTime: 1000 * 60 * 5,
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry if it's a network error (offline)
        if (error?.message?.includes('fetch')) {
          return false
        }
        return failureCount < 3
      },
      // Enable background refetch when online
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations when back online
      retry: (failureCount, error: any) => {
        // Don't retry if it's a network error (offline)
        if (error?.message?.includes('fetch')) {
          return false
        }
        return failureCount < 3
      },
    },
  },
})

// Setup persistence
if (typeof window !== 'undefined' && persister) {
  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  })
}
