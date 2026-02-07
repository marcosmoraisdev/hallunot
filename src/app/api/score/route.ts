import { NextResponse } from "next/server"
import { fetchAllProviders } from "@/infrastructure/adapters/models-dev"
import { findModelById } from "@/domain/services/llm-service"
import { fetchProject } from "@/infrastructure/adapters/libraries-io"
import { LCSCalculator } from "@/domain/services/lcs"
import { calculateLGS } from "@/domain/services/lgs"
import type { LGSContext } from "@/domain/services/lgs/types"
import { calculateFinalScores } from "@/domain/services/final-score"
import { mapToLibraryMetadata, mapToVersionMetadata } from "@/infrastructure/mappers/library-metadata-mapper"
import { logger } from "@/lib/logger"
import { knowledgeCutoffToMs } from "@/lib/date"
import type { ScoreResponse, VersionScore, LCSOutput, LibraryMetadataResponse, LLMMetadataResponse } from "@/domain/services/lcs/types"

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

    // Extract provider info for LGS context
    const providerIdFromModel = modelId.split('/')[0]
    const provider = providers.find((p) => p.id === providerIdFromModel)

    // Convert knowledge cutoff from "YYYY-MM" to Unix ms
    const cutoffMs = knowledgeCutoffToMs(model.knowledgeCutoff)

    if (!cutoffMs) {
      log.warn("LLM model has no knowledge cutoff date")
      return NextResponse.json(
        { error: "Selected LLM model does not have a knowledge cutoff date" },
        { status: 400 }
      )
    }

    // Build LLM metadata for response early so both paths can use it
    const modalities = model.modalities ?? { input: ['text'], output: ['text'] }
    const llmMeta: LLMMetadataResponse = {
      name: model.name,
      knowledgeCutoff: model.knowledgeCutoff ?? '',
      contextLimit: model.limit?.context ?? 0,
      outputLimit: model.limit?.output ?? 0,
      capabilities: {
        reasoning: model.reasoning ?? false,
        toolCall: model.toolCall ?? false,
        structuredOutput: model.structuredOutput ?? false,
        attachment: model.attachment ?? false,
        multimodalInput: modalities.input.length > 1,
        multimodalOutput: modalities.output.length > 1,
      },
    }

    // Fetch project from Libraries.io
    let project
    const fetchStart = Date.now()
    try {
      project = await fetchProject(platform, libraryName)
      log.info(
        { fetchDurationMs: Date.now() - fetchStart, versionCount: project.versions?.length ?? 0 },
        "fetched project from Libraries.io"
      )
    } catch (err) {
      log.error({ err, fetchDurationMs: Date.now() - fetchStart }, "failed to fetch project from Libraries.io")
      return NextResponse.json(
        { error: "Failed to fetch library from external source" },
        { status: 502 }
      )
    }

    // Map to domain types
    const libraryMetadata = mapToLibraryMetadata(project)
    const versions = mapToVersionMetadata(project.versions ?? [])

    // Build library metadata for response
    const libraryMeta: LibraryMetadataResponse = {
      language: libraryMetadata.language,
      stars: libraryMetadata.stars,
      dependentsCount: libraryMetadata.dependentsCount,
      releaseCount: libraryMetadata.releaseCount,
      ageInYears: Math.round(libraryMetadata.ageInYears * 10) / 10,
      keywords: libraryMetadata.keywords,
    }

    if (versions.length === 0) {
      const emptyResponse: ScoreResponse = {
        library: libraryName,
        platform,
        llm: model.name,
        libraryMetadata: libraryMeta,
        llmMetadata: llmMeta,
        LCS: {
          libraryScore: {
            stability: { value: 0, weight: 0.30, contribution: 0 },
            simplicity: { value: 0, weight: 0.15, contribution: 0 },
            popularity: { value: 0, weight: 0.20, contribution: 0 },
            language: { value: 0, weight: 0.10, contribution: 0 },
          },
          versions: [],
        },
        LGS: { score: 0, breakdown: null },
        FS: { versions: [], formula: "LCS × LGS" },
      }
      return NextResponse.json(emptyResponse)
    }

    // Calculate LCS
    const calculator = new LCSCalculator()
    const llmMetadata = {
      id: modelId,
      name: model.name,
      cutoffDate: new Date(cutoffMs),
    }

    const lcsResults = calculator.calculateForLibrary(libraryMetadata, versions, llmMetadata)

    // Build LCS output
    const libraryScore = lcsResults[0]?.libraryBreakdown ?? {
      stability: { value: 0, weight: 0.30, contribution: 0 },
      simplicity: { value: 0, weight: 0.15, contribution: 0 },
      popularity: { value: 0, weight: 0.20, contribution: 0 },
      language: { value: 0, weight: 0.10, contribution: 0 },
    }

    const versionScores: VersionScore[] = lcsResults.map((r) => ({
      version: r.version,
      releaseDate: r.releaseDate,
      recency: r.recencyBreakdown,
      score: r.score,
    }))

    const lcsOutput: LCSOutput = {
      libraryScore,
      versions: versionScores,
    }

    // Calculate LGS
    const lgsContext: LGSContext = {
      model: {
        reasoning: model.reasoning ?? false,
        toolCall: model.toolCall ?? false,
        structuredOutput: model.structuredOutput ?? false,
        attachment: model.attachment ?? false,
        modalities,
        contextLimit: model.limit?.context ?? 0,
        outputLimit: model.limit?.output ?? 0,
        knowledgeCutoff: cutoffMs ? new Date(cutoffMs) : undefined,
        lastUpdated: model.lastUpdated ? new Date(model.lastUpdated) : undefined,
        openWeights: model.openWeights ?? false,
        apiCompatibility: provider?.npm ?? '',
      },
    }
    const lgsOutput = calculateLGS(lgsContext)

    // Calculate Final Scores
    const fsOutput = calculateFinalScores(versionScores, lgsOutput.score)

    const response: ScoreResponse = {
      library: libraryName,
      platform,
      llm: model.name,
      libraryMetadata: libraryMeta,
      llmMetadata: llmMeta,
      LCS: lcsOutput,
      LGS: lgsOutput,
      FS: fsOutput,
    }

    log.info(
      { totalDurationMs: Date.now() - reqStart, versionCount: versions.length },
      "scoring complete"
    )

    return NextResponse.json(response)
  } catch (err) {
    log.error({ err, totalDurationMs: Date.now() - reqStart }, "unexpected error computing scores")
    return NextResponse.json(
      { error: "Failed to compute scores" },
      { status: 500 }
    )
  }
}
