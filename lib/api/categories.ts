import { CategoryType } from '@/lib/config/category-types'

export interface Category {
  id: string
  name: string
  type: CategoryType
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: 'hard' | 'soft'
  openingHour?: number
  closingHour?: number
  workingDays?: number[]
  color?: string
  defaultScheduleTemplate?: {
    standardHoursPerWeek?: number
    shiftPattern?: any
  }
  createdAt?: string
  updatedAt?: string
}

export interface CreateCategoryRequest {
  name: string
  type: CategoryType
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: 'hard' | 'soft'
  openingHour?: number
  closingHour?: number
  workingDays?: number[]
  color?: string
  defaultScheduleTemplate?: {
    standardHoursPerWeek?: number
    shiftPattern?: any
  }
}

export interface UpdateCategoryRequest {
  name?: string
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: 'hard' | 'soft'
  openingHour?: number
  closingHour?: number
  workingDays?: number[]
  color?: string
  defaultScheduleTemplate?: {
    standardHoursPerWeek?: number
    shiftPattern?: any
  }
}

export interface CategoriesResponse {
  categories: Category[]
}

export interface CategoryResponse {
  category: Category
}

// Get categories with optional type filter
export async function getCategories(type?: CategoryType): Promise<CategoriesResponse> {
  const url = type 
    ? `/api/categories?type=${encodeURIComponent(type)}`
    : '/api/categories'
  
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }
  
  return response.json()
}

// Get category by ID
export async function getCategory(id: string): Promise<CategoryResponse> {
  const response = await fetch(`/api/categories/${id}`, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch category')
  }
  
  return response.json()
}

// Create category
export async function createCategory(data: CreateCategoryRequest): Promise<CategoryResponse> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create category')
  }
  
  return response.json()
}

// Update category
export async function updateCategory(id: string, data: UpdateCategoryRequest): Promise<CategoryResponse> {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update category')
  }
  
  return response.json()
}

// Delete category
export async function deleteCategory(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete category')
  }
  
  return response.json()
}