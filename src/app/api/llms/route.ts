import { NextResponse } from "next/server"
import { findAllLlms } from "@/infrastructure/repositories/llm-repository"

export async function GET() {
  try {
    const llms = await findAllLlms()
    return NextResponse.json({ data: llms })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch LLMs" },
      { status: 500 }
    )
  }
}
