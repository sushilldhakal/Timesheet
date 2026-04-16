import { NextRequest, NextResponse } from 'next/server'
import { ruleTemplatesService } from '@/lib/services/award/rule-templates-service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await ruleTemplatesService.get(id)
    return NextResponse.json(result.data, { status: result.status })
  } catch (error: any) {
    console.error('Error fetching rule template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await req.json()
    const result = await ruleTemplatesService.update(id, data)
    return NextResponse.json(result.data, { status: result.status })
  } catch (error: any) {
    console.error('Error updating rule template:', error)
    const mapped = ruleTemplatesService.mapError(error, error.message || "Failed to update template", 400)
    return NextResponse.json(mapped.data, { status: mapped.status })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await ruleTemplatesService.remove(id)
    return NextResponse.json(result.data, { status: result.status })
  } catch (error: any) {
    console.error('Error deleting rule template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
