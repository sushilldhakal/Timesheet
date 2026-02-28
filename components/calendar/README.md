# Big Calendar Integration

This calendar system is integrated from [lramos33/big-calendar](https://github.com/lramos33/big-calendar) with full features including drag-and-drop, multiple views, and user filtering.

## Features

✅ **Multiple Views**: Month, Week, Day, Agenda, and Year views
✅ **Drag and Drop**: Reschedule events by dragging
✅ **User Filtering**: Filter events by user/employee
✅ **Badge Variants**: Three display styles (dot, colored, mixed)
✅ **Multi-day Events**: Support for events spanning multiple days
✅ **Working Hours**: Configurable working hours with distinct styling
✅ **Real-time Features**: Live time indicator and current event highlighting
✅ **Dark Mode**: Full dark mode support
✅ **Responsive**: Works on all screen sizes

## Usage

### Basic Setup

```tsx
import { CalendarProvider } from '@/components/calendar/contexts/calendar-context';
import { ClientContainer } from '@/components/calendar/components/client-container';
import { IEvent, IUser } from '@/components/calendar/interfaces';

const events: IEvent[] = [
  {
    id: 1,
    title: 'Morning Shift',
    description: 'Regular morning shift',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    color: 'blue',
    user: {
      id: '1',
      name: 'John Doe',
      picturePath: null,
    },
  },
];

const users: IUser[] = [
  {
    id: '1',
    name: 'John Doe',
    picturePath: null,
  },
];

export default function CalendarPage() {
  return (
    <CalendarProvider events={events} users={users}>
      <ClientContainer view="month" />
    </CalendarProvider>
  );
}
```

### Available Views

```tsx
// Month view (default)
<ClientContainer view="month" />

// Week view
<ClientContainer view="week" />

// Day view
<ClientContainer view="day" />

// Agenda view (list of events)
<ClientContainer view="agenda" />

// Year view
<ClientContainer view="year" />
```

### Badge Variants

Control how events are displayed:

```tsx
import { ChangeBadgeVariantInput } from '@/components/calendar/components/change-badge-variant-input';

<CalendarProvider events={events} users={users}>
  <ClientContainer view="month" />
  <ChangeBadgeVariantInput />
</CalendarProvider>
```

Options:
- **dot**: Small colored dot indicator
- **colored**: Full colored badge
- **mixed**: Combination of both

### Working Hours Configuration

```tsx
import { ChangeWorkingHoursInput } from '@/components/calendar/components/change-working-hours-input';

<ChangeWorkingHoursInput />
```

### Visible Hours Configuration

```tsx
import { ChangeVisibleHoursInput } from '@/components/calendar/components/change-visible-hours-input';

<ChangeVisibleHoursInput />
```

## Data Structure

### Event Interface

```typescript
interface IEvent {
  id: number;
  startDate: string; // ISO string
  endDate: string; // ISO string
  title: string;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
  description: string;
  user: IUser;
}
```

### User Interface

```typescript
interface IUser {
  id: string;
  name: string;
  picturePath: string | null;
}
```

## Calendar Context

Access calendar state from any component:

```tsx
import { useCalendar } from '@/components/calendar/contexts/calendar-context';

function MyComponent() {
  const {
    events,
    users,
    selectedDate,
    setSelectedDate,
    selectedUserId,
    setSelectedUserId,
    badgeVariant,
    setBadgeVariant,
    view,
    setView,
    filteredEvents,
  } = useCalendar();

  // Your component logic
}
```

## Event Management

### Add Event Dialog

```tsx
import { AddEventDialog } from '@/components/calendar/components/dialogs/add-event-dialog';

<AddEventDialog>
  <button>Add Event</button>
</AddEventDialog>
```

### Edit Event Dialog

```tsx
import { EditEventDialog } from '@/components/calendar/components/dialogs/edit-event-dialog';

<EditEventDialog event={selectedEvent}>
  <button>Edit</button>
</EditEventDialog>
```

### Event Details Dialog

```tsx
import { EventDetailsDialog } from '@/components/calendar/components/dialogs/event-details-dialog';

<EventDetailsDialog event={selectedEvent}>
  <button>View Details</button>
</EventDetailsDialog>
```

## Drag and Drop

The calendar uses `react-dnd` for drag-and-drop functionality. Events can be dragged to different dates and times automatically.

## Customization

### Custom Colors

Available colors: `blue`, `green`, `red`, `yellow`, `purple`, `orange`

### Custom Event Rendering

Modify event appearance by editing the badge components in:
- `lib/calendar/components/month-view/month-event-badge.tsx`
- `lib/calendar/components/week-and-day-view/event-block.tsx`

## Integration with Roster API

To integrate with your roster management system:

```typescript
// Fetch rosters and transform to events
const fetchRosterEvents = async (weekId: string) => {
  const response = await fetch(`/api/rosters/${weekId}`);
  const data = await response.json();
  
  const events: IEvent[] = data.roster.shifts.map((shift, index) => ({
    id: index + 1,
    title: shift.role,
    description: `${shift.location} - ${shift.employeeName}`,
    startDate: shift.startTime,
    endDate: shift.endTime,
    color: getColorForRole(shift.role),
    user: {
      id: shift.employeeId,
      name: shift.employeeName,
      picturePath: null,
    },
  }));
  
  return events;
};
```

## Dependencies

- `react-dnd`: Drag and drop functionality
- `react-dnd-html5-backend`: HTML5 backend for react-dnd
- `react-aria-components`: Accessible UI components
- `date-fns`: Date manipulation
- `react-day-picker`: Date picker component

All dependencies are already installed.

## File Structure

```
lib/calendar/
├── components/
│   ├── agenda-view/          # Agenda view components
│   ├── dialogs/              # Event dialogs (add, edit, details)
│   ├── dnd/                  # Drag and drop components
│   ├── header/               # Calendar header components
│   ├── month-view/           # Month view components
│   ├── week-and-day-view/    # Week and day view components
│   ├── year-view/            # Year view components
│   ├── change-badge-variant-input.tsx
│   ├── change-visible-hours-input.tsx
│   ├── change-working-hours-input.tsx
│   └── client-container.tsx  # Main container component
├── contexts/
│   └── calendar-context.tsx  # Calendar state management
├── hooks/
│   └── use-update-event.ts   # Event update hook
├── helpers.ts                # Utility functions
├── interfaces.ts             # TypeScript interfaces
├── mocks.ts                  # Mock data
├── requests.ts               # API requests
├── schemas.ts                # Zod schemas
└── types.ts                  # TypeScript types
```

## Credits

This calendar implementation is based on [lramos33/big-calendar](https://github.com/lramos33/big-calendar) by Leonardo Ramos.
