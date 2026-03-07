export interface UploadResponse {
  url: string
  publicId?: string
}

// Upload image
export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/upload/image', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }
  
  return response.json()
}