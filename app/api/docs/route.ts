import { ApiReference } from '@scalar/nextjs-api-reference'

const config = {
  spec: {
    url: '/api/openapi.json',
  },
} as any

export const GET = ApiReference(config)