import { useMutation } from '@tanstack/react-query'
import * as uploadApi from '@/lib/api/upload'

// Upload image
export function useUploadImage() {
  return useMutation({
    mutationFn: uploadApi.uploadImage,
  })
}