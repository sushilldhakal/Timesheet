#!/bin/bash
# Script to update all imports from old packages structure to new flat structure

cd "$(dirname "$0")/components/scheduling"

# Update imports in all TypeScript/TSX files
find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/packages/*" ! -path "*/day-view-panel/*" -exec sed -i '' \
  -e "s|from '@shadcn-scheduler/core'|from '@/components/scheduling/core/types-scheduler'|g" \
  -e "s|from \"@shadcn-scheduler/core\"|from \"@/components/scheduling/core/types-scheduler\"|g" \
  -e "s|from '@shadcn-scheduler/grid-engine'|from '@/components/scheduling/grid'|g" \
  -e "s|from \"@shadcn-scheduler/grid-engine\"|from \"@/components/scheduling/grid\"|g" \
  -e "s|from '@shadcn-scheduler/shell'|from '@/components/scheduling/shell'|g" \
  -e "s|from \"@shadcn-scheduler/shell\"|from \"@/components/scheduling/shell\"|g" \
  -e "s|from './hooks/useScrollToNow'|from '@/components/scheduling/hooks/useScrollToNow'|g" \
  -e "s|from './hooks/useMediaQuery'|from '@/components/scheduling/hooks/useMediaQuery'|g" \
  -e "s|from './hooks/useFlatRows'|from '@/components/scheduling/hooks/useFlatRows'|g" \
  -e "s|from './hooks/useDragEngine'|from '@/components/scheduling/hooks/useDragEngine'|g" \
  -e "s|from './hooks/useLongPress'|from '@/components/scheduling/hooks/useLongPress'|g" \
  -e "s|from './hooks/useAuditTrail'|from '@/components/scheduling/hooks/useAuditTrail'|g" \
  -e "s|from \"./hooks/useScrollToNow\"|from \"@/components/scheduling/hooks/useScrollToNow\"|g" \
  -e "s|from \"./hooks/useMediaQuery\"|from \"@/components/scheduling/hooks/useMediaQuery\"|g" \
  -e "s|from \"./hooks/useFlatRows\"|from \"@/components/scheduling/hooks/useFlatRows\"|g" \
  -e "s|from \"./hooks/useDragEngine\"|from \"@/components/scheduling/hooks/useDragEngine\"|g" \
  -e "s|from \"./hooks/useLongPress\"|from \"@/components/scheduling/hooks/useLongPress\"|g" \
  -e "s|from \"./hooks/useAuditTrail\"|from \"@/components/scheduling/hooks/useAuditTrail\"|g" \
  -e "s|from './modals/|from '@/components/scheduling/modals/|g" \
  -e "s|from \"./modals/|from \"@/components/scheduling/modals/|g" \
  -e "s|from './ui/|from '@/components/scheduling/ui/|g" \
  -e "s|from \"./ui/|from \"@/components/scheduling/ui/|g" \
  -e "s|from './components/DateNavigator'|from '@/components/scheduling/DateNavigator'|g" \
  -e "s|from './components/ViewTabs'|from '@/components/scheduling/ViewTabs'|g" \
  -e "s|from './components/ResourceHistogram'|from '@/components/scheduling/ResourceHistogram'|g" \
  -e "s|from './components/views/DayWeekViews'|from '@/components/scheduling/views/DayWeekViews'|g" \
  -e "s|from './components/views/MonthView'|from '@/components/scheduling/views/MonthView'|g" \
  -e "s|from './components/views/YearView'|from '@/components/scheduling/views/YearView'|g" \
  -e "s|from './components/views/ListView'|from '@/components/scheduling/views/ListView'|g" \
  -e "s|from './components/views/TimelineView'|from '@/components/scheduling/views/TimelineView'|g" \
  {} \;

echo "Import updates complete!"
