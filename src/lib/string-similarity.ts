function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)

  for (let i = 1; i <= m; i++) {
    let prev = i - 1
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[n]
}

export function nameSimilarity(name: string, query: string): number {
  const a = name.toLowerCase()
  const b = query.toLowerCase()

  if (a === b) return 1.0
  if (a.startsWith(b)) return 0.9
  if (a.includes(b)) return 0.8

  const dist = levenshtein(a, b)
  return Math.max(0, 1 - dist / Math.max(a.length, b.length))
}
