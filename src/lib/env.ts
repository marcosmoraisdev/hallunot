import { z } from "zod"

const envSchema = z.object({
  LIBRARIES_IO_API_KEY: z.string().min(1, "LIBRARIES_IO_API_KEY is required"),
  NEXT_PUBLIC_STRIPE_DONATE_URL: z.string().url().optional(),
})

export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n")
    throw new Error(`Missing or invalid environment variables:\n${issues}`)
  }
  return result.data
}

export type Env = z.infer<typeof envSchema>
