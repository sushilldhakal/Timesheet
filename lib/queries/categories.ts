import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as categoriesApi from '@/lib/api/categories'
import { CategoryType } from '@/lib/config/category-types'

// Query keys
export const categoryKeys = {
  all: ['categories'] as const,
  byType: (type: CategoryType) => [...categoryKeys.all, 'type', type] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
}

// Get all categories
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: () => categoriesApi.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get categories by type
export function useCategoriesByType(type: CategoryType) {
  return useQuery({
    queryKey: categoryKeys.byType(type),
    queryFn: () => categoriesApi.getCategories(type),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get category by ID
export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => categoriesApi.getCategory(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create category
export function useCreateCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: categoriesApi.createCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      if (data.category?.type) {
        queryClient.invalidateQueries({ queryKey: categoryKeys.byType(data.category.type) })
      }
    },
  })
}

// Update category
export function useUpdateCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: categoriesApi.UpdateCategoryRequest }) =>
      categoriesApi.updateCategory(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(variables.id) })
      if (data.category?.type) {
        queryClient.invalidateQueries({ queryKey: categoryKeys.byType(data.category.type) })
      }
    },
  })
}

// Delete category
export function useDeleteCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: categoriesApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}