"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  BookOpen,
  Layers,
  Tag,
  Filter,
  Target,
  Lightbulb,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  Info,
  AlertTriangle,
  Clock,
  DollarSign,
  Coffee,
  Calendar,
  Shield,
} from "lucide-react"

interface DocSection {
  id: string
  label: string
  icon: React.ReactNode
}

const sections: DocSection[] = [
  { id: "overview", label: "Overview", icon: <BookOpen className="h-4 w-4" /> },
  { id: "specificity", label: "Rule Specificity", icon: <Layers className="h-4 w-4" /> },
  { id: "tags", label: "Award Tags", icon: <Tag className="h-4 w-4" /> },
  { id: "conditions", label: "Conditions", icon: <Filter className="h-4 w-4" /> },
  { id: "outcomes", label: "Outcomes", icon: <Target className="h-4 w-4" /> },
  { id: "best-practices", label: "Best Practices", icon: <Lightbulb className="h-4 w-4" /> },
  { id: "faq", label: "FAQ", icon: <HelpCircle className="h-4 w-4" /> },
]

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
      <div className="text-sm text-blue-800 dark:text-blue-300">{children}</div>
    </div>
  )
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
      <div className="text-sm text-yellow-800 dark:text-yellow-300">{children}</div>
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-lg border bg-muted/50 p-3 text-xs overflow-x-auto">
      <code>{children}</code>
    </pre>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold mt-6 mb-3 first:mt-0">{children}</h3>
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-semibold mt-4 mb-2">{children}</h4>
}

function OverviewSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Think of Awards as your pay rulebook. They automatically work out how much to pay employees 
        based on when they work, how long they work, and what type of employee they are. No more 
        manual calculations!
      </p>

      <SectionHeading>How It Works (In 3 Simple Steps)</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            step: "1",
            title: "Set Up Rules",
            desc: "Tell the system when to pay extra (e.g., weekends, overtime)",
            icon: <Filter className="h-5 w-5" />,
          },
          {
            step: "2",
            title: "System Checks",
            desc: "When a shift is created, the system finds the best matching rule",
            icon: <Layers className="h-5 w-5" />,
          },
          {
            step: "3",
            title: "Pay Calculated",
            desc: "The correct pay rate is automatically applied",
            icon: <Target className="h-5 w-5" />,
          },
        ].map((item) => (
          <Card key={item.step} className="relative">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionHeading>Understanding the Basics</SectionHeading>
      <div className="space-y-3">
        {[
          { term: "Rules", def: "Instructions that say \"IF this happens, THEN pay this amount.\" For example: \"IF it's Saturday, THEN pay 1.5 times the normal rate.\"" },
          { term: "Conditions", def: "The \"IF\" part - things like which day it is, how many hours worked, or if it's a public holiday." },
          { term: "Pay Rates", def: "The \"THEN\" part - what actually gets paid. Could be extra money, time off, or meal breaks." },
          { term: "Tags", def: "Special labels you can add to shifts (like \"TOIL\" or \"Training\") to change how they're paid." },
          { term: "Base Rate", def: "The starting hourly rate for each employee level (like Level 1, Level 2, etc.)." },
          { term: "Most Specific Rule Wins", def: "If multiple rules could apply, the one with the most conditions wins. Think of it like being more precise." },
          { term: "Priority", def: "If two rules are equally specific, the one with the higher priority number wins." },
        ].map((item) => (
          <div key={item.term} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="text-sm font-medium">{item.term}:</span>{" "}
              <span className="text-sm text-muted-foreground">{item.def}</span>
            </div>
          </div>
        ))}
      </div>

      <TipBox>
        <strong>Pro Tip:</strong> Use the <strong>Test Scenarios</strong> tab to try out your rules before using them on real shifts. 
        It's like a practice run!
      </TipBox>
    </div>
  )
}

function SpecificitySection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        When multiple rules could apply to the same shift, the system needs to pick the best one. 
        It does this by choosing the <strong>most specific</strong> rule first, then using <strong>priority</strong> 
        as a tiebreaker.
      </p>

      <SectionHeading>How the System Picks the Right Rule</SectionHeading>
      <div className="space-y-2">
        {[
          "The system looks at all your active rules",
          "It checks which rules match the shift (all conditions must be true)",
          "Rules with MORE conditions are considered more specific",
          "The most specific rule wins",
          "If two rules are equally specific, the one with the higher priority number wins",
          "Rules marked as \"stackable\" can work together with the winning rule",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-muted-foreground">{step}</p>
          </div>
        ))}
      </div>

      <SectionHeading>Real-World Example</SectionHeading>
      <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Rule A: "Saturday Pay"</p>
          <p className="text-xs text-muted-foreground">• Only checks: Is it Saturday?</p>
          <p className="text-xs text-muted-foreground">• Number of conditions: 1</p>
          <p className="text-xs text-muted-foreground">• Priority: 10</p>
          <p className="text-xs text-muted-foreground">• Pays: 1.25x normal rate</p>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <p className="text-sm font-medium">Rule B: "Saturday Overtime"</p>
          <p className="text-xs text-muted-foreground">• Checks: Is it Saturday? AND Have they worked more than 8 hours?</p>
          <p className="text-xs text-muted-foreground">• Number of conditions: 2</p>
          <p className="text-xs text-muted-foreground">• Priority: 5</p>
          <p className="text-xs text-muted-foreground">• Pays: 1.5x normal rate</p>
        </div>
        
        <Separator />
        
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            For a 10-hour Saturday shift:
          </p>
          <p className="text-xs text-green-700 dark:text-green-400">
            ✓ Both rules match<br/>
            ✓ Rule B wins because it has 2 conditions (more specific)<br/>
            ✓ Rule A's higher priority (10 vs 5) doesn't matter<br/>
            ✓ Employee gets paid 1.5x rate
          </p>
        </div>
      </div>

      <TipBox>
        <strong>Remember:</strong> More specific always wins! Only use priority numbers to break ties 
        between rules with the same number of conditions. Think of priority as your backup plan.
      </TipBox>

      <SectionHeading>Stacking Rules (Working Together)</SectionHeading>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Some rules can be marked as "stackable" which means they can work alongside the winning rule. 
        For example, you might have a winning rule that pays 1.25x for Saturdays, and a stackable rule 
        that adds an extra 0.5x for night shifts. Together, they'd pay 1.75x (1.25 + 0.5).
      </p>
    </div>
  )
}

function TagsSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Tags are like sticky notes you can put on shifts to control how they're paid. They're a simple 
        way to handle special situations without creating complicated rules.
      </p>

      <SectionHeading>What Are Tags?</SectionHeading>
      <p className="text-sm text-muted-foreground">
        When creating a shift, managers can add tags like "TOIL", "Training", or "On-Call". 
        These tags tell the system to pay the shift differently. For example, adding a "TOIL" tag 
        might give time off instead of overtime pay.
      </p>

      <SectionHeading>How Tags Work With Rules</SectionHeading>
      <div className="space-y-3">
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Required Tags</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            The rule <strong>only works</strong> if the shift has this tag.
          </p>
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Example: TOIL Rule</p>
            <p className="text-xs text-muted-foreground">
              • Required tag: "TOIL"<br/>
              • This rule only applies when someone adds the TOIL tag to a shift<br/>
              • Without the tag, this rule is ignored
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">Excluded Tags</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            The rule <strong>doesn't work</strong> if the shift has this tag.
          </p>
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Example: Standard Overtime</p>
            <p className="text-xs text-muted-foreground">
              • Excluded tag: "TOIL"<br/>
              • This rule is skipped if the shift has a TOIL tag<br/>
              • Useful for preventing overtime pay when TOIL is chosen instead
            </p>
          </div>
        </div>
      </div>

      <SectionHeading>Tag Behaviors (How They Change Pay)</SectionHeading>
      <p className="text-sm text-muted-foreground mb-3">
        Tags can interact with rules in different ways:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { name: "Modify", desc: "Tweaks the pay rate (e.g., changes 1.5x to 1.75x)", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300" },
          { name: "Override", desc: "Completely replaces the normal pay with something else", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300" },
          { name: "Stack", desc: "Adds extra pay on top of the normal amount", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300" },
        ].map((b) => (
          <div key={b.name} className="rounded-lg border p-3">
            <Badge className={b.color}>{b.name}</Badge>
            <p className="text-xs text-muted-foreground mt-2">{b.desc}</p>
          </div>
        ))}
      </div>

      <TipBox>
        <strong>Common Use Case:</strong> Create a "TOIL" tag that requires the TOIL rule and excludes 
        the overtime rule. This lets managers choose between overtime pay or time off with a single click!
      </TipBox>
    </div>
  )
}

function ConditionsSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Conditions are the "IF" part of your rules. They tell the system when a rule should apply. 
        All conditions in a rule must be true for the rule to work.
      </p>

      <SectionHeading>Day & Time Conditions</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium">Condition</th>
              <th className="pb-2 text-left font-medium">What It Does</th>
              <th className="pb-2 text-left font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Days of Week</td>
              <td className="py-2 pr-4">Checks which day the shift is on</td>
              <td className="py-2 text-xs">Saturday & Sunday only</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Time Range</td>
              <td className="py-2 pr-4">Checks if shift is during certain hours</td>
              <td className="py-2 text-xs">Between 10pm and 6am (night shift)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHeading>Hours Worked Conditions</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium">Condition</th>
              <th className="pb-2 text-left font-medium">What It Does</th>
              <th className="pb-2 text-left font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Minimum Hours</td>
              <td className="py-2 pr-4">Shift must be at least this long</td>
              <td className="py-2 text-xs">At least 4 hours</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">After Hours Worked</td>
              <td className="py-2 pr-4">Applies after working this many hours in a day</td>
              <td className="py-2 text-xs">After 8 hours (overtime kicks in)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Weekly Hours</td>
              <td className="py-2 pr-4">Applies after working this many hours in a week</td>
              <td className="py-2 text-xs">After 38 hours per week</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHeading>Employee Type Conditions</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium">Condition</th>
              <th className="pb-2 text-left font-medium">What It Does</th>
              <th className="pb-2 text-left font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Employment Type</td>
              <td className="py-2 pr-4">Only applies to certain employee types</td>
              <td className="py-2 text-xs">Casual employees only</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHeading>Special Conditions</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium">Condition</th>
              <th className="pb-2 text-left font-medium">What It Does</th>
              <th className="pb-2 text-left font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Public Holiday</td>
              <td className="py-2 pr-4">Checks if it's a public holiday</td>
              <td className="py-2 text-xs">Christmas Day, New Year's Day, etc.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Required Tags</td>
              <td className="py-2 pr-4">Shift must have these tags</td>
              <td className="py-2 text-xs">Must have "TOIL" tag</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Excluded Tags</td>
              <td className="py-2 pr-4">Shift must NOT have these tags</td>
              <td className="py-2 text-xs">Can't have "TOIL" tag</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHeading>Real Example: Saturday Overtime</SectionHeading>
      <div className="rounded-lg border p-4 bg-muted/30">
        <p className="text-sm font-medium mb-3">Rule: "Saturday Overtime (30% extra)"</p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Conditions (all must be true):</strong></p>
          <p className="ml-4">✓ Day is Saturday</p>
          <p className="ml-4">✓ Employee has worked more than 8 hours</p>
          <p className="mt-3"><strong>What happens:</strong></p>
          <p className="ml-4">→ Employee gets paid 1.3x their normal rate</p>
          <p className="ml-4">→ This rule has 2 conditions, so it's fairly specific</p>
        </div>
      </div>

      <TipBox>
        <strong>Tip:</strong> The more conditions you add, the more specific your rule becomes. 
        Specific rules win over general rules!
      </TipBox>
    </div>
  )
}

function OutcomesSection() {
  const outcomes = [
    {
      type: "ordinary",
      label: "Normal Pay",
      icon: <Clock className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
      desc: "Standard hourly rate. This is your base pay.",
      fields: [
        { name: "Pay Rate", desc: "Usually 1.0x (normal rate)" },
        { name: "Payroll Code", desc: 'What appears on payslips (e.g., "Normal Hours")' },
      ],
      example: "Employee works 8 hours → Gets paid 8 hours at normal rate",
    },
    {
      type: "overtime",
      label: "Overtime / Penalty Rates",
      icon: <DollarSign className="h-5 w-5" />,
      color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
      desc: "Extra pay for working weekends, overtime, or unsociable hours.",
      fields: [
        { name: "Pay Rate", desc: "Higher than normal (e.g., 1.5x = time and a half)" },
        { name: "Payroll Code", desc: 'What appears on payslips (e.g., "Overtime 1.5x")' },
      ],
      example: "Employee works 10 hours on Saturday → Gets paid 1.5x for all 10 hours",
    },
    {
      type: "break",
      label: "Meal & Rest Breaks",
      icon: <Coffee className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
      desc: "Automatic breaks that employees are entitled to.",
      fields: [
        { name: "Duration", desc: "How long the break is (e.g., 30 minutes)" },
        { name: "Paid or Unpaid", desc: "Whether they get paid during the break" },
        { name: "Automatic", desc: "Whether it's added automatically or manually" },
      ],
      example: "Employee works 6 hours → Automatically gets a 30-minute unpaid meal break",
    },
    {
      type: "allowance",
      label: "Shift Allowances",
      icon: <DollarSign className="h-5 w-5" />,
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
      desc: "Fixed dollar amount paid per shift (not based on hours).",
      fields: [
        { name: "Amount", desc: "Fixed dollar amount (e.g., $25)" },
        { name: "Currency", desc: "Usually AUD" },
      ],
      example: "Employee works night shift → Gets $25 night shift allowance on top of normal pay",
    },
    {
      type: "toil",
      label: "TOIL (Time Off Instead)",
      icon: <Calendar className="h-5 w-5" />,
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
      desc: "Gives time off instead of (or in addition to) overtime pay.",
      fields: [
        { name: "Accrual Rate", desc: "How much time off per hour worked (e.g., 1.5 hours off per hour worked)" },
        { name: "Maximum Balance", desc: "Maximum hours that can be saved up" },
        { name: "Expiry", desc: "How long before unused TOIL expires" },
      ],
      example: "Employee works 2 hours overtime → Gets 3 hours of time off (1.5x accrual rate)",
    },
    {
      type: "leave",
      label: "Leave Accrual",
      icon: <Shield className="h-5 w-5" />,
      color: "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300",
      desc: "Automatic annual leave, sick leave, or long service leave.",
      fields: [
        { name: "Accrual Rate", desc: "How much leave earned per hour worked" },
        { name: "Leave Type", desc: "Annual leave, sick leave, personal leave, or long service" },
      ],
      example: "Employee works 38 hours → Automatically accrues 2.9 hours of annual leave",
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Outcomes are the "THEN" part of your rules - what actually happens when a rule matches. 
        Each rule has exactly one outcome.
      </p>

      <div className="space-y-4">
        {outcomes.map((o) => (
          <div key={o.type} className="rounded-lg border">
            <div className="flex items-center gap-3 p-3 border-b">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${o.color}`}>
                {o.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <p className="text-xs font-medium">What you set up:</p>
              <div className="space-y-1">
                {o.fields.map((f) => (
                  <div key={f.name} className="flex gap-2 text-xs">
                    <span className="font-medium shrink-0">{f.name}:</span>
                    <span className="text-muted-foreground">{f.desc}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-muted/50 p-2 mt-2">
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> {o.example}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TipBox>
        <strong>Quick Guide:</strong> Use Normal Pay for regular hours, Overtime for extra pay, 
        Breaks for meal breaks, Allowances for fixed amounts, TOIL for time off, and Leave Accrual 
        for automatic leave calculations.
      </TipBox>
    </div>
  )
}

function BestPracticesSection() {
  return (
    <div className="space-y-4">
      <SectionHeading>Organizing Your Rules</SectionHeading>
      <div className="space-y-2">
        {[
          "Give rules clear names like \"Saturday Penalty\", \"Overtime 1.5x\", or \"Night Allowance\"",
          "Group similar rules together - keep all overtime rules in one section, all break rules in another",
          "Create a basic \"Normal Pay\" rule with no conditions as your safety net",
          "Use priority numbers like 10, 20, 30 (not 1, 2, 3) so you can add rules in between later",
        ].map((tip, i) => (
          <div key={i} className="flex gap-3">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        ))}
      </div>

      <SectionHeading>Setting Up Conditions</SectionHeading>
      <div className="space-y-2">
        {[
          "More conditions = more specific = higher priority. Be as specific as you need to be!",
          "Don't create multiple similar rules with different priorities - use conditions instead",
          "Use tags for special cases instead of creating dozens of rule variations",
          "Always specify employee type (casual, part-time, full-time) if the rule only applies to one type",
        ].map((tip, i) => (
          <div key={i} className="flex gap-3">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        ))}
      </div>

      <SectionHeading>Common Rule Examples</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            title: "Weekend Penalty",
            desc: "Pay extra on weekends",
            example: "Saturday & Sunday → 1.25x to 1.5x pay",
          },
          {
            title: "Daily Overtime",
            desc: "Pay extra after 8 hours",
            example: "After 8 hours worked → 1.5x pay",
          },
          {
            title: "Public Holiday",
            desc: "Double pay on holidays",
            example: "Public holiday → 2.0x to 2.5x pay",
          },
          {
            title: "Meal Break",
            desc: "Automatic break entitlement",
            example: "After 5 hours → 30min unpaid break",
          },
          {
            title: "Night Allowance",
            desc: "Fixed payment for night work",
            example: "10pm to 6am → $25 allowance",
          },
          {
            title: "TOIL Option",
            desc: "Time off instead of overtime",
            example: "TOIL tag → 1.5x time off accrual",
          },
        ].map((p) => (
          <div key={p.title} className="rounded-lg border p-3">
            <p className="text-sm font-medium mb-1">{p.title}</p>
            <p className="text-xs text-muted-foreground mb-2">{p.desc}</p>
            <div className="rounded bg-muted/50 p-2">
              <p className="text-xs">{p.example}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionHeading>Tips for Success</SectionHeading>
      <div className="space-y-2">
        {[
          "Keep it simple - try to stay under 20 rules per award for best performance",
          "Be specific with conditions to reduce the number of rules the system needs to check",
          "Turn off unused rules instead of deleting them (you might need them later!)",
          "Always test new rules in the Test Scenarios tab before using them on real shifts",
        ].map((tip, i) => (
          <div key={i} className="flex gap-3">
            <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        ))}
      </div>

      <WarningBox>
        <strong>Important:</strong> Always test new rules using the Test Scenarios tab to make sure 
        they work as expected and don't conflict with existing rules.
      </WarningBox>
    </div>
  )
}

function FAQSection() {
  const faqs = [
    {
      q: "How do I make a rule only for casual employees?",
      a: 'When setting up the rule, add a condition for "Employment Type" and select "Casual". The rule will only work for casual employees.',
    },
    {
      q: "Can two rules work at the same time?",
      a: "Usually no - the most specific rule wins. However, you can mark rules as \"stackable\" which lets them work together. For example, a Saturday rule and a night shift rule could both apply.",
    },
    {
      q: "How do I set up automatic meal breaks?",
      a: "Create a break rule and mark it as \"automatic\". Set the conditions (like \"after 5 hours worked\") and the break will be added automatically when those conditions are met.",
    },
    {
      q: "What's the difference between rules and tags?",
      a: "Rules are the instructions for how to pay people. Tags are labels you put on shifts to control which rules apply. Think of tags as switches that turn rules on or off.",
    },
    {
      q: "Can I copy a rule to another award?",
      a: "Yes! Save the rule as a template in the Rule Engine tab. Then you can add it to any award. Note: changing the template won't change awards that already use it.",
    },
    {
      q: "What happens if no rules match a shift?",
      a: "Nothing gets calculated! That's why it's important to have a basic \"Normal Pay\" rule with no conditions - it acts as a safety net that always matches.",
    },
    {
      q: "How does weekly overtime work?",
      a: "Set a \"Weekly Hours\" condition (like 38 hours). Once an employee goes over that in a week, the overtime rule kicks in for the extra hours.",
    },
    {
      q: "Can I pay different rates for different days?",
      a: "Absolutely! Create separate rules for each day. For example: one rule for Saturday at 1.25x and another for Sunday at 1.5x.",
    },
    {
      q: "How do I stop a rule when TOIL is selected?",
      a: 'Add an "Excluded Tag" condition and select "TOIL". The rule will be skipped whenever the shift has a TOIL tag.',
    },
    {
      q: "What is the payroll code for?",
      a: "It's what appears on payslips and in payroll exports. Make it short and clear like \"Overtime 1.5x\" or \"Normal Hours\" so employees understand what they're being paid for.",
    },
    {
      q: "How do I test if my rules are working correctly?",
      a: "Use the Test Scenarios tab! You can create example shifts and see which rules match and how much would be paid. It's like a practice run before using rules on real shifts.",
    },
    {
      q: "Can I have a rule that only applies on public holidays?",
      a: 'Yes! Add a "Public Holiday" condition to your rule. The system automatically knows which days are public holidays based on your location settings.',
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Quick answers to common questions about the award system.
      </p>
      {faqs.map((faq, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex gap-3">
            <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{faq.q}</p>
              <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
            </div>
          </div>
        </div>
      ))}
      
      <TipBox>
        <strong>Still have questions?</strong> Try creating a test scenario in the Test Scenarios tab 
        to see how the system works with your specific situation!
      </TipBox>
    </div>
  )
}

export function DocumentationTab() {
  const [activeSection, setActiveSection] = useState("overview")

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />
      case "specificity":
        return <SpecificitySection />
      case "tags":
        return <TagsSection />
      case "conditions":
        return <ConditionsSection />
      case "outcomes":
        return <OutcomesSection />
      case "best-practices":
        return <BestPracticesSection />
      case "faq":
        return <FAQSection />
      default:
        return <OverviewSection />
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Section Nav */}
      <nav className="md:w-48 shrink-0">
        <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 md:sticky md:top-24">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          {sections.find((s) => s.id === activeSection)?.icon}
          <h2 className="text-lg font-semibold">
            {sections.find((s) => s.id === activeSection)?.label}
          </h2>
        </div>
        {renderSection()}
      </div>
    </div>
  )
}
