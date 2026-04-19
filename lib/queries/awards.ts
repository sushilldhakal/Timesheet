import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as awardsApi from '@/lib/api/awards'

// Query keys
export const awardKeys = {
  all: ['awards'] as const,
  detail: (id: string) => [...awardKeys.all, 'detail', id] as const,
  versions: (id: string) => [...awardKeys.all, 'versions', id] as const,
  ruleTemplates: ['rule-templates'] as const,
}

// Get all awards
export function useAwards() {
  return useQuery({
    queryKey: awardKeys.all,
    queryFn: awardsApi.getAwards,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get award by ID
export function useAward(id: string) {
  return useQuery({
    queryKey: awardKeys.detail(id),
    queryFn: () => awardsApi.getAward(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create award
export function useCreateAward() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: awardsApi.createAward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: awardKeys.all })
    },
  })
}

// Update award
export function useUpdateAward() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: awardsApi.UpdateAwardRequest }) =>
      awardsApi.updateAward(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: awardKeys.all })
      queryClient.invalidateQueries({ queryKey: awardKeys.detail(variables.id) })
    },
  })
}

// Delete award
export function useDeleteAward() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: awardsApi.deleteAward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: awardKeys.all })
    },
  })
}

// Get award version history
export function useAwardVersionHistory(awardId: string) {
  return useQuery({
    queryKey: awardKeys.versions(awardId),
    queryFn: () => awardsApi.getAwardVersions(awardId),
    enabled: !!awardId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create award version
export function useCreateAwardVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      awardId, 
      data 
    }: { 
      awardId: string
      data: { changelog: string; effectiveFrom: string; versionBump: 'major' | 'minor' | 'patch' }
    }) => awardsApi.createAwardVersion(awardId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: awardKeys.versions(variables.awardId) })
      queryClient.invalidateQueries({ queryKey: awardKeys.detail(variables.awardId) })
    },
  })
}

// Test/evaluate award rules
export function useTestAwardRules() {
  return useMutation({
    mutationFn: awardsApi.evaluateAwardRules,
  })
}

// Get rule templates
export function useRuleTemplates(params?: { search?: string; category?: string }) {
  return useQuery({
    queryKey: [...awardKeys.ruleTemplates, params],
    queryFn: () => awardsApi.getRuleTemplates(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create rule template
export function useCreateRuleTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: awardsApi.createRuleTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: awardKeys.ruleTemplates })
    },
  })
}

// Update rule template
export function useUpdateRuleTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      awardsApi.updateRuleTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: awardKeys.ruleTemplates })
    },
  })
}

// Delete rule template
export function useDeleteRuleTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: awardsApi.deleteRuleTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: awardKeys.ruleTemplates })
    },
  })
}