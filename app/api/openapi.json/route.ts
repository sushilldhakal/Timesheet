import { NextResponse } from "next/server"
import { openApiService } from "@/lib/services/openapi/openapi-service"

// Serve the generated OpenAPI spec from public/openapi.json
export async function GET() {
  try {
    const json = await openApiService.readSpecFromPublic()
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