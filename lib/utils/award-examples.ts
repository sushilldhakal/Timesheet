import { Award } from "@/lib/validations/awards"

/**
 * 🔥 PROPER Award Examples - Tanda-Style Rule Engine
 * 
 * These examples demonstrate:
 * 1. Rule Specificity - Most specific rule wins
 * 2. Award Tags - Manual overrides
 * 3. Time Segment Processing - Pay per minute
 * 4. Rule Competition - Rules compete against each other
 */

// Example 1: Retail Award with Rule Specificity
export const retailAwardWithSpecificity: Award = {
  name: "Retail Award 2024 - Specificity Engine",
  description: "Demonstrates rule specificity and competition",
  rules: [
    // Rule A: General overtime (applies all days)
    {
      name: "General Overtime",
      description: "1.5x rate after 8 hours daily",
      priority: 10,
      isActive: true,
      canStack: false,
      conditions: {
        afterHoursWorked: 8, // After 8 hours worked
      },
      outcome: {
        type: "overtime",
        multiplier: 1.5,
        exportName: "OT 1.5x",
        description: "Daily overtime rate"
      }
    },
    
    // Rule B: Saturday work (more specific - applies only Saturday)
    {
      name: "Saturday Penalty",
      description: "1.25x rate for Saturday work",
      priority: 20,
      isActive: true,
      canStack: false,
      conditions: {
        daysOfWeek: ["saturday"], // More specific than "all days"
      },
      outcome: {
        type: "overtime",
        multiplier: 1.25,
        exportName: "SAT 1.25x",
        description: "Saturday penalty rate"
      }
    },
    
    // Rule C: Saturday evening (MOST specific - Saturday + time range)
    {
      name: "Saturday Evening Premium",
      description: "2x rate for Saturday after 6 PM",
      priority: 30,
      isActive: true,
      canStack: false,
      conditions: {
        daysOfWeek: ["saturday"],
        timeRange: { start: 18, end: 23 }, // Very specific time + day
      },
      outcome: {
        type: "overtime",
        multiplier: 2.0,
        exportName: "SAT-EVE 2x",
        description: "Saturday evening premium"
      }
    },
    
    // Rule D: TOIL Override (tag-based override)
    {
      name: "TOIL Instead of Overtime",
      description: "Accrue TOIL instead of overtime pay when TOIL tag applied",
      priority: 100, // High priority
      isActive: true,
      canStack: false,
      conditions: {
        requiredTags: ["TOIL"], // Only applies when TOIL tag is present
        afterHoursWorked: 8,
      },
      outcome: {
        type: "toil",
        accrualMultiplier: 1.5, // 1.5 hours TOIL per overtime hour
        exportName: "TOIL 1.5x",
        description: "TOIL accrual instead of overtime pay"
      }
    }
  ],
  availableTags: [
    {
      name: "TOIL"
    },
    {
      name: "BrokenShift"
    }
  ],
  isActive: true,
  version: "2.0.0"
}

// Example 2: Hospitality Award with Complex Stacking
export const hospitalityAwardWithStacking: Award = {
  name: "Hospitality Award 2024 - Rule Stacking",
  description: "Demonstrates rule stacking and employment type targeting",
  rules: [
    // Base casual loading (always applies to casuals)
    {
      name: "Casual Loading",
      description: "25% casual loading for all casual employees",
      priority: 5,
      isActive: true,
      canStack: true, // Can stack with other penalties
      conditions: {
        employmentTypes: ["casual"],
      },
      outcome: {
        type: "overtime",
        multiplier: 1.25,
        exportName: "CASUAL 1.25x",
        description: "Casual loading"
      }
    },
    
    // Weekend penalty (stacks with casual loading)
    {
      name: "Weekend Penalty",
      description: "1.5x rate for weekend work",
      priority: 15,
      isActive: true,
      canStack: true,
      conditions: {
        daysOfWeek: ["saturday", "sunday"],
      },
      outcome: {
        type: "overtime",
        multiplier: 1.5,
        exportName: "WEEKEND 1.5x",
        description: "Weekend penalty"
      }
    },
    
    // Public holiday (doesn't stack - overrides everything)
    {
      name: "Public Holiday Rate",
      description: "2.5x rate for public holidays (non-stacking)",
      priority: 50,
      isActive: true,
      canStack: false, // Overrides other penalties
      conditions: {
        isPublicHoliday: true,
      },
      outcome: {
        type: "overtime",
        multiplier: 2.5,
        exportName: "PH 2.5x",
        description: "Public holiday rate"
      }
    },
    
    // Kitchen staff night penalty (very specific)
    {
      name: "Kitchen Night Penalty",
      description: "Additional 0.5x for kitchen staff after 11 PM",
      priority: 25,
      isActive: true,
      canStack: true,
      conditions: {
        employmentTypes: ["casual"],
        timeRange: { start: 23, end: 6 },
        // Note: Would need employee tags like "kitchen_staff" in real implementation
      },
      outcome: {
        type: "overtime",
        multiplier: 1.5,
        exportName: "NIGHT 1.5x",
        description: "Kitchen night penalty"
      }
    }
  ],
  availableTags: [
    {
      name: "PublicHolidayOverride"
    }
  ],
  isActive: true,
  version: "2.0.0"
}

// Example 3: Manufacturing Award with Break Rules
export const manufacturingAwardWithBreaks: Award = {
  name: "Manufacturing Award 2024 - Breaks & TOIL",
  description: "Complex break entitlements and TOIL rules",
  rules: [
    // Standard meal break
    {
      name: "Meal Break - 5+ Hours",
      description: "30 minute unpaid meal break for shifts 5+ hours",
      priority: 10,
      isActive: true,
      canStack: false,
      conditions: {
        minHoursWorked: 5,
      },
      outcome: {
        type: "break",
        durationMinutes: 30,
        isPaid: false,
        isAutomatic: true,
        exportName: "BREAK-MEAL",
        description: "Meal break"
      }
    },
    
    // Safety break for long shifts
    {
      name: "Safety Break - 8+ Hours",
      description: "15 minute paid safety break for shifts 8+ hours",
      priority: 15,
      isActive: true,
      canStack: true, // Can have multiple breaks
      conditions: {
        minHoursWorked: 8,
      },
      outcome: {
        type: "break",
        durationMinutes: 15,
        isPaid: true,
        isAutomatic: true,
        exportName: "BREAK-SAFETY",
        description: "Safety break"
      }
    },
    
    // Weekly overtime converts to TOIL
    {
      name: "Weekly Overtime TOIL",
      description: "Overtime after 38 hours/week accrues as TOIL",
      priority: 20,
      isActive: true,
      canStack: false,
      conditions: {
        weeklyHoursThreshold: 38,
      },
      outcome: {
        type: "toil",
        accrualMultiplier: 1.5,
        maxBalance: 76, // 2 weeks max
        expiryDays: 365,
        exportName: "TOIL-WEEKLY",
        description: "Weekly overtime TOIL"
      }
    },
    
    // Shift allowance
    {
      name: "Shift Allowance",
      description: "$50 allowance for night shifts",
      priority: 5,
      isActive: true,
      canStack: true,
      conditions: {
        timeRange: { start: 22, end: 6 },
      },
      outcome: {
        type: "allowance",
        flatRate: 50,
        currency: "AUD",
        exportName: "ALLOW-NIGHT",
        description: "Night shift allowance"
      }
    }
  ],
  availableTags: [
    {
      name: "TOIL"
    },
    {
      name: "ReturnToDuty"
    }
  ],
  isActive: true,
  version: "2.0.0"
}

/**
 * 🧠 Example Usage Scenarios
 */

// Scenario 1: Saturday 5 PM shift for casual employee
export const scenarioSaturdayEvening = {
  employeeId: "emp123",
  employmentType: "casual",
  startTime: new Date("2024-01-06T17:00:00Z"), // Saturday 5 PM
  endTime: new Date("2024-01-06T23:00:00Z"),   // Saturday 11 PM
  awardTags: [], // No special tags
  isPublicHoliday: false,
  weeklyHoursWorked: 20,
  dailyHoursWorked: 6,
  consecutiveShifts: 0,
  breaks: []
}
// Expected result: Saturday Evening Premium (2x) wins due to highest specificity

// Scenario 2: Same shift but with TOIL tag
export const scenarioSaturdayEveningTOIL = {
  ...scenarioSaturdayEvening,
  awardTags: ["TOIL"] // TOIL tag applied
}
// Expected result: TOIL accrual instead of overtime pay

// Scenario 3: Casual weekend shift (stacking example)
export const scenarioCasualWeekend = {
  employeeId: "emp456", 
  employmentType: "casual",
  startTime: new Date("2024-01-07T10:00:00Z"), // Sunday 10 AM
  endTime: new Date("2024-01-07T16:00:00Z"),   // Sunday 4 PM
  awardTags: [],
  isPublicHoliday: false,
  weeklyHoursWorked: 30,
  dailyHoursWorked: 6,
  consecutiveShifts: 0,
  breaks: []
}
// Expected result: Casual Loading (1.25x) + Weekend Penalty (1.5x) = 1.875x total

/**
 * Utility function to create a basic award with proper rule specificity
 */
export function createAwardWithSpecificity(
  name: string,
  description: string
): Award {
  return {
    name,
    description,
    rules: [
      // Most general rule (lowest specificity)
      {
        name: "Ordinary Time",
        description: "Standard 1x rate for regular hours",
        priority: 1,
        isActive: true,
        canStack: false,
        conditions: {}, // No conditions = applies to everything
        outcome: {
          type: "ordinary",
          multiplier: 1.0,
          exportName: "ORD 1x",
          description: "Standard rate"
        }
      },
      
      // More specific rule
      {
        name: "Daily Overtime",
        description: "1.5x rate after 8 hours daily",
        priority: 10,
        isActive: true,
        canStack: false,
        conditions: {
          afterHoursWorked: 8, // More specific condition
        },
        outcome: {
          type: "overtime",
          multiplier: 1.5,
          exportName: "OT-DAILY 1.5x",
          description: "Daily overtime"
        }
      },
      
      // Most specific rule
      {
        name: "Weekend Overtime",
        description: "2x rate for weekend overtime",
        priority: 20,
        isActive: true,
        canStack: false,
        conditions: {
          daysOfWeek: ["saturday", "sunday"],
          afterHoursWorked: 8, // Multiple conditions = higher specificity
        },
        outcome: {
          type: "overtime",
          multiplier: 2.0,
          exportName: "OT-WEEKEND 2x",
          description: "Weekend overtime premium"
        }
      }
    ],
    availableTags: [
      {
        name: "TOIL"
      }
    ],
    isActive: true,
    version: "1.0.0"
  }
}