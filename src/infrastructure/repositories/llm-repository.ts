import prisma from "../db/prisma"
import type { Llm } from "../../domain/models"

export async function findAllLlms(): Promise<Llm[]> {
  const llms = await prisma.llm.findMany({
    orderBy: { name: "asc" },
  })
  return llms.map((llm) => ({
    id: llm.id,
    name: llm.name,
    provider: llm.provider,
    approxCutoff: Number(llm.approxCutoff),
  }))
}
