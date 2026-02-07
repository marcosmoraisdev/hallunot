// src/app/api/llms/route.ts
import { NextResponse } from "next/server"
import { fetchAllProviders } from "@/infrastructure/adapters/models-dev"
import { filterAndPaginateLlms } from "@/domain/services/llm-service"
import { llmsSchema, parseSearchParams } from "@/lib/validation"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  const log = logger.child({ route: "/api/llms" })

  try {
    const { searchParams } = new URL(request.url)
    const parsed = parseSearchParams(llmsSchema, searchParams)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { provider, q: search, page, per_page: perPage } = parsed.data

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
