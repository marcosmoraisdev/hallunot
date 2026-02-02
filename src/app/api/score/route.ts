import { NextResponse } from "next/server"
import { fetchAllProviders } from "@/infrastructure/adapters/models-dev"
import { findModelById } from "@/domain/services/llm-service"
import { fetchProjectVersions } from "@/infrastructure/adapters/libraries-io"
import { computeScore } from "@/domain/services/scoring"
import { detectBreakingChanges } from "@/domain/services/breaking-changes"
import { groupVersionsIntoBuckets } from "@/domain/services/version-buckets"
import { logger } from "@/lib/logger"
import { knowledgeCutoffToMs } from "@/lib/date"

export async function GET(request: Request) {
  const reqStart = Date.now()
  const { searchParams } = new URL(request.url)

  const modelId = searchParams.get("llm")?.trim()
  const libraryName = searchParams.get("library")?.trim()
  const platform = searchParams.get("platform")?.trim() || "NPM"

  const log = logger.child({ route: "/api/score", llm: modelId, library: libraryName, platform })

  log.info("incoming request")

  if (!modelId) {
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
    // Fetch all providers from models.dev API
    const providers = await fetchAllProviders()

    // Find the model by ID
    const model = findModelById(providers, modelId)

    if (!model) {
      log.warn("LLM model not found")
      return NextResponse.json({ error: "LLM not found" }, { status: 404 })
    }

    // Convert knowledge cutoff from "YYYY-MM" to Unix ms
    const cutoffMs = knowledgeCutoffToMs(model.knowledgeCutoff)

    if (!cutoffMs) {
      log.warn("LLM model has no knowledge cutoff date")
      return NextResponse.json(
        { error: "Selected LLM model does not have a knowledge cutoff date" },
        { status: 400 }
      )
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
          llm: model.name,
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
        { approxCutoff: cutoffMs }
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
        llm: model.name,
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
