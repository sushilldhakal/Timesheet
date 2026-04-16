import { NextRequest, NextResponse } from 'next/server'
import { ruleTemplatesService } from '@/lib/services/award/rule-templates-service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const result = await ruleTemplatesService.list({ category, search })
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching rule templates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const result = await ruleTemplatesService.create(data)
    return NextResponse.json(result.data, { status: result.status })
  } catch (error: any) {
    console.error('Error creating rule template:', error)
    const mapped = ruleTemplatesService.mapError(error, 'Failed to create template', 400)
    return NextResponse.json(mapped.data, { status: mapped.status })
  }
}
