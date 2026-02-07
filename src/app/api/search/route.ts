import { NextResponse } from "next/server"
import { searchLibraries } from "@/infrastructure/adapters/libraries-io"
import { searchSchema, parseSearchParams } from "@/lib/validation"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  const log = logger.child({ route: "/api/search" })

  const { searchParams } = new URL(request.url)
  const parsed = parseSearchParams(searchSchema, searchParams)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { q, platforms, page, per_page, sort } = parsed.data

  try {
    const results = await searchLibraries({
      q,
      platforms,
      page,
      per_page,
      sort
    })

    const data = results.map((r) => ({
      name: r.name,
      platform: r.platform,
      description: r.description,
      latestVersion:
        r.latest_stable_release_number ?? r.latest_release_number,
      latestReleaseAt: r.latest_stable_release_published_at,
      stars: r.stars,
      language: r.language,
      rank: r.rank,
      versions: r.versions ?? [],
    }))

    return NextResponse.json({ data })
  } catch (error) {
    log.error({ err: error }, "Failed to search libraries")
    return NextResponse.json(
      { error: "Failed to search libraries" },
      { status: 500 }
    )
  }
}
