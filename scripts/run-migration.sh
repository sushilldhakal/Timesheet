#!/bin/bash

# Timesheet Daily Shift Migration Runner
# This script runs the complete migration process with verification

set -e  # Exit on error

echo "=================================================="
echo "  Timesheet Daily Shift Migration"
echo "=================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env with MONGODB_URI"
    exit 1
fi

# Step 1: Run migration
echo "📦 Step 1: Running migration..."
echo "This will consolidate timesheet events into daily shifts"
echo ""
npx ts-node scripts/migrate-to-daily-shifts.ts

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Migration failed! Please check the errors above."
    exit 1
fi

echo ""
echo "=================================================="
echo ""

# Step 2: Run verification
echo "🔍 Step 2: Running verification..."
echo "This will compare old and new data for accuracy"
echo ""
npx ts-node scripts/verify-migration.ts

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Verification found issues!"
    echo "You can rollback using: npm run rollback-migration"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Migration completed successfully!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Test the application thoroughly"
echo "2. Monitor for any issues"
echo "3. If issues found, run: npm run rollback-migration"
echo ""
