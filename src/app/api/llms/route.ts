// src/app/api/llms/route.ts
import { NextResponse } from "next/server"
import { getAllLlms } from "@/data/llms"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  const log = logger.child({ route: "/api/llms" })
  log.info("incoming request")

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase().trim()
    const page = parseInt(searchParams.get("page") ?? "1")
    const perPage = parseInt(searchParams.get("per_page") ?? "9")

    let llms = getAllLlms()

    // Filter by search term if provided
    if (search) {
      llms = llms.filter(
        (llm) =>
          llm.name.toLowerCase().includes(search) ||
          llm.provider.toLowerCase().includes(search)
      )
    }

    const total = llms.length
    const totalPages = Math.ceil(total / perPage)
    const start = (page - 1) * perPage
    const paginatedLlms = llms.slice(start, start + perPage)

    log.info({ count: paginatedLlms.length, page, totalPages }, "returning LLMs")

    return NextResponse.json({
      data: paginatedLlms,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
      },
    })
  } catch (err) {
    log.error({ err }, "failed to get LLMs")
    return NextResponse.json(
      { error: "Failed to fetch LLMs" },
      { status: 500 }
    )
  }
}
