import { NextResponse } from "next/server"
import { fetchPlatforms } from "@/infrastructure/adapters/libraries-io"

export async function GET() {
  try {
    const platforms = await fetchPlatforms()

    const data = platforms.map((p) => ({
      name: p.name,
      projectCount: p.project_count,
      color: p.color,
      defaultLanguage: p.default_language,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to fetch platforms:", error)
    return NextResponse.json(
      { error: "Failed to fetch platforms" },
      { status: 500 }
    )
  }
}
