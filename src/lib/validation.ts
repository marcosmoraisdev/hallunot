import { z } from "zod"

const positiveInt = z.coerce.number().int().min(1).default(1)

export const searchSchema = z.object({
  q: z.string().trim().min(1, "q is required and must be non-empty").max(200),
  platforms: z.string().trim().max(50).optional(),
  page: positiveInt,
  per_page: z.coerce.number().int().min(1).max(100).default(9),
  sort: z.string().trim().max(50).optional(),
})

export const llmsSchema = z.object({
  provider: z.string().trim().max(100).optional(),
  q: z.string().trim().max(200).optional(),
  page: positiveInt,
  per_page: z.coerce.number().int().min(1).max(100).default(20),
})

export const scoreSchema = z.object({
  llm: z.string().trim().min(1, "llm query parameter is required").max(200),
  library: z.string().trim().min(1, "library query parameter is required").max(200),
  platform: z.string().trim().max(50).default("NPM"),
})

export function parseSearchParams<T extends z.ZodTypeAny>(
  schema: T,
  searchParams: URLSearchParams
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const raw: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    raw[key] = value
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    return { success: false, error: firstIssue?.message ?? "Invalid input" }
  }
  return { success: true, data: result.data }
}
