import type { Llm } from "@/domain/models"
import llmsData from "./llms.json"

// Type assertion since JSON import doesn't have type info
const llms: Llm[] = llmsData as Llm[]

export function getAllLlms(): Llm[] {
  return llms
}

export function findLlmByName(name: string): Llm | undefined {
  return llms.find((llm) => llm.name.toLowerCase() === name.toLowerCase())
}

export function findLlmById(id: string): Llm | undefined {
  return llms.find((llm) => llm.id === id)
}
