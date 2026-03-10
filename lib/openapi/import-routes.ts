import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Don't set env vars here - they're set in generate.ts now

function findRouteFiles(dir: string, routeFiles: string[] = []): string[] {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          findRouteFiles(fullPath, routeFiles);
        } else if (entry === 'route.ts' || entry === 'route.tsx') {
          routeFiles.push(fullPath);
        }
      } catch (err) {
        continue;
      }
    }
  } catch (err) {
    // Skip directories we can't access
  }
  
  return routeFiles;
}

// Find all route files in app/api
const apiDir = join(process.cwd(), 'app', 'api');
const routeFiles = findRouteFiles(apiDir);

console.log(`📂 Found ${routeFiles.length} route files`);

// Import all route files to trigger createApiRoute registration
let importedCount = 0;
let failedCount = 0;

for (const routeFile of routeFiles) {
  try {
    require(routeFile);
    importedCount++;
  } catch (error) {
    failedCount++;
    if (process.env.DEBUG === 'true') {
      console.warn(`⚠️  Failed to import ${routeFile}:`, error instanceof Error ? error.message : error);
    }
  }
}

console.log(`✅ Imported ${importedCount}/${routeFiles.length} route files`);
if (failedCount > 0) {
  console.log(`⚠️  ${failedCount} files failed to import (set DEBUG=true to see errors)`);
}