import { NextResponse } from "next/server"
import { findLlmByName } from "@/data/llms"
import { fetchProjectVersions } from "@/infrastructure/adapters/libraries-io"
import { computeScore } from "@/domain/services/scoring"
import { detectBreakingChanges } from "@/domain/services/breaking-changes"
import { groupVersionsIntoBuckets } from "@/domain/services/version-buckets"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  const reqStart = Date.now()
  const { searchParams } = new URL(request.url)

  const llmName = searchParams.get("llm")?.trim()
  const libraryName = searchParams.get("library")?.trim()
  const platform = searchParams.get("platform")?.trim() || "NPM"

  const log = logger.child({ route: "/api/score", llm: llmName, library: libraryName, platform })

  log.info("incoming request")

  if (!llmName) {
    return NextResponse.json(
      { error: "llm query parameter is required" },
      { status: 400 }
    )
  }

  if (!libraryName) {
    return NextResponse.json(
      { error: "library query parameter is required" },
      { status: 400 }
    )
  }

  try {
    // Find LLM (case-insensitive)
    const llm = findLlmByName(llmName)

    if (!llm) {
      log.warn("LLM not found")
      return NextResponse.json({ error: "LLM not found" }, { status: 404 })
    }

    // Fetch versions from Libraries.io
    let rawVersions
    const fetchStart = Date.now()
    try {
      rawVersions = await fetchProjectVersions(platform, libraryName)
      log.info(
        { fetchDurationMs: Date.now() - fetchStart, versionCount: rawVersions.length },
        "fetched versions from Libraries.io"
      )
    } catch (err) {
      log.error({ err, fetchDurationMs: Date.now() - fetchStart }, "failed to fetch versions from Libraries.io")
      return NextResponse.json(
        { error: "Failed to fetch library versions from external source" },
        { status: 502 }
      )
    }

    if (rawVersions.length === 0) {
      return NextResponse.json({
        data: {
          llm: llm.name,
          library: libraryName,
          platform,
          buckets: [],
        },
      })
    }

    // Detect breaking changes
    const versionsWithBreaking = detectBreakingChanges(
      rawVersions.map((v) => ({
        version: v.number,
        publishedAt: v.published_at,
      }))
    )

    // Score each version
    const scoredVersions = versionsWithBreaking.map((v) => {
      const releaseDate = new Date(v.publishedAt).getTime()
      const { score, risk, reason } = computeScore(
        { releaseDate, breaking: v.breaking },
        { approxCutoff: llm.approxCutoff }
      )
      return {
        version: v.version,
        releaseDate,
        breaking: v.breaking,
        score,
        risk,
        reason,
      }
    })

    // Group into buckets
    const buckets = groupVersionsIntoBuckets(scoredVersions)

    log.info(
      { totalDurationMs: Date.now() - reqStart, bucketCount: buckets.length, versionCount: scoredVersions.length },
      "scoring complete"
    )

    return NextResponse.json({
      data: {
        llm: llm.name,
        library: libraryName,
        platform,
        buckets,
      },
    })
  } catch (err) {
    log.error({ err, totalDurationMs: Date.now() - reqStart }, "unexpected error computing scores")
    return NextResponse.json(
      { error: "Failed to compute scores" },
      { status: 500 }
    )
  }
}
