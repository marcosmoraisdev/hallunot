import { NextResponse } from "next/server"
import { findLibraries } from "@/infrastructure/repositories/library-repository"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")

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

    const { data, total } = await findLibraries(page, limit)
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages },
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch libraries" },
      { status: 500 }
    )
  }
}
