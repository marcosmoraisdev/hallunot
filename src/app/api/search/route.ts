import { NextResponse } from "next/server"
import { searchLibraries } from "@/infrastructure/adapters/libraries-io"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const q = searchParams.get("q")?.trim()
    const platforms = searchParams.get("platforms") ?? undefined
    const page = parseInt(searchParams.get("page") ?? "0")
    const perPage = parseInt(searchParams.get("per_page") ?? "9")
    const sort = searchParams.get("sort") ?? "stars"

    if (!q) {
      return NextResponse.json(
        { error: "q is required and must be non-empty" },
        { status: 400 }
      )
    }

    if (page < 0 || !Number.isInteger(page)) {
      return NextResponse.json(
        { error: "page must be a non-negative integer" },
        { status: 400 }
      )
    }

    if (perPage < 1 || perPage > 100 || !Number.isInteger(perPage)) {
      return NextResponse.json(
        { error: "per_page must be an integer between 1 and 100" },
        { status: 400 }
      )
    }

    const results = await searchLibraries({
      q,
      platforms,
      page,
      per_page: perPage,
      sort,
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
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to search libraries:", error)
    return NextResponse.json(
      { error: "Failed to search libraries" },
      { status: 500 }
    )
  }
}
