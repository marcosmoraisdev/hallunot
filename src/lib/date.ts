export function msToMonths(ms: number): number {
  return ms / (30 * 24 * 60 * 60 * 1000)
}

/**
 * Converts a date string to Unix milliseconds.
 * Supports formats: "YYYY-MM" and "YYYY-MM-DD"
 * Returns the timestamp at midnight UTC.
 * Returns undefined if the input is invalid or undefined.
 */
export function knowledgeCutoffToMs(cutoff: string | undefined): number | undefined {
  if (!cutoff) return undefined

  // Try YYYY-MM format
  const monthMatch = cutoff.match(/^(\d{4})-(\d{2})$/)
  if (monthMatch) {
    const year = parseInt(monthMatch[1], 10)
    const month = parseInt(monthMatch[2], 10) - 1 // JS months are 0-indexed
    return Date.UTC(year, month, 1)
  }

  // Try YYYY-MM-DD format
  const dateMatch = cutoff.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10)
    const month = parseInt(dateMatch[2], 10) - 1 // JS months are 0-indexed
    const day = parseInt(dateMatch[3], 10)
    return Date.UTC(year, month, day)
  }

  return undefined
}

export function formatDate(unixMs: number): string {
  return new Date(unixMs).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
