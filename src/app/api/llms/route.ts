// src/app/api/llms/route.ts
import { NextResponse } from "next/server"
import { getAllLlms } from "@/data/llms"
import { logger } from "@/lib/logger"

export async function GET() {
  const log = logger.child({ route: "/api/llms" })
  log.info("incoming request")

  try {
    const llms = getAllLlms()
    log.info({ count: llms.length }, "returning LLMs")
    return NextResponse.json({ data: llms })
  } catch (err) {
    log.error({ err }, "failed to get LLMs")
    return NextResponse.json(
      { error: "Failed to fetch LLMs" },
      { status: 500 }
    )
  }
}
