// src/app/api/llms/route.ts
import { NextResponse } from "next/server"
import { fetchAllProviders } from "@/infrastructure/adapters/models-dev"
import { filterAndPaginateLlms } from "@/domain/services/llm-service"
import { logger } from "@/lib/logger"

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20
const MAX_PER_PAGE = 100

export async function GET(request: Request) {
  const log = logger.child({ route: "/api/llms" })
  log.info("incoming request")

  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const provider = searchParams.get("provider") ?? undefined
    const search = searchParams.get("q") ?? undefined
    const page = Math.max(1, parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10))
    const perPage = Math.min(
      MAX_PER_PAGE,
      Math.max(1, parseInt(searchParams.get("per_page") ?? String(DEFAULT_PER_PAGE), 10))
    )

    log.info({ provider, search, page, perPage }, "parsed query params")

    // Fetch all providers from external API
    const providers = await fetchAllProviders()

    // Filter and paginate using domain service
    const result = filterAndPaginateLlms(
      providers,
      { provider, search },
      { page, perPage }
    )

    log.info(
      { modelCount: result.models.length, total: result.pagination.total, page },
      "returning LLMs"
    )

    return NextResponse.json(result)
  } catch (err) {
    log.error({ err }, "failed to get LLMs")
    return NextResponse.json(
      { error: "Failed to fetch LLMs" },
      { status: 500 }
    )
  }
}
