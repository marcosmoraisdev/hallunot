import { NextResponse } from "next/server"
import { findAllLlms } from "@/infrastructure/repositories/llm-repository"
import { findVersionsByLibraryId } from "@/infrastructure/repositories/version-repository"
import { findLibraryById } from "@/infrastructure/repositories/library-repository"
import { computeScore } from "@/domain/services/scoring"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const llmId = searchParams.get("llm_id")
    const libraryId = searchParams.get("library_id")
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")

    if (!llmId || !libraryId) {
      return NextResponse.json(
        { error: "llm_id and library_id are required" },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(llmId)) {
      return NextResponse.json(
        { error: "llm_id must be a valid UUID" },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(libraryId)) {
      return NextResponse.json(
        { error: "library_id must be a valid UUID" },
        { status: 400 }
      )
    }

    if (page < 1 || !Number.isInteger(page)) {
      return NextResponse.json(
        { error: "page must be a positive integer" },
        { status: 400 }
      )
    }

    if (limit < 1 || limit > 100 || !Number.isInteger(limit)) {
      return NextResponse.json(
        { error: "limit must be an integer between 1 and 100" },
        { status: 400 }
      )
    }

    const allLlms = await findAllLlms()
    const llm = allLlms.find((l) => l.id === llmId)
    if (!llm) {
      return NextResponse.json({ error: "LLM not found" }, { status: 404 })
    }

    const library = await findLibraryById(libraryId)
    if (!library) {
      return NextResponse.json(
        { error: "Library not found" },
        { status: 404 }
      )
    }

    const { data: versions, total } = await findVersionsByLibraryId(
      libraryId,
      page,
      limit
    )

    const compatibilityData = versions.map((version) => {
      const { score, risk, reason } = computeScore(
        { releaseDate: version.releaseDate, breaking: version.breaking },
        { approxCutoff: llm.approxCutoff }
      )
      return {
        llmId: llm.id,
        libraryId: library.id,
        version: version.version,
        score,
        risk,
        reason,
      }
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: compatibilityData,
      pagination: { page, limit, total, totalPages },
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to compute compatibility" },
      { status: 500 }
    )
  }
}
