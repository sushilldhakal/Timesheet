import { createPayRunWorker } from "@/lib/jobs/workers/payrun-worker"

// Standalone worker entrypoint.
// Run via: `npm run worker:payrun`
createPayRunWorker()

