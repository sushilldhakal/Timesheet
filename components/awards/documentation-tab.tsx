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
        Awards are structured pay configurations that define how employees are compensated.
        They contain rules that automatically calculate pay rates, penalty rates, overtime,
        break entitlements, and allowances based on shift conditions.
      </p>

      <SectionHeading>How Awards Work</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            step: "1",
            title: "Rules",
            desc: "Define conditions that trigger specific pay outcomes",
            icon: <Filter className="h-5 w-5" />,
          },
          {
            step: "2",
            title: "Evaluation",
            desc: "Rules are evaluated by specificity, then priority",
            icon: <Layers className="h-5 w-5" />,
          },
          {
            step: "3",
            title: "Outcome",
            desc: "Winning rule determines multiplier or pay outcome",
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

      <SectionHeading>Key Concepts</SectionHeading>
      <div className="space-y-3">
        {[
          { term: "Rules", def: "Conditional pay directives with conditions and outcomes. Each rule defines when and what to pay." },
          { term: "Conditions", def: "Criteria that must be met for a rule to apply (e.g., day of week, hours worked, employment type)." },
          { term: "Outcomes", def: "What happens when a rule matches — a multiplier, allowance, break, TOIL accrual, or leave accrual." },
          { term: "Tags", def: "Labels applied to shifts that can trigger or prevent specific rules from applying." },
          { term: "Level Rates", def: "Base hourly rates per employment level and type, used as the foundation for pay calculations." },
          { term: "Specificity", def: "Rules with more conditions are more specific and take precedence over less specific rules." },
          { term: "Priority", def: "A tiebreaker when two rules have the same specificity. Higher priority wins." },
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
        Use the <strong>Test Scenarios</strong> tab to validate how your rules work before applying them to real shifts.
      </TipBox>
    </div>
  )
}

function SpecificitySection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        When multiple rules match a shift, the system needs to decide which one wins. This is
        determined first by <strong>specificity</strong> (number of conditions), then by <strong>priority</strong>.
      </p>

      <SectionHeading>How Rules Are Evaluated</SectionHeading>
      <div className="space-y-2">
        {[
          "All active rules in the award are checked against shift conditions",
          "Each rule's conditions are evaluated — all must be met for the rule to match",
          "Matched rules are sorted by specificity (more conditions = more specific)",
          "If specificity is equal, priority number breaks the tie (higher wins)",
          "The most specific, highest-priority rule is applied",
          "Rules with canStack: true can apply alongside the winning rule",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-muted-foreground">{step}</p>
          </div>
        ))}
      </div>

      <SectionHeading>Example: Specificity vs Priority</SectionHeading>
      <CodeBlock>{`Rule A: "Saturday Penalty"
  Conditions: daysOfWeek = [saturday]        → Specificity: 1
  Priority: 10
  Outcome: 1.25x multiplier

Rule B: "Saturday Overtime"
  Conditions: daysOfWeek = [saturday],        → Specificity: 2
              afterHoursWorked = 8
  Priority: 5
  Outcome: 1.5x multiplier

For an 10-hour Saturday shift:
  → Both rules match
  → Rule B wins (specificity 2 > 1)
  → Even though Rule A has higher priority (10 > 5)
  → Applied outcome: 1.5x multiplier`}</CodeBlock>

      <TipBox>
        Specificity always beats priority. Use priority only to break ties between rules
        with the same number of conditions.
      </TipBox>

      <SectionHeading>Stacking Rules</SectionHeading>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Rules with <code className="rounded bg-muted px-1.5 py-0.5 text-xs">canStack: true</code> can
        apply alongside the winning rule. Stacked multipliers are additive — a 1.5x rule stacked with
        a winning 1.25x rule results in 1.75x total (1.25 + 0.5).
      </p>
    </div>
  )
}

function TagsSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Tags are labels attached to shifts that influence which rules apply. They provide
        flexible control over rule behavior without complex conditions.
      </p>

      <SectionHeading>What Are Tags?</SectionHeading>
      <p className="text-sm text-muted-foreground">
        Each award defines a set of available tags. When scheduling a shift, managers
        can assign tags to control pay outcomes. For example, tagging a shift with &quot;TOIL&quot;
        could trigger TOIL accrual instead of overtime pay.
      </p>

      <SectionHeading>How Tags Affect Rules</SectionHeading>
      <div className="space-y-3">
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">requiredTags</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            The rule only applies if <strong>all</strong> specified tags are present on the shift.
          </p>
          <CodeBlock>{`Rule: "TOIL Accrual"
  requiredTags: ["TOIL"]
  → Only applies when shift has the TOIL tag`}</CodeBlock>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">excludedTags</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            The rule does <strong>not</strong> apply if any of the specified tags are present.
          </p>
          <CodeBlock>{`Rule: "Standard Overtime"
  excludedTags: ["TOIL"]
  → Doesn't apply when TOIL tag is present`}</CodeBlock>
        </div>
      </div>

      <SectionHeading>Override Behaviors</SectionHeading>
      <p className="text-sm text-muted-foreground mb-3">
        Tags can have an override behavior that controls how they interact with other rules:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { name: "modify", desc: "Adjusts the outcome of the matched rule (e.g., changes multiplier)", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300" },
          { name: "override", desc: "Completely replaces the normal rule outcome with the tagged rule", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300" },
          { name: "stack", desc: "Adds the tagged rule's outcome on top of the normal outcome", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300" },
        ].map((b) => (
          <div key={b.name} className="rounded-lg border p-3">
            <Badge className={b.color}>{b.name}</Badge>
            <p className="text-xs text-muted-foreground mt-2">{b.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConditionsSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Conditions define when a rule applies. Each condition is a filter — all conditions
        on a rule must be met for the rule to match.
      </p>

      <SectionHeading>Time-Based Conditions</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium">Condition</th>
              <th className="pb-2 text-left font-medium">Description</th>
              <th className="pb-2 text-left font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">daysOfWeek</td>
              <td className="py-2 pr-4">Shift falls on specific days</td>
              <td className="py-2"><code className="rounded bg-muted px-1 text-xs">[&quot;saturday&quot;, &quot;sunday&quot;]</code></td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">timeRange</td>
              <td className="py-2 pr-4">Shift overlaps specific hours</td>
              <td className="py-2"><code className="rounded bg-muted px-1 text-xs">{`{ start: 22, end: 6 }`}</code> (night shift)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHeading>Hours-Based Conditions</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium">Condition</th>
              <th className="pb-2 text-left font-medium">Description</th>
              <th className="pb-2 text-left font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">minHoursWorked</td>
              <td className="py-2 pr-4">Minimum daily hours</td>
              <td className="py-2"><code className="rounded bg-muted px-1 text-xs">4</code> (at least 4h shift)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">afterHoursWorked</td>
              <td className="py-2 pr-4">Apply after X daily hours</td>
              <td className="py-2"><code className="rounded bg-muted px-1 text-xs">8</code> (overtime after 8h)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">weeklyHoursThreshold</td>
              <td className="py-2 pr-4">Apply after X weekly hours</td>
              <td className="py-2"><code className="rounded bg-muted px-1 text-xs">38</code> (weekly overtime)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHeading>Employment Conditions</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium">Condition</th>
              <th className="pb-2 text-left font-medium">Description</th>
              <th className="pb-2 text-left font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">employmentTypes</td>
              <td className="py-2 pr-4">Filter by employment type</td>
              <td className="py-2"><code className="rounded bg-muted px-1 text-xs">[&quot;casual&quot;]</code></td>
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
              <th className="pb-2 text-left font-medium">Description</th>
              <th className="pb-2 text-left font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">isPublicHoliday</td>
              <td className="py-2 pr-4">Shift is on a public holiday</td>
              <td className="py-2"><code className="rounded bg-muted px-1 text-xs">true</code></td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">requiredTags</td>
              <td className="py-2 pr-4">Shift must have these tags</td>
              <td className="py-2"><code className="rounded bg-muted px-1 text-xs">[&quot;TOIL&quot;]</code></td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">excludedTags</td>
              <td className="py-2 pr-4">Shift must NOT have these tags</td>
              <td className="py-2"><code className="rounded bg-muted px-1 text-xs">[&quot;TOIL&quot;]</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHeading>Combined Example</SectionHeading>
      <CodeBlock>{`Rule: "Saturday Overtime Penalty (30%)"

Conditions:
  daysOfWeek: ["saturday"]
  afterHoursWorked: 8

Outcome:
  type: overtime
  multiplier: 1.3

→ This rule applies to Saturday shifts after 8 hours
→ Specificity: 2 (two conditions)`}</CodeBlock>
    </div>
  )
}

function OutcomesSection() {
  const outcomes = [
    {
      type: "ordinary",
      label: "Ordinary Time",
      icon: <Clock className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
      desc: "Standard pay rate. Multiplier is typically 1.0.",
      fields: [
        { name: "multiplier", desc: "Rate multiplier (usually 1.0)" },
        { name: "exportName", desc: 'Payroll export code (e.g., "ORD 1x")' },
      ],
      example: `type: ordinary\nmultiplier: 1.0\nexportName: "ORD 1x"`,
    },
    {
      type: "overtime",
      label: "Overtime",
      icon: <DollarSign className="h-5 w-5" />,
      color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
      desc: "Penalty or overtime rates. Multiplier must be >= 1.0.",
      fields: [
        { name: "multiplier", desc: "Rate multiplier (e.g., 1.5 = time-and-a-half)" },
        { name: "exportName", desc: 'Payroll export code (e.g., "OT 1.5x")' },
      ],
      example: `type: overtime\nmultiplier: 1.5\nexportName: "OT 1.5x"`,
    },
    {
      type: "break",
      label: "Break",
      icon: <Coffee className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
      desc: "Meal or rest break entitlements.",
      fields: [
        { name: "durationMinutes", desc: "Break length (e.g., 30)" },
        { name: "isPaid", desc: "Whether the break is paid (true/false)" },
        { name: "isAutomatic", desc: "Automatically applied (true/false)" },
      ],
      example: `type: break\ndurationMinutes: 30\nisPaid: false\nisAutomatic: true\nexportName: "BREAK-MEAL"`,
    },
    {
      type: "allowance",
      label: "Allowance",
      icon: <DollarSign className="h-5 w-5" />,
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
      desc: "Flat-rate shift allowances.",
      fields: [
        { name: "flatRate", desc: "Dollar amount (e.g., 25)" },
        { name: "currency", desc: "Currency code (default: AUD)" },
      ],
      example: `type: allowance\nflatRate: 25\ncurrency: "AUD"\nexportName: "ALLOW-NIGHT"`,
    },
    {
      type: "toil",
      label: "TOIL (Time Off In Lieu)",
      icon: <Calendar className="h-5 w-5" />,
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
      desc: "Accrues time off instead of (or in addition to) overtime pay.",
      fields: [
        { name: "accrualMultiplier", desc: "Hours accrued per hour worked (e.g., 1.5)" },
        { name: "maxBalance", desc: "Maximum TOIL hours that can be banked" },
        { name: "expiryDays", desc: "Days until accrued TOIL expires" },
      ],
      example: `type: toil\naccrualMultiplier: 1.5\nmaxBalance: 40\nexpiryDays: 90\nexportName: "TOIL 1.5x"`,
    },
    {
      type: "leave",
      label: "Leave Accrual",
      icon: <Shield className="h-5 w-5" />,
      color: "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300",
      desc: "Automatic leave accrual based on hours worked.",
      fields: [
        { name: "accrualRate", desc: "Hours of leave per hour worked (e.g., 0.0769 = 4 weeks/year)" },
        { name: "leaveType", desc: "Type of leave: annual, sick, personal, long-service" },
      ],
      example: `type: leave\naccrualRate: 0.0769\nleaveType: "annual"\nexportName: "LEAVE-ANNUAL"`,
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Outcomes define what happens when a rule matches. Each rule has exactly one outcome.
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
              <p className="text-xs font-medium">Fields:</p>
              <div className="space-y-1">
                {o.fields.map((f) => (
                  <div key={f.name} className="flex gap-2 text-xs">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono shrink-0">{f.name}</code>
                    <span className="text-muted-foreground">{f.desc}</span>
                  </div>
                ))}
              </div>
              <CodeBlock>{o.example}</CodeBlock>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BestPracticesSection() {
  return (
    <div className="space-y-4">
      <SectionHeading>Rule Organization</SectionHeading>
      <div className="space-y-2">
        {[
          "Use consistent naming conventions (e.g., \"Saturday Penalty\", \"Overtime 1.5x\", \"Night Allowance\")",
          "Group related rules logically — all overtime rules together, all break rules together",
          "Start with a base \"Ordinary Time\" rule with no conditions as a fallback",
          "Use priority numbers in increments of 10 (0, 10, 20) to leave room for future rules",
        ].map((tip, i) => (
          <div key={i} className="flex gap-3">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        ))}
      </div>

      <SectionHeading>Condition Best Practices</SectionHeading>
      <div className="space-y-2">
        {[
          "More specific conditions = higher precedence. Add conditions to be precise.",
          "Avoid duplicating rules with only different priorities — use specificity instead.",
          "Use tags for flexible overrides instead of creating many condition permutations.",
          "Always include employment type if a rule is specific to casual, part-time, or full-time.",
        ].map((tip, i) => (
          <div key={i} className="flex gap-3">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        ))}
      </div>

      <SectionHeading>Common Patterns</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            title: "Weekend Penalty",
            code: `Condition: daysOfWeek: ["saturday", "sunday"]\nOutcome: overtime, 1.25x - 1.5x multiplier`,
          },
          {
            title: "Daily Overtime",
            code: `Condition: afterHoursWorked: 8\nOutcome: overtime, 1.5x multiplier`,
          },
          {
            title: "Public Holiday",
            code: `Condition: isPublicHoliday: true\nOutcome: overtime, 2.0x - 2.5x multiplier`,
          },
          {
            title: "Break Entitlement",
            code: `Condition: minHoursWorked: 5\nOutcome: break, 30min unpaid`,
          },
          {
            title: "Night Shift Allowance",
            code: `Condition: timeRange: { start: 22, end: 6 }\nOutcome: allowance, $25 AUD`,
          },
          {
            title: "TOIL Override",
            code: `Condition: requiredTags: ["TOIL"]\nOutcome: toil, 1.5x accrual`,
          },
        ].map((p) => (
          <div key={p.title} className="rounded-lg border p-3">
            <p className="text-sm font-medium mb-2">{p.title}</p>
            <CodeBlock>{p.code}</CodeBlock>
          </div>
        ))}
      </div>

      <SectionHeading>Performance Tips</SectionHeading>
      <div className="space-y-2">
        {[
          "Keep awards under 20 rules for faster evaluation",
          "Use specific conditions to reduce the number of rules that need checking",
          "Deactivate unused rules rather than deleting them (in case you need them later)",
          "Use the Test Scenarios tab regularly to verify rule behavior",
        ].map((tip, i) => (
          <div key={i} className="flex gap-3">
            <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        ))}
      </div>

      <WarningBox>
        When adding new rules, always test with the Test Scenarios tab to check for
        unintended rule overlaps or conflicts.
      </WarningBox>
    </div>
  )
}

function FAQSection() {
  const faqs = [
    {
      q: "How do I apply a rule only for casual employees?",
      a: 'Add the condition employmentTypes: ["casual"]. This ensures the rule only matches shifts for casual employees.',
    },
    {
      q: "Can two rules apply at the same time?",
      a: "Only if both rules have canStack: true. Otherwise, the highest-specificity (then highest-priority) rule wins exclusively.",
    },
    {
      q: "How do I create an automatic break?",
      a: "Create a break rule with isAutomatic: true. The break will be automatically applied when the rule conditions are met, without manual intervention.",
    },
    {
      q: "What's the difference between rules and tags?",
      a: "Rules define pay outcomes (what to pay). Tags are labels on shifts that can trigger or prevent rules from applying. Think of tags as switches that control which rules are active.",
    },
    {
      q: "Can I apply the same rule to multiple awards?",
      a: "Yes — save the rule as a template in the Rule Engine tab. You can then add it to any award. Changes to the template don't affect existing awards.",
    },
    {
      q: "What happens if no rules match a shift?",
      a: "No pay outcome is calculated. It's recommended to have a base \"Ordinary Time\" rule with no conditions as a catch-all fallback.",
    },
    {
      q: "How does overtime work with weekly thresholds?",
      a: "Use weeklyHoursThreshold to set a weekly limit (e.g., 38 hours). Once the employee exceeds that threshold in a week, the overtime rule kicks in for remaining hours.",
    },
    {
      q: "Can I have different rates for different days?",
      a: "Yes — create separate rules for each day or group of days using the daysOfWeek condition. For example, one rule for Saturday at 1.25x and another for Sunday at 1.5x.",
    },
    {
      q: "How do I prevent a rule from applying when TOIL is selected?",
      a: 'Add excludedTags: ["TOIL"] to the rule\'s conditions. The rule will be skipped if the shift has the TOIL tag.',
    },
    {
      q: "What is the exportName field for?",
      a: "exportName is used when exporting payroll data. It becomes the line item code in payroll exports (e.g., \"OT 1.5x\", \"ORD 1x\"). Make it short and descriptive.",
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Common questions about the award system.
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
