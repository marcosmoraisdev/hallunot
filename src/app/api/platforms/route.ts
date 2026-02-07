import { NextResponse } from "next/server"
import { fetchPlatforms } from "@/infrastructure/adapters/libraries-io"
import { logger } from "@/lib/logger"

export async function GET() {
  const log = logger.child({ route: "/api/platforms" })

  try {
    const platforms = await fetchPlatforms()

    const data = platforms.map((p) => ({
      name: p.name,
      projectCount: p.project_count,
      color: p.color,
      defaultLanguage: p.default_language,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    log.error({ err: error }, "Failed to fetch platforms")
    return NextResponse.json(
      { error: "Failed to fetch platforms" },
      { status: 500 }
    )
  }
}
