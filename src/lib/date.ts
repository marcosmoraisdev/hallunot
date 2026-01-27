export function msToMonths(ms: number): number {
  return ms / (30 * 24 * 60 * 60 * 1000)
}

export function formatDate(unixMs: number): string {
  return new Date(unixMs).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
