import { redirect } from 'next/navigation'

// Backwards-compatible redirect: /api/docs -> /docs/api
export default function ApiDocsRedirect() {
  redirect('/docs/api')
}