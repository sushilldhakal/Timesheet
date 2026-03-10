import { redirect } from 'next/navigation'

export default function ApiRedirect() {
  redirect('/api/docs')
}