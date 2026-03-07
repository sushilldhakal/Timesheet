import { NextResponse } from 'next/server'
import spec from '@/lib/openapi/spec.json'

export async function GET() {
  return NextResponse.json(spec)
}