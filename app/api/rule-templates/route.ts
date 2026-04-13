import { NextRequest, NextResponse } from 'next/server'
import { RuleTemplate } from '@/lib/db/schemas/rule-template'
import { connectDB } from '@/lib/db'
import { awardRuleSchema, ruleOutcomeSchema } from '@/lib/validations/awards'
import { ZodError } from 'zod'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    let query: any = {}

    if (category) {
      query.category = category
    }

    let templates = await RuleTemplate.find(query).lean()

    if (search) {
      const searchLower = search.toLowerCase()
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
      )
    }

    templates.sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ templates })
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
    await connectDB()
    const data = await req.json()

    if (!data.outcome?.type) {
      return NextResponse.json(
        { error: 'outcome.type is required. Must be one of: ordinary, overtime, break, allowance, toil, leave' },
        { status: 400 }
      )
    }

    const validated = awardRuleSchema.partial({ id: true, createdAt: true, updatedAt: true }).parse({
      name: data.name,
      description: data.description,
      priority: data.priority,
      isActive: data.isActive,
      canStack: data.canStack,
      conditions: data.conditions,
      outcome: data.outcome,
    })

    const template = await RuleTemplate.create({
      name: validated.name,
      description: validated.description,
      priority: validated.priority,
      isActive: validated.isActive,
      canStack: validated.canStack,
      conditions: validated.conditions,
      outcome: validated.outcome,
      category: data.category,
      tags: data.tags,
      isDefault: false,
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error: any) {
    console.error('Error creating rule template:', error)

    if (error instanceof ZodError) {
      const messages = error.issues.map(i => {
        const path = i.path.join('.')
        return `${path}: ${i.message}`
      })
      return NextResponse.json(
        { error: `Validation failed: ${messages.join('; ')}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 400 }
    )
  }
}
