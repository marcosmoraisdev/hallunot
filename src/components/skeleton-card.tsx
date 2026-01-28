import { cn } from "@/lib/cn"

interface SkeletonCardProps {
  count?: number
  className?: string
}

export function SkeletonCard({ count = 6, className }: SkeletonCardProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl bg-muted"
        />
      ))}
    </div>
  )
}
