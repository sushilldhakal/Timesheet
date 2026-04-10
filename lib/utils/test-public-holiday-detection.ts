/**
 * Test the public holiday detection function directly
 * This tests the actual checkPublicHoliday() function from the shared module
 */

import { checkPublicHoliday } from './public-holidays'

/**
 * Test public holiday detection with various dates
 */
export async function testPublicHolidayDetection() {
  console.log("🧪 Testing Public Holiday Detection Function")
  
  const testCases = [
    { date: new Date('2024-12-25'), expected: true, name: 'Christmas Day' },
    { date: new Date('2024-12-26'), expected: true, name: 'Boxing Day' },
    { date: new Date('2024-01-01'), expected: true, name: 'New Year\'s Day' },
    { date: new Date('2024-01-26'), expected: true, name: 'Australia Day' },
    { date: new Date('2024-04-25'), expected: true, name: 'ANZAC Day' },
    { date: new Date('2024-12-24'), expected: false, name: 'Christmas Eve (not a holiday)' },
    { date: new Date('2024-07-15'), expected: false, name: 'Random weekday' },
  ]
  
  let passed = 0
  let failed = 0
  
  for (const testCase of testCases) {
    try {
      const result = await checkPublicHoliday(testCase.date)
      const success = result === testCase.expected
      
      console.log(`${success ? '✅' : '❌'} ${testCase.name}: ${testCase.date.toDateString()} -> ${result} (expected ${testCase.expected})`)
      
      if (success) {
        passed++
      } else {
        failed++
        console.error(`  FAILED: Expected ${testCase.expected}, got ${result}`)
      }
    } catch (error) {
      failed++
      console.error(`❌ ${testCase.name}: Error - ${error}`)
    }
  }
  
  console.log(`\n📊 Public Holiday Detection Results: ${passed} passed, ${failed} failed`)
  
  return {
    passed,
    failed,
    success: failed === 0
  }
}

// Export for use in other files or direct execution
if (typeof window === 'undefined' && require.main === module) {
  // Running directly in Node.js
  testPublicHolidayDetection().then(result => {
    console.log(`\n🎉 Public holiday detection test ${result.success ? 'PASSED' : 'FAILED'}`)
    process.exit(result.success ? 0 : 1)
  })
}