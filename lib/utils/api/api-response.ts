/**
 * Utility functions for consistent API response formatting
 */

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  metadata?: {
    timestamp?: string
    count?: number
    [key: string]: any
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    code?: string
    details?: any
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Format a successful API response
 */
export function formatSuccess<T>(
  data: T,
  metadata?: ApiSuccessResponse["metadata"]
): ApiSuccessResponse<T> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  }

  if (metadata) {
    response.metadata = {
      timestamp: new Date().toISOString(),
      ...metadata,
    }
  }

  return response
}

/**
 * Format an error API response
 */
export function formatError(
  message: string,
  code?: string,
  details?: any
): ApiErrorResponse {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
  }
}
