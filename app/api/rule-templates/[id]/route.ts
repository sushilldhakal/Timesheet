import { NextRequest, NextResponse } from 'next/server'
import { RuleTemplate } from '@/lib/db/schemas/rule-template'
import { connectDB } from '@/lib/db'
import { awardRuleSchema } from '@/lib/validations/awards'
import mongoose from 'mongoose'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const template = await RuleTemplate.findById(params.id).lean()

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Error fetching rule template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const template = await RuleTemplate.findById(params.id)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Prevent editing default templates
    if (template.isDefault) {
      return NextResponse.json(
        { error: 'Cannot edit default templates' },
        { status: 403 }
      )
    }

    const data = await req.json()

    // Validate using awardRuleSchema
    const validated = awardRuleSchema.partial().parse({
      name: data.name,
      description: data.description,
      priority: data.priority,
      isActive: data.isActive,
      canStack: data.canStack,
      conditions: data.conditions,
      outcome: data.outcome,
    })

    Object.assign(template, {
      name: validated.name || template.name,
      description: validated.description || template.description,
      priority: validated.priority ?? template.priority,
      isActive: validated.isActive ?? template.isActive,
      canStack: validated.canStack ?? template.canStack,
      conditions: validated.conditions || template.conditions,
      outcome: validated.outcome || template.outcome,
      category: data.category || template.category,
      tags: data.tags || template.tags,
    })

    await template.save()
    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Error updating rule template:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const template = await RuleTemplate.findById(params.id)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Prevent deleting default templates
    if (template.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default templates' },
        { status: 403 }
      )
    }

    await RuleTemplate.deleteOne({ _id: params.id })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting rule template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
