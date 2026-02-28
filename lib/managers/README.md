# Schedule and Roster Managers

This directory contains the business logic layer for managing employee schedules and rosters.

## Table of Contents

- [ScheduleManager](#schedulemanager)
- [RosterManager](#rostermanager)
- [Testing](#testing)
- [Requirements Coverage](#requirements-coverage)

## ScheduleManager

The `ScheduleManager` class handles CRUD operations for recurring weekly work patterns stored on employee documents.

### Core Operations

#### `createSchedule(employeeId, scheduleData)`
Creates a new schedule for an employee.

**Parameters:**
- `employeeId`: Employee's ObjectId or string
- `scheduleData`: Schedule data (dayOfWeek, startTime, endTime, locationId, roleId, effectiveFrom, effectiveTo)

**Returns:**
- Success: `{ success: true, schedule: ISchedule }`
- Error: `{ success: false, error: string, message: string }`

**Validation:**
- dayOfWeek must contain only integers 0-6
- startTime must be less than endTime
- effectiveFrom must be less than or equal to effectiveTo
- locationId must reference existing location category
- roleId must reference existing role category
- effectiveFrom is required

**Example:**
```typescript
const scheduleManager = new ScheduleManager()

const result = await scheduleManager.createSchedule(employeeId, {
  dayOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
  startTime: new Date("2024-01-01T09:00:00Z"),
  endTime: new Date("2024-01-01T17:00:00Z"),
  locationId: locationId,
  roleId: roleId,
  effectiveFrom: new Date("2024-01-01"),
  effectiveTo: null, // Indefinite
})

if (result.success) {
  console.log("Schedule created:", result.schedule._id)
} else {
  console.error("Error:", result.error, result.message)
}
```

#### `updateSchedule(employeeId, scheduleId, scheduleData)`
Updates an existing schedule.

**Parameters:**
- `employeeId`: Employee's ObjectId or string
- `scheduleId`: Schedule's ObjectId or string
- `scheduleData`: Partial schedule data to update

**Returns:**
- Success: `{ success: true, schedule: ISchedule }`
- Error: `{ success: false, error: string, message: string }`

**Example:**
```typescript
const result = await scheduleManager.updateSchedule(employeeId, scheduleId, {
  dayOfWeek: [1, 2, 3], // Change to Mon, Tue, Wed only
})
```

#### `deleteSchedule(employeeId, scheduleId)`
Deletes a schedule from an employee.

**Parameters:**
- `employeeId`: Employee's ObjectId or string
- `scheduleId`: Schedule's ObjectId or string

**Returns:**
- Success: `{ success: true }`
- Error: `{ success: false, error: string, message: string }`

**Example:**
```typescript
const result = await scheduleManager.deleteSchedule(employeeId, scheduleId)
```

#### `getActiveSchedules(employeeId, date)`
Retrieves schedules active on a specific date with overlap resolution.

**Parameters:**
- `employeeId`: Employee's ObjectId or string
- `date`: Date to check for active schedules

**Returns:**
- Success: `{ success: true, schedules: ISchedule[] }`
- Error: `{ success: false, error: string, message: string }`

**Overlap Resolution:**
When multiple schedules overlap for the same day, the schedule with the most recent `effectiveFrom` date is applied.

**Example:**
```typescript
const result = await scheduleManager.getActiveSchedules(
  employeeId,
  new Date("2024-03-15")
)

if (result.success) {
  console.log(`Found ${result.schedules.length} active schedules`)
  result.schedules.forEach(schedule => {
    console.log(`Days: ${schedule.dayOfWeek.join(", ")}`)
  })
}
```

#### `validateSchedule(scheduleData)`
Validates schedule data without persisting.

**Parameters:**
- `scheduleData`: Partial schedule data to validate

**Returns:**
- Success: `{ success: true }`
- Error: `{ success: false, error: string, message: string }`

**Example:**
```typescript
const result = await scheduleManager.validateSchedule({
  dayOfWeek: [1, 2, 3],
  startTime: new Date("2024-01-01T09:00:00Z"),
  endTime: new Date("2024-01-01T17:00:00Z"),
  locationId: locationId,
  roleId: roleId,
  effectiveFrom: new Date("2024-01-01"),
  effectiveTo: null,
})

if (!result.success) {
  console.error("Validation error:", result.error, result.message)
}
```

### Error Codes

- `EMPLOYEE_NOT_FOUND`: Employee does not exist
- `SCHEDULE_NOT_FOUND`: Schedule does not exist on employee
- `INVALID_DAY_OF_WEEK`: dayOfWeek contains values outside 0-6
- `INVALID_TIME_FORMAT`: Invalid time format
- `INVALID_TIME_ORDER`: startTime is not less than endTime
- `INVALID_DATE_ORDER`: effectiveFrom is after effectiveTo
- `MISSING_EFFECTIVE_FROM`: effectiveFrom is required but not provided
- `INVALID_LOCATION_REF`: locationId does not reference existing location
- `INVALID_ROLE_REF`: roleId does not reference existing role
- `CREATE_FAILED`: Failed to create schedule
- `UPDATE_FAILED`: Failed to update schedule
- `DELETE_FAILED`: Failed to delete schedule
- `QUERY_FAILED`: Failed to query schedules

## Testing

### Manual Testing

Run the manual test script to verify the ScheduleManager implementation:

```bash
node --env-file=.env lib/managers/__tests__/schedule-manager.manual-test.mjs
```

This script tests:
- Creating schedules
- Updating schedules
- Deleting schedules
- Getting active schedules
- Overlap resolution
- Validation errors

## Requirements Coverage

The ScheduleManager implements the following requirements from the spec:

- **Requirement 1.1**: Store schedules on employee documents ✅
- **Requirement 1.6**: Apply only schedules within effective date range ✅
- **Requirement 9.1**: Require effectiveFrom date ✅
- **Requirement 9.2**: Allow null effectiveTo for indefinite schedules ✅
- **Requirement 9.3**: Filter schedules by effective date range ✅
- **Requirement 9.4**: Apply most recent effectiveFrom for overlaps ✅
- **Requirement 9.5**: Treat null effectiveTo as indefinite ✅
- **Requirement 11.4**: Validate locationId references ✅
- **Requirement 11.5**: Validate roleId references ✅
- **Requirement 11.6**: Return descriptive error messages ✅

## Design Properties

The ScheduleManager validates the following correctness properties:

- **Property 1**: Schedule Data Structure Integrity ✅
- **Property 2**: Schedule Time Ordering ✅
- **Property 3**: Schedule Date Ordering ✅
- **Property 4**: Active Schedule Filtering ✅
- **Property 5**: Schedule Overlap Resolution ✅
- **Property 18**: Schedule Validation Enforcement ✅
- **Property 20**: Schedule Effective Date Requirement ✅


## RosterManager

The `RosterManager` class handles roster creation, auto-population from schedules, and shift cost calculation.

### Core Operations

#### `createRoster(weekId)`
Creates a new roster for a specified week and auto-populates shifts from active employee schedules.

**Parameters:**
- `weekId`: ISO week identifier (YYYY-Www format, e.g., "2024-W15")

**Returns:**
- Success: `{ success: true, roster: IRoster }`
- Error: `{ success: false, error: string, message: string }`

**Behavior:**
1. Validates weekId format
2. Checks for duplicate roster
3. Calculates week boundaries (Monday to Sunday)
4. Creates roster with draft status
5. Auto-populates shifts from active employee schedules
6. Calculates estimated cost for each shift

**Example:**
```typescript
const rosterManager = new RosterManager()

const result = await rosterManager.createRoster("2024-W15")

if (result.success) {
  console.log("Roster created:", result.roster.weekId)
  console.log("Shifts created:", result.roster.shifts.length)
  console.log("Status:", result.roster.status) // "draft"
} else {
  console.error("Error:", result.error, result.message)
}
```

#### `populateRosterFromSchedules(weekId)`
Auto-populates roster shifts from active employee schedules for a specific week.

**Parameters:**
- `weekId`: ISO week identifier (YYYY-Www)

**Returns:**
- Success: `{ success: true, shiftsCreated: number }`
- Error: `{ success: false, error: string, message: string }`

**Algorithm:**
1. Query all employees with schedules
2. Filter schedules active during the target week (effectiveFrom/effectiveTo)
3. Apply overlap resolution (most recent effectiveFrom wins)
4. Generate shifts for each schedule day
5. Calculate shift date from dayOfWeek + week start
6. Calculate estimated cost based on employee award
7. Store shifts with sourceScheduleId reference

**Example:**
```typescript
const result = await rosterManager.populateRosterFromSchedules("2024-W15")

if (result.success) {
  console.log(`Created ${result.shiftsCreated} shifts from schedules`)
}
```

#### `calculateShiftCost(shift, employee)`
Calculates estimated cost for a shift based on employee's award and penalty rules.

**Parameters:**
- `shift`: Partial shift data with employeeId, date, startTime, endTime, locationId, roleId
- `employee`: Employee document with award information

**Returns:**
- `number`: Estimated cost in currency units (rounded to 2 decimal places)

**Calculation Logic:**
1. Calculate scheduled hours from shift times
2. Get employee's active award, level, and employment type
3. Get base rate from award conditions (hourly or salary)
4. Check applicable penalty rules:
   - `day_of_week`: Weekend/specific day penalties
   - `time_of_day`: Night shift or specific time penalties
5. Apply penalty multipliers or flat amounts
6. Calculate: `estimatedCost = hours × adjustedRate`

**Example:**
```typescript
const cost = await rosterManager.calculateShiftCost(
  {
    employeeId: employee._id,
    date: new Date("2024-04-13"), // Saturday
    startTime: new Date("2024-04-13T09:00:00Z"),
    endTime: new Date("2024-04-13T17:00:00Z"), // 8 hours
    locationId: locationId,
    roleId: roleId,
  },
  employee
)

console.log(`Estimated cost: $${cost}`)
// If base rate is $25/hour and weekend penalty is 1.5x:
// 8 hours × $25 × 1.5 = $300
```

#### `getRoster(weekId)`
Retrieves an existing roster for a specific week.

**Parameters:**
- `weekId`: ISO week identifier (YYYY-Www)

**Returns:**
- Success: `{ success: true, roster: IRoster }`
- Error: `{ success: false, error: string, message: string }`

**Example:**
```typescript
const result = await rosterManager.getRoster("2024-W15")

if (result.success) {
  console.log("Roster:", result.roster.weekId)
  console.log("Shifts:", result.roster.shifts.length)
  console.log("Status:", result.roster.status)
} else {
  console.error("Roster not found")
}
```

### Error Codes

- `DUPLICATE_WEEK`: Roster already exists for the specified week
- `ROSTER_NOT_FOUND`: Roster does not exist for the specified week
- `CREATE_FAILED`: Failed to create roster
- `POPULATE_FAILED`: Failed to populate roster from schedules
- `QUERY_FAILED`: Failed to query roster

### Shift Cost Calculation Details

The `calculateShiftCost` method implements the following logic:

**Base Rate Calculation:**
- **Hourly**: Uses `payRule.rate` directly
- **Salary**: Calculates hourly rate as `annualAmount / (52 × hoursPerWeek)`

**Penalty Rule Application:**

1. **Day of Week Penalties** (`day_of_week`):
   - Checks if shift date's day matches penalty rule's `days` array
   - Example: Weekend penalty applies to Saturday/Sunday

2. **Time of Day Penalties** (`time_of_day`):
   - Checks if shift time falls within penalty rule's `startHour` and `endHour`
   - Example: Night shift penalty for 22:00-06:00

3. **Rate Types**:
   - **Multiplier**: Multiplies base rate by `rateValue` (e.g., 1.5x for weekends)
   - **Flat Amount**: Adds `rateValue` to base rate (e.g., +$5/hour)

4. **Stackable Penalties**:
   - If `stackable: true`, multipliers compound (e.g., 1.5x × 1.25x = 1.875x)
   - If `stackable: false`, replaces base rate (e.g., base × 1.5x)

**Example Scenarios:**

```typescript
// Scenario 1: Weekday shift, no penalties
// Base: $25/hour, 8 hours = $200

// Scenario 2: Saturday shift, 1.5x weekend penalty
// Base: $25/hour, 8 hours, 1.5x = $300

// Scenario 3: Night shift, 1.25x penalty
// Base: $25/hour, 8 hours, 1.25x = $250

// Scenario 4: Saturday night shift, stackable penalties
// Base: $25/hour, 8 hours, 1.5x × 1.25x = $375
```

### Roster Auto-Population Algorithm

The `populateRosterFromSchedules` method implements the following algorithm:

```
For a given week W:
1. Calculate week start date (Monday) and end date (Sunday)
2. Query all employees with schedules
3. For each employee:
   a. Get active schedules where W overlaps [effectiveFrom, effectiveTo]
   b. Group schedules by dayOfWeek
   c. For overlapping schedules on same day, use most recent effectiveFrom
   d. For each day in schedule.dayOfWeek:
      - Calculate actual date for that day in week W
      - Create shift with:
        * employeeId
        * date (calculated from dayOfWeek + week start)
        * startTime and endTime from schedule
        * locationId and roleId from schedule
        * sourceScheduleId (reference to schedule)
        * estimatedCost (calculated from employee's award)
4. Store all generated shifts in roster.shifts array
```

**Key Features:**
- **Overlap Resolution**: When multiple schedules cover the same day, the schedule with the most recent `effectiveFrom` is used
- **Date Calculation**: Converts schedule's `dayOfWeek` (0-6) to actual dates within the target week
- **Time Preservation**: Shift times use the schedule's UTC times combined with the shift date
- **Cost Calculation**: Each shift's estimated cost is calculated based on the employee's current award conditions

## Testing

### Manual Testing

#### ScheduleManager

Run the manual test script to verify the ScheduleManager implementation:

```bash
node --env-file=.env lib/managers/__tests__/schedule-manager.manual-test.mjs
```

This script tests:
- Creating schedules
- Updating schedules
- Deleting schedules
- Getting active schedules
- Overlap resolution
- Validation errors

#### RosterManager

Run the manual test script to verify the RosterManager implementation:

```bash
node --env-file=.env lib/managers/__tests__/roster-manager.manual-test.mjs
```

This script tests:
- Creating rosters
- Duplicate roster prevention
- Auto-population from schedules
- Shift cost calculation
- Weekend penalty application
- Schedule overlap resolution
- Getting rosters

### Verification

Run the verification script to check the RosterManager implementation structure:

```bash
node lib/managers/__tests__/roster-manager-verify.mjs
```

This script verifies:
- Class structure and methods
- Import statements
- Key algorithm implementations
- Error handling patterns

## Requirements Coverage

### ScheduleManager

The ScheduleManager implements the following requirements from the spec:

- **Requirement 1.1**: Store schedules on employee documents ✅
- **Requirement 1.6**: Apply only schedules within effective date range ✅
- **Requirement 9.1**: Require effectiveFrom date ✅
- **Requirement 9.2**: Allow null effectiveTo for indefinite schedules ✅
- **Requirement 9.3**: Filter schedules by effective date range ✅
- **Requirement 9.4**: Apply most recent effectiveFrom for overlaps ✅
- **Requirement 9.5**: Treat null effectiveTo as indefinite ✅
- **Requirement 11.4**: Validate locationId references ✅
- **Requirement 11.5**: Validate roleId references ✅
- **Requirement 11.6**: Return descriptive error messages ✅

### RosterManager

The RosterManager implements the following requirements from the spec:

- **Requirement 2.1**: Create roster document when first shift is added ✅
- **Requirement 2.2**: Store one roster per calendar week ✅
- **Requirement 2.5**: Pre-populate shifts from active employee schedules ✅
- **Requirement 2.6**: Week identifier uniquely identifies calendar week ✅

**Task 3.1 Specific Requirements:**
- Query all employees and their active schedules for the week ✅
- Generate shifts from schedules with proper date calculation ✅
- Calculate estimatedCost for each generated shift using employee's award ✅
- Store generated shifts in roster.shifts array ✅

## Design Properties

### ScheduleManager

The ScheduleManager validates the following correctness properties:

- **Property 1**: Schedule Data Structure Integrity ✅
- **Property 2**: Schedule Time Ordering ✅
- **Property 3**: Schedule Date Ordering ✅
- **Property 4**: Active Schedule Filtering ✅
- **Property 5**: Schedule Overlap Resolution ✅
- **Property 18**: Schedule Validation Enforcement ✅
- **Property 20**: Schedule Effective Date Requirement ✅

### RosterManager

The RosterManager validates the following correctness properties:

- **Property 6**: Roster Week Uniqueness ✅
- **Property 7**: Roster Structure Integrity ✅
- **Property 8**: Roster Auto-Population Completeness ✅

## Implementation Notes

### Time Handling

All times are stored as Date objects in UTC:
- Schedule times: Stored as Date with UTC time component
- Shift times: Combine shift date with schedule's UTC time
- Date calculations: Use date-fns for ISO week calculations

### Week Identifier Format

Rosters use ISO week date format (YYYY-Www):
- Week starts on Monday (ISO standard)
- Week 1 contains the first Thursday of the year
- Format: "2024-W15" for week 15 of 2024
- Calculated using `date-fns` functions: `getISOWeek`, `getISOWeekYear`

### Cost Calculation

Estimated costs are calculated at roster creation time:
- Based on employee's current award conditions
- Includes applicable penalty rules (day of week, time of day)
- Does not include overtime (calculated at timesheet entry)
- Rounded to 2 decimal places

### Schedule Overlap Resolution

When multiple schedules overlap for the same day:
1. Group schedules by dayOfWeek
2. For each day, select schedule with most recent effectiveFrom
3. This ensures schedule changes take effect properly
4. Example: New schedule starting March 1 overrides old schedule for overlapping days


## TimesheetManager

The `TimesheetManager` class handles timesheet creation with automatic shift linking, manual shift linking, and query operations for payroll processing.

### Core Operations

#### `createTimesheet(timesheetData)`
Creates a new timesheet entry with automatic shift linking.

**Parameters:**
- `timesheetData`: Timesheet data (pin, type, date, time, etc.)

**Returns:**
- Success: `{ success: true, timesheet: ITimesheetDocument, shiftMatched: boolean }`
- Error: `{ success: false, error: string, message: string }`

**Behavior:**
1. If type is "in" and date/time are provided, attempts to find matching roster shift
2. Uses shift matching algorithm to find closest shift by time proximity
3. Creates timesheet with scheduleShiftId if match found
4. Returns shiftMatched flag indicating if automatic linking occurred

**Example:**
```typescript
const timesheetManager = new TimesheetManager()

const result = await timesheetManager.createTimesheet({
  pin: "1234",
  type: "in",
  date: "2024-04-15",
  time: "09:00",
})

if (result.success) {
  console.log("Timesheet created:", result.timesheet._id)
  console.log("Shift matched:", result.shiftMatched)
  if (result.timesheet.scheduleShiftId) {
    console.log("Linked to shift:", result.timesheet.scheduleShiftId)
  }
}
```

#### `findMatchingShift(pin, date, time)`
Finds matching roster shift for a timesheet entry using time proximity logic.

**Parameters:**
- `pin`: Employee pin
- `date`: Date string (YYYY-MM-DD format)
- `time`: Time string (HH:mm format)

**Returns:**
- Success: `{ success: true, shift: IShift | null }`
- Error: `{ success: false, error: string, message: string }`

**Algorithm:**
1. Find employee by pin
2. Parse date and time to create clock-in Date object
3. Calculate week identifier for the date
4. Find roster for this week
5. Filter shifts for this employee and date
6. If multiple shifts found, select the one with closest startTime to clock-in
7. Return matched shift or null

**Example:**
```typescript
const result = await timesheetManager.findMatchingShift(
  "1234",
  "2024-04-15",
  "09:05"
)

if (result.success && result.shift) {
  console.log("Matched shift:", result.shift._id)
  console.log("Shift start time:", result.shift.startTime)
}
```

#### `linkTimesheetToShift(timesheetId, shiftId)`
Manually links a timesheet to a roster shift.

**Parameters:**
- `timesheetId`: Timesheet ID
- `shiftId`: Shift ID

**Returns:**
- Success: `{ success: true, timesheet: ITimesheetDocument }`
- Error: `{ success: false, error: string, message: string }`

**Validation:**
- Verifies shift exists in roster collection
- Verifies timesheet exists
- Updates timesheet.scheduleShiftId

**Example:**
```typescript
const result = await timesheetManager.linkTimesheetToShift(
  timesheetId,
  shiftId
)

if (result.success) {
  console.log("Timesheet linked to shift")
}
```

#### `getTimesheetsForShift(shiftId)`
Gets all timesheets linked to a specific roster shift.

**Parameters:**
- `shiftId`: Shift ID

**Returns:**
- Success: `{ success: true, timesheets: ITimesheetDocument[] }`
- Error: `{ success: false, error: string, message: string }`

**Note:** Multiple timesheets can link to the same shift (e.g., split shifts, breaks).

**Example:**
```typescript
const result = await timesheetManager.getTimesheetsForShift(shiftId)

if (result.success) {
  console.log(`Found ${result.timesheets.length} timesheets for shift`)
  result.timesheets.forEach(t => {
    console.log(`${t.type} at ${t.time}`)
  })
}
```

#### `getTimesheetsForDateRange(startDate, endDate, options?)`
Gets timesheets for a date range with optional filtering and sorting.

**Parameters:**
- `startDate`: Start date (YYYY-MM-DD format)
- `endDate`: End date (YYYY-MM-DD format)
- `options`: Optional filtering and sorting options
  - `pin`: Filter by employee pin
  - `type`: Filter by type (in, out, break, endBreak)
  - `sortBy`: Sort field (date, pin, time)
  - `sortOrder`: Sort order (asc, desc)

**Returns:**
- Success: `{ success: true, timesheets: ITimesheetDocument[] }`
- Error: `{ success: false, error: string, message: string }`

**Example:**
```typescript
const result = await timesheetManager.getTimesheetsForDateRange(
  "2024-04-01",
  "2024-04-30",
  {
    pin: "1234",
    type: "in",
    sortBy: "date",
    sortOrder: "asc"
  }
)

if (result.success) {
  console.log(`Found ${result.timesheets.length} timesheets`)
}
```

#### `getTimesheetsForEmployee(pin, startDate, endDate)`
Gets timesheets for a specific employee within a date range.

**Parameters:**
- `pin`: Employee pin
- `startDate`: Start date (YYYY-MM-DD format)
- `endDate`: End date (YYYY-MM-DD format)

**Returns:**
- Success: `{ success: true, timesheets: ITimesheetDocument[] }`
- Error: `{ success: false, error: string, message: string }`

**Example:**
```typescript
const result = await timesheetManager.getTimesheetsForEmployee(
  "1234",
  "2024-04-01",
  "2024-04-30"
)

if (result.success) {
  console.log(`Found ${result.timesheets.length} timesheets for employee`)
}
```

#### `getTimesheetPairsForPayroll(startDate, endDate)`
Gets clock-in/clock-out pairs for payroll processing.

**Parameters:**
- `startDate`: Start date (YYYY-MM-DD format)
- `endDate`: End date (YYYY-MM-DD format)

**Returns:**
- Success: `{ success: true, pairs: Array<{ pin, date, clockIn, clockOut, scheduleShiftId }> }`
- Error: `{ success: false, error: string, message: string }`

**Behavior:**
1. Gets all timesheets in date range
2. Groups by pin and date
3. Pairs clock-in and clock-out entries
4. Includes scheduleShiftId from clock-in if available

**Example:**
```typescript
const result = await timesheetManager.getTimesheetPairsForPayroll(
  "2024-04-01",
  "2024-04-30"
)

if (result.success) {
  console.log(`Found ${result.pairs.length} timesheet pairs`)
  result.pairs.forEach(pair => {
    console.log(`${pair.pin} on ${pair.date}:`)
    console.log(`  Clock in: ${pair.clockIn?.time}`)
    console.log(`  Clock out: ${pair.clockOut?.time}`)
    if (pair.scheduleShiftId) {
      console.log(`  Linked to shift: ${pair.scheduleShiftId}`)
    }
  })
}
```

### Error Codes

- `CREATE_FAILED`: Failed to create timesheet
- `MATCH_FAILED`: Failed to find matching shift
- `INVALID_SHIFT_REF`: Referenced shift does not exist
- `TIMESHEET_NOT_FOUND`: Timesheet not found
- `LINK_FAILED`: Failed to link timesheet to shift
- `SHIFT_NOT_FOUND`: Shift not found
- `QUERY_FAILED`: Failed to query timesheets

### Shift Matching Algorithm

The `findMatchingShift` method implements the following algorithm:

```
For a timesheet entry with clock-in:
1. Extract employee pin, date, and clock-in time (Date in UTC)
2. Query roster for the week containing the date
3. Filter shifts where:
   - shift.employeeId matches timesheet.pin
   - shift.date matches timesheet.date
4. If multiple shifts found for same employee/date:
   - Calculate time difference between clock-in and each shift.startTime (both Date objects)
   - Select shift with smallest time difference
5. Return matched shift ObjectId or null
```

**Key Features:**
- **Time Proximity**: Matches to shift with closest start time
- **Multiple Shifts**: Handles employees with multiple shifts on same day
- **UTC Handling**: All time comparisons use UTC Date objects
- **Graceful Fallback**: Returns null if no match found (not an error)

**Example Scenarios:**

```typescript
// Scenario 1: Single shift, exact match
// Shift: 09:00-17:00
// Clock-in: 09:00
// Result: Matched to shift

// Scenario 2: Single shift, early clock-in
// Shift: 09:00-17:00
// Clock-in: 08:55
// Result: Matched to shift (5 minutes early)

// Scenario 3: Multiple shifts, closest match
// Shift A: 09:00-13:00
// Shift B: 14:00-18:00
// Clock-in: 13:55
// Result: Matched to Shift B (5 minutes early vs 4h 55m late)

// Scenario 4: No roster for week
// Clock-in: 09:00
// Result: null (no error, just no match)
```

### Multiple Timesheets Per Shift

The system supports multiple timesheets linking to the same `scheduleShiftId`. This handles scenarios like:

1. **Split Shifts with Breaks**:
   - Clock in: 09:00
   - Clock out: 12:00 (lunch break)
   - Clock in: 13:00
   - Clock out: 17:00
   - All four entries link to same shift

2. **Shift Extensions**:
   - Scheduled: 09:00-17:00
   - Clock in: 09:00
   - Clock out: 17:00
   - Clock in: 17:00 (overtime)
   - Clock out: 19:00
   - All entries link to same shift

3. **Corrections**:
   - Original clock-in: 09:00
   - Corrected clock-in: 08:55
   - Both entries link to same shift for audit trail

### Payroll Processing

The `getTimesheetPairsForPayroll` method groups timesheets for payroll calculations:

**Grouping Logic:**
- Groups by `pin:date` key
- Finds first "in" entry as clock-in
- Finds first "out" entry as clock-out
- Includes scheduleShiftId for variance reporting

**Use Cases:**
- Calculate hours worked per day
- Compare actual vs scheduled hours
- Generate payroll reports
- Identify missing clock-outs

## Testing

### Manual Testing

#### TimesheetManager

Run the manual test script to verify the TimesheetManager implementation:

```bash
node --env-file=.env lib/managers/__tests__/timesheet-manager.manual-test.mjs
```

This script tests:
- Shift matching algorithm
- Timesheet creation with automatic shift linking
- Manual shift linking
- Query operations for shifts and date ranges
- Payroll pair generation

## Requirements Coverage

### TimesheetManager

The TimesheetManager implements the following requirements from the spec:

- **Requirement 4.1**: Store scheduleShiftId field on timesheet documents ✅
- **Requirement 4.2**: Store scheduleShiftId as ObjectId reference ✅
- **Requirement 4.3**: Allow scheduleShiftId to be null for unscheduled work ✅
- **Requirement 4.4**: Populate scheduleShiftId when timesheet created for scheduled shift ✅
- **Requirement 4.5**: Validate referenced roster shift exists ✅
- **Requirement 6.4**: Match timesheets to shifts by employee and date ✅
- **Requirement 8.1**: Provide actual clock-in and clock-out times ✅
- **Requirement 8.2**: Provide link to roster shifts ✅
- **Requirement 8.3**: Use timesheet records as source of truth ✅
- **Requirement 8.4**: Provide access to timesheets within date range ✅

## Design Properties

### TimesheetManager

The TimesheetManager validates the following correctness properties:

- **Property 10**: Timesheet Shift Reference Integrity ✅
- **Property 11**: Timesheet Shift Matching ✅
- **Property 16**: Date Range Query Completeness ✅

## Implementation Notes

### Time Handling

All times are stored and compared as Date objects in UTC:
- Timesheet date/time strings are parsed to UTC Date objects
- Shift times are stored as Date objects in UTC
- Time proximity calculations use UTC timestamps
- Presentation layer handles timezone conversions

### Date Format

Timesheets use string date format (YYYY-MM-DD):
- Consistent with existing timesheet schema
- Easy to query with MongoDB string comparison
- Converted to Date objects for shift matching

### Null Handling

The system gracefully handles missing data:
- `scheduleShiftId` can be null (unscheduled work)
- `findMatchingShift` returns null if no match (not an error)
- `getTimesheetsForShift` returns empty array if no timesheets

### Performance Considerations

Query optimization:
- Index on `scheduleShiftId` for reverse lookups
- Index on `pin` and `date` for employee queries
- Date range queries use indexed fields
- Shift matching queries single roster document


## VarianceAnalyticsService

The `VarianceAnalyticsService` class provides comprehensive analytics and reporting capabilities for the schedule and roster management system. It calculates variances between scheduled and actual worked hours, detects no-shows, monitors punctuality, and generates detailed reports.

### Core Operations

#### `calculateVariance(shiftId)`
Calculates the difference between scheduled hours and actual worked hours for a shift.

**Parameters:**
- `shiftId`: Shift ID (ObjectId or string)

**Returns:**
- Success: `{ success: true, scheduledHours, actualHours, variance, timesheetCount }`
- Error: `{ success: false, error: string, message: string }`

**Behavior:**
- Calculates scheduled hours from shift start/end times
- Sums actual hours from all linked timesheets (supports multiple timesheets per shift)
- Calculates variance as (actual - scheduled)
- Rounds all values to 2 decimal places
- Positive variance = overtime, negative variance = under-worked

**Example:**
```typescript
const service = new VarianceAnalyticsService()

const result = await service.calculateVariance(shiftId)

if (result.success) {
  console.log(`Scheduled: ${result.scheduledHours}h`)
  console.log(`Actual: ${result.actualHours}h`)
  console.log(`Variance: ${result.variance}h`)
  console.log(`Timesheets: ${result.timesheetCount}`)
}
```

#### `detectNoShows(weekId)`
Identifies shifts where employees didn't clock in.

**Parameters:**
- `weekId`: ISO week identifier (YYYY-Www)

**Returns:**
- Success: `{ success: true, noShows: IShift[] }`
- Error: `{ success: false, error: string, message: string }`

**Behavior:**
- Only checks published rosters
- Only checks shifts where end time has passed
- Identifies shifts with no linked timesheets
- Returns array of no-show shifts

**Example:**
```typescript
const result = await service.detectNoShows("2024-W15")

if (result.success) {
  console.log(`No-shows detected: ${result.noShows.length}`)
  for (const shift of result.noShows) {
    console.log(`- Employee ${shift.employeeId} on ${shift.date}`)
  }
}
```

#### `calculatePunctuality(shiftId)`
Determines if employee clocked in early, late, or on-time.

**Parameters:**
- `shiftId`: Shift ID (ObjectId or string)

**Returns:**
- Success: `{ success: true, status: "early" | "late" | "on-time", minutes: number }`
- Error: `{ success: false, error: string, message: string }`

**Behavior:**
- Finds first clock-in timesheet for the shift
- Calculates time difference in minutes between clock-in and shift start
- Negative difference = early, positive = late, zero = on-time
- Returns absolute minutes value

**Example:**
```typescript
const result = await service.calculatePunctuality(shiftId)

if (result.success) {
  console.log(`Status: ${result.status}`)
  console.log(`Minutes: ${result.minutes}`)
  // Example output: "Status: late, Minutes: 10"
}
```

#### `calculateActualCost(shiftId)`
Calculates the actual cost of a shift based on worked hours and award conditions.

**Parameters:**
- `shiftId`: Shift ID (ObjectId or string)

**Returns:**
- Success: `{ success: true, actualCost: number }`
- Error: `{ success: false, error: string, message: string }`

**Behavior:**
- Uses actual worked hours from timesheets
- Applies employee's award rate and penalty rules
- Considers day of week, time of day, and overtime penalties
- Returns 0 if no employee assigned or no hours worked
- Rounds to 2 decimal places

**Example:**
```typescript
const result = await service.calculateActualCost(shiftId)

if (result.success) {
  console.log(`Actual cost: $${result.actualCost.toFixed(2)}`)
}
```

#### `generateWeeklyReport(weekId)`
Generates a comprehensive report for an entire roster week.

**Parameters:**
- `weekId`: ISO week identifier (YYYY-Www)

**Returns:**
- Success: `{ success: true, report: WeeklyReport }`
- Error: `{ success: false, error: string, message: string }`

**Report Structure:**
```typescript
{
  weekId: string
  status: "draft" | "published"
  totalShifts: number
  totalScheduledHours: number
  totalActualHours: number
  totalVariance: number
  totalEstimatedCost: number
  totalActualCost: number
  costVariance: number
  noShowCount: number
  shifts: Array<{
    shiftId: string
    employeeId: string | null
    date: Date
    scheduledHours: number
    actualHours: number
    variance: number
    estimatedCost: number
    actualCost: number
    punctuality: {
      status: "early" | "late" | "on-time" | "no-show"
      minutes: number
    }
  }>
}
```

**Example:**
```typescript
const result = await service.generateWeeklyReport("2024-W15")

if (result.success) {
  const report = result.report
  console.log(`Week: ${report.weekId}`)
  console.log(`Total shifts: ${report.totalShifts}`)
  console.log(`Scheduled hours: ${report.totalScheduledHours}`)
  console.log(`Actual hours: ${report.totalActualHours}`)
  console.log(`Variance: ${report.totalVariance}`)
  console.log(`Cost variance: $${report.costVariance}`)
  console.log(`No-shows: ${report.noShowCount}`)
}
```

#### `generateEmployeeReport(employeeId, startDate, endDate)`
Generates a report for a specific employee over a date range.

**Parameters:**
- `employeeId`: Employee ID (ObjectId or string)
- `startDate`: Start date (YYYY-MM-DD format)
- `endDate`: End date (YYYY-MM-DD format)

**Returns:**
- Success: `{ success: true, report: EmployeeReport }`
- Error: `{ success: false, error: string, message: string }`

**Report Structure:**
```typescript
{
  employeeId: string
  startDate: string
  endDate: string
  totalShifts: number
  totalScheduledHours: number
  totalActualHours: number
  totalVariance: number
  totalEstimatedCost: number
  totalActualCost: number
  costVariance: number
  noShowCount: number
  earlyCount: number
  lateCount: number
  onTimeCount: number
  shifts: Array<{
    shiftId: string
    weekId: string
    date: Date
    scheduledHours: number
    actualHours: number
    variance: number
    estimatedCost: number
    actualCost: number
    punctuality: {
      status: "early" | "late" | "on-time" | "no-show"
      minutes: number
    }
  }>
}
```

**Example:**
```typescript
const result = await service.generateEmployeeReport(
  employeeId,
  "2024-04-01",
  "2024-04-30"
)

if (result.success) {
  const report = result.report
  console.log(`Employee: ${report.employeeId}`)
  console.log(`Total shifts: ${report.totalShifts}`)
  console.log(`Early: ${report.earlyCount}`)
  console.log(`Late: ${report.lateCount}`)
  console.log(`On-time: ${report.onTimeCount}`)
  console.log(`No-shows: ${report.noShowCount}`)
}
```

### Error Codes

- `SHIFT_NOT_FOUND`: Shift ID doesn't exist
- `ROSTER_NOT_FOUND`: Roster for week ID doesn't exist
- `EMPLOYEE_NOT_FOUND`: Employee ID doesn't exist
- `NO_TIMESHEET`: No timesheet found for punctuality calculation
- `CALCULATION_FAILED`: General calculation error
- `DETECTION_FAILED`: No-show detection error
- `REPORT_GENERATION_FAILED`: Report generation error

### Key Features

#### Multiple Timesheets Per Shift
The service supports multiple timesheets linked to the same shift, which handles scenarios like:
- Split shifts with breaks (clock out for lunch, clock back in)
- Shift extensions (work additional hours on same shift)
- Corrections (multiple entries for same shift period)

When calculating variance, all linked timesheet hours are summed.

#### Cost Calculations
Both estimated cost (from roster) and actual cost (from timesheets) use the same penalty rule logic:
- Base rate from employee's award
- Day of week penalties
- Time of day penalties
- Overtime penalties (actual cost only)

#### Rounding
All hour and cost values are rounded to 2 decimal places for consistency.

#### Time Zone Handling
All date/time calculations are performed in UTC. The presentation layer is responsible for converting to/from local time zones.

### Variance Calculation Details

The `calculateVariance` method implements the following logic:

**Scheduled Hours:**
```
scheduledHours = (shift.endTime - shift.startTime) in hours
```

**Actual Hours:**
```
For each timesheet linked to shift:
  Find clock-in entry (type = "in")
  Find matching clock-out entry (type = "out", same pin/date, time >= clock-in)
  Calculate hours = (clock-out time - clock-in time) in hours
  Add to total actual hours
```

**Variance:**
```
variance = actualHours - scheduledHours
- Positive: Employee worked more than scheduled (overtime)
- Negative: Employee worked less than scheduled (under-worked)
- Zero: Employee worked exactly as scheduled
```

**Example Scenarios:**

```typescript
// Scenario 1: Exact match
// Scheduled: 09:00-17:00 (8 hours)
// Actual: 09:00-17:00 (8 hours)
// Variance: 0 hours

// Scenario 2: Overtime
// Scheduled: 09:00-17:00 (8 hours)
// Actual: 09:00-18:30 (9.5 hours)
// Variance: +1.5 hours

// Scenario 3: Under-worked
// Scheduled: 09:00-17:00 (8 hours)
// Actual: 09:00-16:00 (7 hours)
// Variance: -1 hour

// Scenario 4: Split shift
// Scheduled: 09:00-17:00 (8 hours)
// Actual: 09:00-12:00 (3 hours) + 13:00-17:00 (4 hours) = 7 hours
// Variance: -1 hour
```

### No-Show Detection Logic

The `detectNoShows` method implements the following logic:

```
For a roster R with status "published":
1. Get current date/time
2. Filter shifts where:
   - shift.endTime has passed
   - No timesheet exists with scheduleShiftId = shift._id
3. Return list of no-show shifts
```

**Key Features:**
- Only checks published rosters (draft rosters are still being edited)
- Only checks shifts where end time has passed (future shifts can't be no-shows yet)
- Checks for any timesheet linked to the shift (not just clock-in)

**Example Scenarios:**

```typescript
// Scenario 1: No-show
// Shift: 09:00-17:00 (ended 2 hours ago)
// Timesheets: None
// Result: No-show detected

// Scenario 2: Clocked in
// Shift: 09:00-17:00 (ended 2 hours ago)
// Timesheets: Clock-in at 09:05
// Result: Not a no-show

// Scenario 3: Future shift
// Shift: 09:00-17:00 (starts in 2 hours)
// Timesheets: None
// Result: Not checked (shift hasn't ended yet)

// Scenario 4: Draft roster
// Shift: 09:00-17:00 (ended 2 hours ago)
// Roster status: draft
// Result: Not checked (only published rosters)
```

### Punctuality Calculation Logic

The `calculatePunctuality` method implements the following logic:

```
For a shift S with timesheet T:
1. Extract scheduled start time from S.startTime
2. Extract actual clock-in time from T.clockIn
3. Calculate difference in minutes:
   diff = (T.clockIn - S.startTime) in minutes
4. If diff < 0: return { status: "early", minutes: abs(diff) }
5. If diff > 0: return { status: "late", minutes: diff }
6. If diff == 0: return { status: "on-time", minutes: 0 }
```

**Example Scenarios:**

```typescript
// Scenario 1: On-time
// Shift start: 09:00
// Clock-in: 09:00
// Result: { status: "on-time", minutes: 0 }

// Scenario 2: Early
// Shift start: 09:00
// Clock-in: 08:50
// Result: { status: "early", minutes: 10 }

// Scenario 3: Late
// Shift start: 09:00
// Clock-in: 09:15
// Result: { status: "late", minutes: 15 }

// Scenario 4: Very late
// Shift start: 09:00
// Clock-in: 10:30
// Result: { status: "late", minutes: 90 }
```

### Actual Cost Calculation Logic

The `calculateActualCost` method implements the following logic:

**Step 1: Get Actual Hours**
```
Use calculateVariance to get actual hours worked
If no hours worked, return 0
```

**Step 2: Get Base Rate**
```
Get employee's award, level, and employment type
If hourly: baseRate = payRule.rate
If salary: baseRate = annualAmount / (52 × hoursPerWeek)
```

**Step 3: Apply Penalty Rules**
```
For each penalty rule in award conditions:
  Check if rule applies based on:
    - day_of_week: shift date's day matches rule's days
    - time_of_day: shift time falls within rule's hours
    - overtime_hours: actual hours exceed threshold
  
  If applies:
    If multiplier: adjustedRate *= rateValue (or = baseRate * rateValue if not stackable)
    If flat_amount: adjustedRate += rateValue
```

**Step 4: Calculate Cost**
```
actualCost = actualHours × adjustedRate
Round to 2 decimal places
```

**Example Scenarios:**

```typescript
// Scenario 1: Weekday, no penalties
// Base: $25/hour, Actual: 8 hours
// Cost: 8 × $25 = $200

// Scenario 2: Saturday, 1.5x penalty
// Base: $25/hour, Actual: 8 hours, Weekend: 1.5x
// Cost: 8 × ($25 × 1.5) = $300

// Scenario 3: Overtime, 1.5x penalty
// Base: $25/hour, Actual: 10 hours, Overtime threshold: 8 hours
// Cost: 10 × ($25 × 1.5) = $375

// Scenario 4: Saturday + Overtime, stackable
// Base: $25/hour, Actual: 10 hours, Weekend: 1.5x, Overtime: 1.5x
// Cost: 10 × ($25 × 1.5 × 1.5) = $562.50
```

## Testing

### Manual Testing

#### VarianceAnalyticsService

Run the verification script to check the VarianceAnalyticsService implementation:

```bash
node lib/managers/__tests__/variance-analytics-service-verify.mjs
```

This script verifies:
- Class structure and methods
- Implementation details
- Requirements coverage

Run the manual test script (requires database connection):

```bash
node --env-file=.env lib/managers/__tests__/variance-analytics-service.manual-test.mjs
```

This script tests:
- Variance calculation with and without timesheets
- No-show detection
- Punctuality calculation
- Actual cost calculation
- Weekly report generation
- Employee report generation

## Requirements Coverage

### VarianceAnalyticsService

The VarianceAnalyticsService implements the following requirements from the spec:

- **Requirement 5.1**: Calculate difference between scheduled and actual hours ✅
- **Requirement 5.2**: Calculate scheduled hours from shift times ✅
- **Requirement 5.3**: Calculate actual hours from timesheet times ✅
- **Requirement 5.4**: Express variance in hours with 2 decimal precision ✅
- **Requirement 5.5**: Report positive variance for overtime ✅
- **Requirement 5.6**: Report negative variance for under-worked ✅
- **Requirement 6.1**: Identify shifts with no timesheet as no-show ✅
- **Requirement 6.2**: Check no-shows only on published rosters ✅
- **Requirement 6.3**: Check no-shows only after shift end time ✅
- **Requirement 6.4**: Match timesheets to shifts by employee and date ✅
- **Requirement 7.1**: Calculate time difference in minutes ✅
- **Requirement 7.2**: Report early clock-in with minutes early ✅
- **Requirement 7.3**: Report late clock-in with minutes late ✅
- **Requirement 7.4**: Calculate with 1-minute precision ✅
- **Requirement 7.5**: Report on-time status for exact match ✅

## Design Properties

### VarianceAnalyticsService

The VarianceAnalyticsService validates the following correctness properties:

- **Property 12**: Variance Calculation Accuracy ✅
- **Property 13**: Variance Sign Convention ✅
- **Property 14**: No-Show Detection Criteria ✅
- **Property 15**: Punctuality Calculation Accuracy ✅

## Implementation Notes

### Report Generation Performance

Report generation can be resource-intensive for large rosters:
- Weekly reports process all shifts in a roster
- Employee reports query multiple rosters
- Each shift requires variance, cost, and punctuality calculations
- Consider caching or background processing for large datasets

### Cost Calculation Differences

Estimated cost (from roster) vs actual cost (from analytics):
- **Estimated**: Based on scheduled hours, calculated at roster creation
- **Actual**: Based on worked hours, calculated from timesheets
- **Differences**: Overtime, under-worked hours, penalty rule changes

### Time Zone Considerations

All calculations use UTC:
- Shift times stored in UTC
- Timesheet times parsed to UTC
- Punctuality calculations compare UTC timestamps
- Presentation layer handles timezone conversions

### Null Handling

The service gracefully handles missing data:
- Returns 0 cost if no employee or no hours worked
- Returns empty no-shows array if roster not published
- Returns error if no timesheet for punctuality (can't calculate)
- Returns 0 variance if no timesheets (all scheduled hours unworked)
