import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"

// Serve the generated OpenAPI spec from public/openapi.json
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "openapi.json")
    const file = await readFile(filePath, "utf8")
    const json = JSON.parse(file)
    return NextResponse.json(json, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json(
      {
        error:
          "OpenAPI specification not found. Run `npm run generate:openapi` to create `public/openapi.json`.",
      },
      { status: 404 }
    )
  }
}